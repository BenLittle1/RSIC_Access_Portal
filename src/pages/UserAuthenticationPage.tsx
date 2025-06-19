import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ORGANIZATIONS } from '../utils/constants'

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

const UserAuthenticationPage = () => {
  const navigate = useNavigate()
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [isPasswordProtected, setIsPasswordProtected] = useState(true)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [editingOrganization, setEditingOrganization] = useState<string | null>(null)
  const [updatingOrganization, setUpdatingOrganization] = useState<string | null>(null)


  useEffect(() => {
    checkUserAndLoadProfiles()
  }, [])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordInput === 'AXL') {
      setIsPasswordProtected(false)
      setPasswordError('')
    } else {
      setPasswordError('Incorrect password')
      setPasswordInput('')
    }
  }



  const checkUserAndLoadProfiles = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      navigate('/')
      return
    }

    // Fetch current user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profileData || profileData.organization !== 'Security') {
      console.error('Access denied: Not a security user')
      navigate('/dashboard')
      return
    }

    setCurrentProfile(profileData)

    // Fetch all profiles
    const { data: allProfilesData, error: allProfilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (allProfilesError) {
      console.error('Error fetching profiles:', allProfilesError)
      setAllProfiles([])
    } else {
      setAllProfiles(allProfilesData || [])
    }
    
    setLoading(false)
  }

  const updateAuthenticationStatus = async (profileId: string, newStatus: string) => {
    setUpdating(profileId)

    const { error } = await supabase
      .from('profiles')
      .update({ authentication_status: newStatus })
      .eq('id', profileId)

    if (error) {
      console.error('Error updating status:', error)
      alert('Error updating authentication status')
    } else {
      // Update local state
      setAllProfiles(profiles => 
        profiles.map(profile => 
          profile.id === profileId 
            ? { ...profile, authentication_status: newStatus }
            : profile
        )
      )
    }

    setUpdating(null)
  }

  const updateOrganization = async (profileId: string, newOrganization: string) => {
    setUpdatingOrganization(profileId)

    const { error } = await supabase
      .from('profiles')
      .update({ organization: newOrganization })
      .eq('id', profileId)

    if (error) {
      console.error('Error updating organization:', error)
      alert('Error updating organization')
    } else {
      // Update local state
      setAllProfiles(profiles => 
        profiles.map(profile => 
          profile.id === profileId 
            ? { ...profile, organization: newOrganization }
            : profile
        )
      )
      setEditingOrganization(null)
    }

    setUpdatingOrganization(null)
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded border"
    
    switch (status) {
      case 'Approved':
        return `${baseClasses} bg-green-100 text-green-800 border-green-300`
      case 'Pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-300`
      case 'Denied':
        return `${baseClasses} bg-red-100 text-red-800 border-red-300`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border-gray-300`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-black">Loading...</div>
      </div>
    )
  }

  if (!currentProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-black">Access denied</div>
      </div>
    )
  }

  // Password protection screen
  if (isPasswordProtected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="bg-white border border-black p-8 w-full max-w-md">
          <h2 className="text-2xl font-bold text-black mb-6 text-center">
            User Authentication Access
          </h2>
          <p className="text-gray-600 mb-6 text-center">
            This page is password protected. Please enter the access password.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3 py-2 border border-black focus:outline-none focus:border-gray-500"
                placeholder="Enter password"
                required
              />
            </div>
            {passwordError && (
              <div className="text-red-600 text-sm">{passwordError}</div>
            )}
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-black text-white py-2 px-4 hover:bg-gray-800 transition-colors"
              >
                Access Page
              </button>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="flex-1 bg-gray-200 text-black py-2 px-4 hover:bg-gray-300 transition-colors border border-black"
              >
                Back to Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-black bg-white px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-black">User Authentication Management</h1>
          <div className="flex items-center space-x-4">
            <span className="text-black font-bold">
              {currentProfile.full_name}
            </span>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              Back to Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-black mb-2">All User Accounts</h2>
          <p className="text-gray-600">
            Manage authentication status for all registered users. Total users: {allProfiles.length}
          </p>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full border border-black">
            <thead className="bg-gray-50 border-b border-black">
              <tr>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">Full Name</th>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">Email</th>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">Organization</th>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">Status</th>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">Created</th>
                <th className="text-left p-3 font-bold text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allProfiles.map((profile, index) => (
                <tr 
                  key={profile.id} 
                  className={`border-b border-gray-200 hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  }`}
                >
                  <td className="p-3 border-r border-gray-200 font-medium text-black">
                    {profile.full_name}
                  </td>
                  <td className="p-3 border-r border-gray-200 text-black">
                    {profile.email || 'No email'}
                  </td>
                  <td className="p-3 border-r border-gray-200 text-black">
                    {editingOrganization === profile.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={profile.organization}
                          onChange={(e) => updateOrganization(profile.id, e.target.value)}
                          disabled={updatingOrganization === profile.id}
                          className="px-2 py-1 border border-black text-xs font-medium rounded bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                          {ORGANIZATIONS.map((org) => (
                            <option key={org} value={org}>
                              {org}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingOrganization(null)}
                          disabled={updatingOrganization === profile.id}
                          className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 border border-gray-400 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-gray-100 border border-gray-300 text-xs font-medium rounded">
                          {profile.organization}
                        </span>
                        <button
                          onClick={() => setEditingOrganization(profile.id)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-r border-gray-200">
                    <span className={getStatusBadge(profile.authentication_status)}>
                      {profile.authentication_status}
                    </span>
                  </td>
                  <td className="p-3 border-r border-gray-200 text-black text-sm">
                    {formatDate(profile.created_at)}
                  </td>
                  <td className="p-3">
                    <div className="flex space-x-2">
                      {profile.authentication_status !== 'Approved' && (
                        <button
                          onClick={() => updateAuthenticationStatus(profile.id, 'Approved')}
                          disabled={updating === profile.id}
                          className="px-3 py-1 bg-green-600 text-white text-xs hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                        >
                          {updating === profile.id ? 'Updating...' : 'Approve'}
                        </button>
                      )}
                      {profile.authentication_status !== 'Denied' && (
                        <button
                          onClick={() => updateAuthenticationStatus(profile.id, 'Denied')}
                          disabled={updating === profile.id}
                          className="px-3 py-1 bg-red-600 text-white text-xs hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                        >
                          {updating === profile.id ? 'Updating...' : 'Deny'}
                        </button>
                      )}
                      {profile.authentication_status !== 'Pending' && (
                        <button
                          onClick={() => updateAuthenticationStatus(profile.id, 'Pending')}
                          disabled={updating === profile.id}
                          className="px-3 py-1 bg-yellow-600 text-white text-xs hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
                        >
                          {updating === profile.id ? 'Updating...' : 'Pending'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {allProfiles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No user profiles found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserAuthenticationPage 