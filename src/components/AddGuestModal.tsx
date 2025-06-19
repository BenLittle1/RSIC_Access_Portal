import { useState } from 'react'
import { format } from 'date-fns'

interface Profile {
  id: string
  user_id: string
  full_name: string
  username: string
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
  inviter_name?: string
}

interface AddGuestModalProps {
  selectedDate: Date
  userProfile: Profile
  isSecurityUser: boolean
  onClose: () => void
  onAddGuest: (guestData: Omit<Guest, 'id' | 'inviter_name'>) => Promise<boolean>
}

const AddGuestModal = ({ 
  selectedDate, 
  userProfile, 
  isSecurityUser, 
  onClose, 
  onAddGuest 
}: AddGuestModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    visit_date: format(selectedDate, 'yyyy-MM-dd'),
    estimated_arrival: '',
    floor_access: '',
    organization: isSecurityUser ? '' : userProfile.organization
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const organizations = ['Security', 'Organization A', 'Organization B', 'Organization C']
  const floorOptions = ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5', 'All Floors']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!formData.name.trim()) {
      setError('Guest name is required')
      setLoading(false)
      return
    }

    if (!formData.estimated_arrival) {
      setError('Estimated arrival time is required')
      setLoading(false)
      return
    }

    if (!formData.floor_access) {
      setError('Floor access is required')
      setLoading(false)
      return
    }

    if (isSecurityUser && !formData.organization) {
      setError('Organization is required')
      setLoading(false)
      return
    }

    // Prepare guest data
    const guestData = {
      name: formData.name.trim(),
      visit_date: formData.visit_date,
      estimated_arrival: formData.estimated_arrival,
      arrival_status: false,
      floor_access: formData.floor_access,
      inviter_id: userProfile.user_id,
      organization: formData.organization
    }

    const success = await onAddGuest(guestData)
    
    if (success) {
      onClose()
    } else {
      setError('Failed to add guest. Please try again.')
    }
    
    setLoading(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('') // Clear error when user starts typing
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black w-full max-w-md mx-4">
        {/* Header */}
        <div className="border-b border-black p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-black">Add Guest</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Guest Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-black mb-1">
              Guest Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Enter guest's full name"
              required
            />
          </div>

          {/* Visit Date */}
          <div>
            <label htmlFor="visit_date" className="block text-sm font-bold text-black mb-1">
              Visit Date *
            </label>
            <input
              id="visit_date"
              type="date"
              value={formData.visit_date}
              onChange={(e) => handleInputChange('visit_date', e.target.value)}
              className="w-full p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
          </div>

          {/* Estimated Arrival */}
          <div>
            <label htmlFor="estimated_arrival" className="block text-sm font-bold text-black mb-1">
              Estimated Arrival Time *
            </label>
            <input
              id="estimated_arrival"
              type="time"
              value={formData.estimated_arrival}
              onChange={(e) => handleInputChange('estimated_arrival', e.target.value)}
              className="w-full p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            />
          </div>

          {/* Floor Access */}
          <div>
            <label htmlFor="floor_access" className="block text-sm font-bold text-black mb-1">
              Floor Access *
            </label>
            <select
              id="floor_access"
              value={formData.floor_access}
              onChange={(e) => handleInputChange('floor_access', e.target.value)}
              className="w-full p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              required
            >
              <option value="">Select floor access</option>
              {floorOptions.map(floor => (
                <option key={floor} value={floor}>{floor}</option>
              ))}
            </select>
          </div>

          {/* Organization (Security users only) */}
          {isSecurityUser && (
            <div>
              <label htmlFor="organization" className="block text-sm font-bold text-black mb-1">
                Requesting Organization *
              </label>
              <select
                id="organization"
                value={formData.organization}
                onChange={(e) => handleInputChange('organization', e.target.value)}
                className="w-full p-2 border border-black text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                required
              >
                <option value="">Select organization</option>
                {organizations.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 border border-red-500 bg-red-50">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-black text-black bg-white hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? 'Adding...' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddGuestModal 