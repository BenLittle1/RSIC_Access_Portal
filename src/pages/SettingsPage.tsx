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
}

const SettingsPage = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      navigate('/')
      return
    }

    // Fetch user profile
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      navigate('/dashboard')
    } else {
      setProfile(profileData)
    }
    
    setLoading(false)
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
          <h1 className="text-3xl font-bold text-black">Settings</h1>
          <div className="flex items-center space-x-4">
            <span className="text-black font-bold">
              {profile.organization}
            </span>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {isSecurityUser ? (
          // Security User Options
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-black mb-6">Security Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => navigate('/settings/profile')}
                className="p-6 border-2 border-black bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <h3 className="text-xl font-bold text-black mb-3">Profile Settings</h3>
                <p className="text-gray-600">
                  Update your personal information, password, and account preferences.
                </p>
              </div>
              
              <div 
                onClick={() => navigate('/settings/authentication')}
                className="p-6 border-2 border-black bg-white hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <h3 className="text-xl font-bold text-black mb-3">User Authentication</h3>
                <p className="text-gray-600">
                  Manage user authentication status and approve pending accounts.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Organization User - Direct to Profile Settings
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-black mb-6">Profile Settings</h2>
            <div className="max-w-2xl">
              {/* Profile settings content will go here */}
              <div className="p-6 border border-black bg-gray-50">
                <p className="text-black">Profile settings functionality coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage 