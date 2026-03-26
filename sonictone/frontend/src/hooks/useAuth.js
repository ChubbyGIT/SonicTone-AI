/**
 * useAuth.js — Supabase Authentication Hook
 * ------------------------------------------
 * Returns the current Supabase user, a loading flag, and a signOut helper.
 *
 * Flow:
 *  1. On mount, calls getSession() to resolve any existing/refresh-able session.
 *  2. Subscribes to onAuthStateChange so any future event (sign-in, sign-out,
 *     token refresh, expiry) updates the user state in real time.
 *  3. On SIGNED_OUT, forces a hard redirect to /login — this covers both
 *     manual sign-out and expired/revoked tokens caught by Supabase.
 *
 * Used by:
 *  • App.jsx  → Protected / PublicOnly wrappers decide whether to render or redirect
 *  • Home.jsx → to get the user object and call signOut
 *  • Chat.jsx → to get user + signOut for the Sidebar
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true) // true until the first session check resolves

  useEffect(() => {
    // ── Step 1: resolve existing session on mount ────────────────────────────
    // getSession() returns the locally cached token and tries to refresh it if
    // expired. If refresh fails, session is null → user is logged out.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // ── Step 2: subscribe to real-time auth events ───────────────────────────
    // Events: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED,
    //         USER_UPDATED, PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      // Hard redirect on sign-out so the browser fully reinitialises the app
      // (avoids stale state from the protected route being visible for a frame)
      if (event === 'SIGNED_OUT') {
        window.location.href = '/login'
      }
    })

    // Cleanup: unsubscribe when the component that owns this hook unmounts
    return () => subscription.unsubscribe()
  }, [])

  /**
   * signOut — call supabase.auth.signOut() to terminate the session.
   * The onAuthStateChange SIGNED_OUT handler above will trigger the redirect.
   */
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { user, loading, signOut }
}