// Application constants and configuration

export const FLOORS = Array.from({ length: 13 }, (_, i) => i + 1) // Floors 1-13

export const ORGANIZATIONS = ['Security', 'AXL', 'Knowledgehook', 'Yscope'] as const

export const AUTHENTICATION_STATUSES = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DENIED: 'Denied'
} as const

// SECURITY NOTE: Admin authorization should be server-side only
// Client-side password checks are inherently insecure

export const DATE_FORMAT = 'yyyy-MM-dd'
export const TIME_FORMAT = 'HH:mm'

// API Configuration
export const EMAIL_API_URL = 'http://localhost:3001/api'

export const DATE_FORMAT_DISPLAY = {
  DATABASE: 'yyyy-MM-dd',
  DISPLAY_SHORT: 'MMM dd',
  DISPLAY_FULL: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm'
} as const 