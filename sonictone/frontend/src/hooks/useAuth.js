import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get current session on mount — if token is expired Supabase will
    // attempt a refresh; if that fails, session will be null.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for ALL auth state changes (sign in, sign out, token refresh, expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      // Redirect to login on sign-out or expired session
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange SIGNED_OUT event handles the redirect
  }

  return { user, loading, signOut }
}