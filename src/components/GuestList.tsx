import { format, addDays, subDays } from 'date-fns'

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

interface GuestListProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  guests: Guest[]
  isSecurityUser: boolean
  onShowAddGuest: () => void
  onShowMetrics: () => void
  onUpdateArrivalStatus: (guestId: string, status: boolean) => void
  isLoading?: boolean
}

const GuestList = ({ 
  selectedDate, 
  setSelectedDate, 
  guests, 
  isSecurityUser, 
  onShowAddGuest, 
  onShowMetrics,
  onUpdateArrivalStatus,
  isLoading = false
}: GuestListProps) => {
  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getDateDisplayText = () => {
    const today = new Date()
    const isToday = selectedDate.toDateString() === today.toDateString()
    const tomorrow = addDays(today, 1)
    const isTomorrow = selectedDate.toDateString() === tomorrow.toDateString()
    const yesterday = subDays(today, 1)
    const isYesterday = selectedDate.toDateString() === yesterday.toDateString()

    if (isToday) return 'Today'
    if (isTomorrow) return 'Tomorrow'
    if (isYesterday) return 'Yesterday'
    return format(selectedDate, 'EEEE')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Day Navigator */}
      <div className="border-b border-black bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-2 hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Previous day"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center min-w-[280px]">
                <h2 className="text-xl font-bold text-black">
                  {getDateDisplayText()}, {format(selectedDate, 'MMMM d')}
                </h2>
                <p className="text-sm text-gray-600">{format(selectedDate, 'yyyy')}</p>
              </div>

              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-2 hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Next day"
              >
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onShowAddGuest}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors font-medium flex-shrink-0"
            >
              Add Guest
            </button>
            {/*
            <button
              onClick={onShowMetrics}
              className="px-4 py-2 bg-gray-100 text-black border border-black hover:bg-gray-200 transition-colors font-medium flex-shrink-0"
            >
              View Metrics
            </button>
            */}
          </div>
        </div>
      </div>

      {/* Guest Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-4 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
              <p className="text-lg">Loading guests...</p>
            </div>
          </div>
        ) : guests.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg">No guests scheduled for this date</p>
              <p className="text-sm mt-1">Click "Add Guest" to schedule a visitor</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-black sticky top-0">
              <tr>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">Arrived</th>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">Name</th>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">Est. Arrival</th>
                <th className="text-left p-3 font-bold text-black border-r border-gray-300">
                  {isSecurityUser ? 'Inviting Organization' : 'Inviter'}
                </th>
                <th className="text-left p-3 font-bold text-black">Floor Access</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest, index) => (
                <tr 
                  key={guest.id} 
                  className={`border-b border-gray-200 hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  }`}
                >
                  <td className="p-3 border-r border-gray-200">
                    <div className="flex items-center justify-start pl-2">
                      {isSecurityUser ? (
                        <input
                          type="checkbox"
                          checked={guest.arrival_status}
                          onChange={(e) => onUpdateArrivalStatus(guest.id, e.target.checked)}
                          className="w-4 h-4 text-black bg-white border-2 border-black rounded focus:ring-black focus:ring-2 accent-black"
                        />
                      ) : (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${
                          guest.arrival_status 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          {guest.arrival_status ? 'Arrived' : 'Not Arrived'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 border-r border-gray-200 font-medium text-black">
                    {guest.name}
                  </td>
                  <td className="p-3 border-r border-gray-200 text-black">
                    {formatTime(guest.estimated_arrival)}
                  </td>
                  <td className="p-3 border-r border-gray-200 text-black">
                    {isSecurityUser ? (
                      <span className="px-2 py-1 bg-gray-100 border border-gray-300 text-xs font-medium rounded">
                        {guest.organization}
                      </span>
                    ) : (
                      guest.inviter_name
                    )}
                  </td>
                  <td className="p-3 text-black">
                    {guest.floor_access}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default GuestList 