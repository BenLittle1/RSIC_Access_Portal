import { supabase } from '../lib/supabase'

const EMAIL_API_URL = 'http://localhost:3001/api'

/**
 * Make an authenticated API call to the backend
 */
export const authenticatedFetch = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  
  if (!token) {
    throw new Error('No authentication token available')
  }
  
  // Merge headers with authentication
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  }
  
  // Make the authenticated request
  const response = await fetch(`${EMAIL_API_URL}${endpoint}`, {
    ...options,
    headers
  })
  
  if (response.status === 401) {
    throw new Error('Authentication failed - please log in again')
  }
  
  if (response.status === 403) {
    throw new Error('Access denied - insufficient permissions')
  }
  
  return response
}

/**
 * Send guest arrival notification email
 */
export const notifyGuestArrival = async (guestId: string, arrivalStatus: boolean) => {
  try {
    const response = await authenticatedFetch('/notify-arrival', {
      method: 'POST',
      body: JSON.stringify({
        guestId,
        arrivalStatus
      })
    })
    
    if (!response.ok) {
      throw new Error('Email notification request failed')
    }
    
    const result = await response.json()
    console.log('✅ Email notification sent successfully:', result)
    return result
  } catch (error) {
    console.error('❌ Error sending email notification:', error)
    throw error
  }
} 