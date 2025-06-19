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

const ProfileSettingsPage = () => {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    username: ''
  })

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
      setFormData({
        full_name: profileData.full_name || '',
        username: profileData.username || ''
      })
    }
    
    setLoading(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (message) setMessage('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    if (!profile) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        username: formData.username
      })
      .eq('id', profile.id)

    if (error) {
      setMessage('Error updating profile: ' + error.message)
    } else {
      setMessage('Profile updated successfully!')
      setProfile({
        ...profile,
        full_name: formData.full_name,
        username: formData.username
      })
    }

    setSaving(false)
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
          <h1 className="text-3xl font-bold text-black">Profile Settings</h1>
          <div className="flex items-center space-x-4">
            <span className="text-black font-bold">
              {profile.full_name}
            </span>
            <button
              onClick={() => navigate(isSecurityUser ? '/settings' : '/dashboard')}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              {isSecurityUser ? 'Back to Settings' : 'Back to Dashboard'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-8">
        <h2 className="text-2xl font-bold text-black mb-6">Update Your Profile</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-bold text-black mb-1">
              Full Name *
            </label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full p-3 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-bold text-black mb-1">
              Username *
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className="w-full p-3 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
          </div>

          {/* Organization - Read Only */}
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              Organization
            </label>
            <div className="p-3 border border-gray-300 bg-gray-50">
              <span className="px-2 py-1 bg-gray-100 border border-gray-300 text-xs font-medium rounded">
                {profile.organization}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Organization cannot be changed. Contact an administrator if needed.
              </p>
            </div>
          </div>

          {/* Current Status Display */}
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              Authentication Status
            </label>
            <div className="p-3 border border-gray-300 bg-gray-50">
              <span className={`px-3 py-1 text-xs font-medium rounded ${
                profile.authentication_status === 'Approved' 
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : profile.authentication_status === 'Pending'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}>
                {profile.authentication_status}
              </span>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 border ${
              message.includes('Error') 
                ? 'border-red-500 bg-red-50 text-red-600' 
                : 'border-green-500 bg-green-50 text-green-600'
            }`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 transition-colors font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileSettingsPage 