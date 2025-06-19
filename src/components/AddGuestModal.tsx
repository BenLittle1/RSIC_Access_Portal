import { useState } from 'react'
import { format } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { supabase } from '../lib/supabase'

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
    estimated_arrival: '',
    organization: isSecurityUser ? '' : userProfile.organization
  })
  const [selectedDates, setSelectedDates] = useState<Date[]>([selectedDate])
  const [selectedFloors, setSelectedFloors] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCalendar, setShowCalendar] = useState(false)

  const organizations = ['Security', 'AXL', 'Knowledgehook', 'Yscope']
  const floors = Array.from({ length: 13 }, (_, i) => i + 1) // Floors 1-13

  const handleFloorToggle = (floor: number) => {
    setSelectedFloors(prev => {
      if (prev.includes(floor)) {
        return prev.filter(f => f !== floor)
      } else {
        return [...prev, floor].sort((a, b) => a - b)
      }
    })
    if (error) setError('')
  }

  const selectAllFloors = () => {
    setSelectedFloors(floors)
    if (error) setError('')
  }

  const clearAllFloors = () => {
    setSelectedFloors([])
  }

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (dates) {
      setSelectedDates(dates)
    }
    if (error) setError('')
  }

  const formatSelectedDates = () => {
    if (selectedDates.length === 0) return 'No dates selected'
    if (selectedDates.length === 1) return format(selectedDates[0], 'MMM dd, yyyy')
    if (selectedDates.length <= 3) {
      return selectedDates.map(date => format(date, 'MMM dd')).join(', ')
    }
    return `${selectedDates.length} dates selected`
  }

  const formatSelectedFloors = () => {
    if (selectedFloors.length === 0) return 'No floors selected'
    if (selectedFloors.length === floors.length) return 'All floors (1-13)'
    if (selectedFloors.length <= 5) {
      return `Floor${selectedFloors.length > 1 ? 's' : ''} ${selectedFloors.join(', ')}`
    }
    return `${selectedFloors.length} floors selected`
  }

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

    if (selectedFloors.length === 0) {
      setError('At least one floor must be selected')
      setLoading(false)
      return
    }

    if (selectedDates.length === 0) {
      setError('At least one date must be selected')
      setLoading(false)
      return
    }

    if (isSecurityUser && !formData.organization) {
      setError('Organization is required')
      setLoading(false)
      return
    }

    try {
      // Get the requester's email from the current user's auth data
      const { data: { user } } = await supabase.auth.getUser()
      const requesterEmail = user?.email || userProfile.email || ''

      // Format floor access string
      const floorAccessString = selectedFloors.length === 1 
        ? `Floor ${selectedFloors[0]}`
        : `Floors ${selectedFloors.join(', ')}`

      // Create one guest entry per date (not per floor)
      const totalEntries = selectedDates.length
      let successCount = 0

      for (const date of selectedDates) {
        const guestData = {
          name: formData.name.trim(),
          visit_date: format(date, 'yyyy-MM-dd'),
          estimated_arrival: formData.estimated_arrival,
          arrival_status: false,
          floor_access: floorAccessString,
          inviter_id: userProfile.user_id,
          organization: formData.organization,
          requester_email: requesterEmail
        }

        const success = await onAddGuest(guestData)
        if (success) successCount++
      }

      if (successCount === totalEntries) {
        onClose()
      } else if (successCount > 0) {
        setError(`${successCount} of ${totalEntries} guest entries created successfully. Some entries may have failed.`)
      } else {
        setError('Failed to create any guest entries. Please try again.')
      }
    } catch (err) {
      setError('An error occurred while creating guest entries.')
    }
    
    setLoading(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const totalEntries = selectedDates.length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-black w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-black p-4 bg-white sticky top-0">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

          {/* Visit Dates */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Visit Dates * ({selectedDates.length} selected)
            </label>
            <div className="border border-black bg-white">
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <span className="text-black">{formatSelectedDates()}</span>
                <svg 
                  className={`w-5 h-5 text-black transition-transform ${showCalendar ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showCalendar && (
                <div className="border-t border-black p-4">
                  <DayPicker
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={handleDateSelect}
                    disabled={{ before: new Date() }}
                    classNames={{
                      day_selected: 'bg-black text-white',
                      day_today: 'font-bold border border-gray-400',
                      day: 'hover:bg-gray-100'
                    }}
                  />
                  <div className="mt-3 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDates([])}
                      className="px-3 py-1 text-xs border border-black hover:bg-gray-100 transition-colors"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCalendar(false)}
                      className="px-3 py-1 text-xs bg-black text-white hover:bg-gray-800 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            <label className="block text-sm font-bold text-black mb-2">
              Floor Access * ({selectedFloors.length} selected)
            </label>
            <div className="border border-black bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">{formatSelectedFloors()}</span>
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={selectAllFloors}
                    className="px-3 py-1 text-xs border border-black hover:bg-gray-100 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAllFloors}
                    className="px-3 py-1 text-xs border border-black hover:bg-gray-100 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {floors.map(floor => (
                  <label 
                    key={floor}
                    className={`flex items-center justify-center p-2 border cursor-pointer transition-colors ${
                      selectedFloors.includes(floor)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFloors.includes(floor)}
                      onChange={() => handleFloorToggle(floor)}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">Floor {floor}</span>
                  </label>
                ))}
              </div>
            </div>
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

          {/* Summary */}
          {totalEntries > 1 && (
            <div className="p-3 border border-blue-500 bg-blue-50">
              <p className="text-sm text-blue-800">
                <strong>Summary:</strong> This will create {totalEntries} guest entries 
                ({selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} with access to {selectedFloors.length} floor{selectedFloors.length > 1 ? 's' : ''})
              </p>
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
              disabled={loading || selectedDates.length === 0 || selectedFloors.length === 0}
              className="flex-1 py-2 px-4 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? `Creating ${totalEntries} entries...` : `Add Guest${totalEntries > 1 ? ` (${totalEntries} entries)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddGuestModal 