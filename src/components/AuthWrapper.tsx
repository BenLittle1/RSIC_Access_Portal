import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const handleAuthError = async () => {
      try {
        // Try to get the current session
        const { data: { session: _ }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('Auth error detected, clearing storage:', error.message)
          // Clear all localStorage entries related to Supabase
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase')) {
              localStorage.removeItem(key)
            }
          })
          
          // Sign out to ensure clean state
          await supabase.auth.signOut()
        }
      } catch (error) {
        console.error('Error handling auth state:', error)
        // Clear storage on any authentication error
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      } finally {
        setIsInitialized(true)
      }
    }

    handleAuthError()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, _session) => {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
} 