import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

// Only poll in local dev — in production the backend lives on Vercel,
// not localhost, so this guard is not meaningful there.
const IS_DEV = import.meta.env.DEV
const BACKEND_URL = 'http://localhost:8000/session-status'
const POLL_INTERVAL = 5000   // every 5 seconds
const MAX_FAILS = 2           // sign out after 2 consecutive failures (~10s)

export function useSessionGuard(isStreaming = false) {
  const intervalRef = useRef(null)
  const failCountRef = useRef(0)

  // ── Supabase-native session watcher (works in ALL environments) ──
  // If the Supabase token can't be refreshed (expired, revoked, network issue),
  // it fires a SIGNED_OUT event which useAuth already handles globally.
  // This is the production-safe guard.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // TOKEN_REFRESHED is fine — just keep going.
        // SIGNED_OUT will be caught by useAuth which redirects to /login.
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Local dev only: poll backend health, sign out if server goes down ──
  useEffect(() => {
    if (!IS_DEV) return  // skip entirely in production

    const checkBackend = async () => {
      if (isStreaming) return  // never check mid-generation

      try {
        const res = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
          failCountRef.current = 0
        } else {
          await handleFail()
        }
      } catch {
        await handleFail()
      }
    }

    const handleFail = async () => {
      failCountRef.current += 1
      console.warn(`[SessionGuard] Backend unreachable (${failCountRef.current}/${MAX_FAILS})`)
      if (failCountRef.current >= MAX_FAILS) {
        clearInterval(intervalRef.current)
        console.warn('[SessionGuard] Backend down — signing out user')
        await supabase.auth.signOut()
        // useAuth onAuthStateChange will redirect to /login
      }
    }

    intervalRef.current = setInterval(checkBackend, POLL_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [isStreaming])
}