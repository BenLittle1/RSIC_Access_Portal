// Utility functions for formatting data

/**
 * Format time from HH:MM format to a more readable format
 */
export const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

/**
 * Format selected floors for display
 */
export const formatSelectedFloors = (selectedFloors: number[], totalFloors: number): string => {
  if (selectedFloors.length === 0) return 'No floors selected'
  if (selectedFloors.length === totalFloors) return `All floors (1-${totalFloors})`
  if (selectedFloors.length <= 5) {
    return `Floor${selectedFloors.length > 1 ? 's' : ''} ${selectedFloors.join(', ')}`
  }
  return `${selectedFloors.length} floors selected`
}

/**
 * Format floor access string for database storage
 */
export const formatFloorAccess = (selectedFloors: number[]): string => {
  return selectedFloors.length === 1 
    ? `Floor ${selectedFloors[0]}`
    : `Floors ${selectedFloors.join(', ')}`
}

/**
 * Get CSS classes for authentication status badges
 */
export const getStatusBadgeClasses = (status: string): string => {
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