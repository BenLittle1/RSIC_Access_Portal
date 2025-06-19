import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

interface Profile {
  id: string
  user_id: string
  full_name: string
  username: string
  email?: string
  organization: string
  authentication_status: string
  created_at: string
}

const PendingApprovalPage = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      navigate('/')
      return
    }

    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      navigate('/')
      return
    }

    // If user is approved, redirect to dashboard
    if (profileData.authentication_status === 'Approved') {
      navigate('/dashboard')
      return
    }

    setProfile(profileData)
    setLoading(false)
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    } else {
      navigate('/')
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'Pending':
        return {
          title: 'Account Pending Approval',
          message: 'Your account is currently pending approval from the Security team. You will receive access once your account has been reviewed and approved.',
          color: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        }
      case 'Denied':
        return {
          title: 'Account Access Denied',
          message: 'Your account access has been denied. Please contact the Security team if you believe this is an error.',
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      default:
        return {
          title: 'Account Under Review',
          message: 'Your account is currently under review. Please wait for further instructions.',
          color: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
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

  const statusInfo = getStatusMessage(profile.authentication_status)

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black bg-white px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-black">SRIC Access Portal</h1>
          <div className="flex items-center space-x-4">
            <span className="text-black font-bold">
              {profile.organization}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="max-w-2xl w-full">
          {/* Status Card */}
          <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2 rounded-lg p-8 text-center`}>
            <div className="mb-6">
              {profile.authentication_status === 'Pending' ? (
                <div className="w-16 h-16 mx-auto mb-4 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              ) : profile.authentication_status === 'Denied' ? (
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-100 rounded-full">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              
              <h2 className={`text-3xl font-bold ${statusInfo.color} mb-2`}>
                {statusInfo.title}
              </h2>
              
              <p className={`text-lg ${statusInfo.color}`}>
                {statusInfo.message}
              </p>
            </div>

            {/* Account Details */}
            <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-black mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-gray-600 text-sm">Full Name:</span>
                  <div className="font-medium text-black">{profile.full_name}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Username:</span>
                  <div className="font-medium text-black">{profile.username}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Email:</span>
                  <div className="font-medium text-black">{profile.email || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Organization:</span>
                  <div className="font-medium text-black">{profile.organization}</div>
                </div>
                <div>
                  <span className="text-gray-600 text-sm">Status:</span>
                  <div className={`font-medium ${statusInfo.color}`}>
                    {profile.authentication_status}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-600 text-sm">Account Created:</span>
                  <div className="font-medium text-black">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                {profile.authentication_status === 'Pending' 
                  ? "Please check back later or contact your administrator for updates on your approval status."
                  : profile.authentication_status === 'Denied'
                  ? "If you believe this is an error, please contact the Security team for assistance."
                  : "Please wait for further instructions regarding your account status."
                }
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Refresh Status
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-6 py-2 bg-gray-200 text-black hover:bg-gray-300 transition-colors border border-black"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingApprovalPage 