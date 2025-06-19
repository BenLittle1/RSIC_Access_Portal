// Application constants and configuration

export const FLOORS = Array.from({ length: 13 }, (_, i) => i + 1) // Floors 1-13

export const ORGANIZATIONS = ['Security', 'AXL', 'Knowledgehook', 'Yscope'] as const

export const AUTHENTICATION_STATUSES = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DENIED: 'Denied'
} as const

export const SECURITY_PASSWORD = 'AXL'

export const DATE_FORMAT = 'yyyy-MM-dd'
export const TIME_FORMAT = 'HH:mm'

// API Configuration
export const EMAIL_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.railway.app/api' 
  : 'http://localhost:3001/api'

export const DATE_FORMAT_DISPLAY = {
  DATABASE: 'yyyy-MM-dd',
  DISPLAY_SHORT: 'MMM dd',
  DISPLAY_FULL: 'MMM dd, yyyy',
  DISPLAY_WITH_TIME: 'MMM dd, yyyy HH:mm'
} as const 