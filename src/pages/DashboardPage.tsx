import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import GuestList from '../components/GuestList'
import CalendarView from '../components/CalendarView'
import AddGuestModal from '../components/AddGuestModal'
import DashboardMetrics from '../components/DashboardMetrics'
import { EMAIL_API_URL } from '../utils/constants'
import { notifyGuestArrival } from '../utils/api'

interface Profile {
  id: string
  user_id: string
  full_name: string
  username: string
  email?: string
  organization: string
  authentication_status: string
}

interface Guest {
  id: string
  name: string
  visit_date: string
  estimated_arrival: string
  arrival_status: boolean
  floor_access: string
  inviter_id: string
  organization: string
  requester_email?: string
  inviter_name?: string
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [guestsLoading, setGuestsLoading] = useState(false)
  const [showAddGuestModal, setShowAddGuestModal] = useState(false)
  const [showMetricsModal, setShowMetricsModal] = useState(false)
  const [profileCache, setProfileCache] = useState<Record<string, string>>({})

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (profile) {
      fetchGuests()
    }
  }, [selectedDate, profile])

  const checkUser = async () => {
    try {
      console.log('🔍 Getting user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ User auth error:', userError)
        navigate('/')
        return
      }
      
      if (!user) {
        console.log('ℹ️ No user found, redirecting to login')
        navigate('/')
        return
      }

      console.log('✅ User found:', user.id)

      // Fetch user profile
      console.log('🔍 Fetching profile...')
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('❌ Error fetching profile:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
      } else {
        console.log('✅ Profile fetched:', profileData)
        
        // Check if user is approved
        if (profileData.authentication_status !== 'Approved') {
          console.log('ℹ️ User not approved, redirecting to pending approval page')
          navigate('/pending-approval')
          return
        }
        
        setProfile(profileData)
      }
      
    } catch (err) {
      console.error('💥 Unexpected error in checkUser:', err)
    }
    
    setLoading(false)
  }

  const fetchGuests = async () => {
    if (!profile) return

    setGuestsLoading(true)
    const dateString = selectedDate.toISOString().split('T')[0]
    console.log('🔍 Fetching guests for date:', dateString)
    console.log('🔍 User profile organization:', profile.organization)
    
    try {
      // Query guests first, then get inviter names separately
      let query = supabase
        .from('guests')
        .select('*')
        .eq('visit_date', dateString)
      
      // Apply organization filtering in the application
      if (profile.organization !== 'Security') {
        // Non-security users can only see guests for their organization
        query = query.eq('organization', profile.organization)
      }
      // Security users see all guests (no additional filter)
      
      const { data, error } = await query.order('estimated_arrival')

      if (error) {
        console.error('❌ Error fetching guests:', error)
        setGuestsLoading(false)
        return
      }
      
      console.log('✅ Raw guest data:', data)
      
      // Use cached profile data for faster loading
      const transformedGuests = await Promise.all(
        (data || []).map(async (guest) => {
          let inviterName = profileCache[guest.inviter_id]
          
          if (!inviterName) {
            const { data: inviterProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', guest.inviter_id)
              .single()
            
            inviterName = inviterProfile?.full_name || 'Unknown'
            setProfileCache(prev => ({ ...prev, [guest.inviter_id]: inviterName }))
          }
          
          return {
            ...guest,
            inviter_name: inviterName
          }
        })
      )
      
      console.log('✅ Transformed guests:', transformedGuests)
      setGuests(transformedGuests)
    } catch (err) {
      console.error('💥 Unexpected error in fetchGuests:', err)
    }
    
    setGuestsLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const updateGuestArrivalStatus = async (guestId: string, arrivalStatus: boolean) => {
    // Optimistic update - Update UI immediately
    setGuests(prevGuests => prevGuests.map(guest => 
      guest.id === guestId 
        ? { ...guest, arrival_status: arrivalStatus }
        : guest
    ))

    // Background database update
    try {
      const { error } = await supabase
        .from('guests')
        .update({ arrival_status: arrivalStatus })
        .eq('id', guestId)

      if (error) {
        console.error('Error updating arrival status:', error)
        // Revert optimistic update on error
        setGuests(prevGuests => prevGuests.map(guest => 
          guest.id === guestId 
            ? { ...guest, arrival_status: !arrivalStatus }
            : guest
        ))
        return
      }

      // Send email notification when guest arrives (non-blocking)
      if (arrivalStatus) {
        // Use authenticated API utility for email notifications
        notifyGuestArrival(guestId, arrivalStatus).catch(emailError => {
          // Don't block UI for email errors, just log them
          console.error('❌ Email notification failed (non-blocking):', emailError)
        })
      }
    } catch (error) {
      console.error('❌ Unexpected error updating arrival status:', error)
      // Revert optimistic update
      setGuests(prevGuests => prevGuests.map(guest => 
        guest.id === guestId 
          ? { ...guest, arrival_status: !arrivalStatus }
          : guest
      ))
    }
  }

  const addGuest = async (guestData: Omit<Guest, 'id' | 'inviter_name'>) => {
    console.log('🔄 Adding guest:', guestData)
    
    // Application-level validation (no RLS)
    if (!profile) {
      console.error('❌ No profile found')
      return false
    }
    
    // Validate organization permissions
    if (profile.organization !== 'Security' && guestData.organization !== profile.organization) {
      console.error('❌ Permission denied: Cannot add guest to different organization')
      return false
    }
    
    const { data, error } = await supabase
      .from('guests')
      .insert([guestData])
      .select()

    if (error) {
      console.error('❌ Error adding guest:', error)
      return false
    } else {
      console.log('✅ Guest added successfully:', data)
      // Refresh the guest list
      await fetchGuests()
      return true
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-black">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-black">Error loading profile</div>
      </div>
    )
  }

  const isSecurityUser = profile.organization === 'Security'

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black bg-white px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-black">
            SRIC Access Portal — {isSecurityUser ? 'Security Dashboard' : `${profile.organization} Dashboard`}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-black font-bold">
              {profile.full_name}
            </span>
            <button
              onClick={() => {
                if (isSecurityUser) {
                  navigate('/settings')
                } else {
                  navigate('/settings/profile')
                }
              }}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Side - Guest List */}
        <div className="flex-grow border-r border-black">
          <GuestList
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            guests={guests}
            isSecurityUser={isSecurityUser}
            onShowAddGuest={() => setShowAddGuestModal(true)}
            onShowMetrics={() => setShowMetricsModal(true)}
            onUpdateArrivalStatus={updateGuestArrivalStatus}
            isLoading={guestsLoading}
          />
        </div>

        {/* Right Side - Calendar */}
        <div className="w-[350px] flex-shrink-0">
          <CalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      </div>

      {/* Add Guest Modal */}
      {showAddGuestModal && (
        <AddGuestModal
          selectedDate={selectedDate}
          userProfile={profile}
          isSecurityUser={isSecurityUser}
          onClose={() => setShowAddGuestModal(false)}
          onAddGuest={addGuest}
        />
      )}

      {/* Dashboard Metrics Modal */}
      <DashboardMetrics
        isSecurityUser={isSecurityUser}
        userOrganization={profile.organization}
        selectedDate={selectedDate}
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
      />
    </div>
  )
}

export default DashboardPage 