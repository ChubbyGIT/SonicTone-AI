/**
 * useSessionGuard.js — Session Liveness Guard
 * ---------------------------------------------
 * Protects authenticated routes by ensuring the session stays valid.
 *
 * Two strategies run in parallel:
 *
 * 1. Supabase-native watcher (ALL environments)
 *    Subscribes to onAuthStateChange. If the Supabase JWT can't be refreshed
 *    (network issue, token revoked, session expired), Supabase fires SIGNED_OUT
 *    which useAuth already handles with a /login redirect. This is the
 *    production-safe strategy since it doesn't rely on the backend being up.
 *
 * 2. Local dev only: backend health-poll
 *    Polls GET /session-status on the FastAPI server every 5 seconds.
 *    After MAX_FAILS consecutive failures it signs the user out.
 *    This simulates "backend down → log out" behavior during local development.
 *    ⚠️  This poll is intentionally DISABLED in production (IS_DEV guard)
 *        because the FastAPI backend is not deployed alongside the Vercel frontend.
 *
 * @param {boolean} isStreaming — when true, health-checks are skipped so we
 *                                never abort a streaming response mid-generation.
 */

import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

// Detect dev vs production at build time via Vite's import.meta.env.DEV
const IS_DEV         = import.meta.env.DEV
const BACKEND_URL    = 'http://localhost:8000/session-status'
const POLL_INTERVAL  = 5000   // ms between health-checks
const MAX_FAILS      = 2      // consecutive failures before sign-out (~10 s)

export function useSessionGuard(isStreaming = false) {
  const intervalRef  = useRef(null)  // stores the setInterval handle for cleanup
  const failCountRef = useRef(0)     // counts consecutive backend failures

  // ── Strategy 1: Supabase token watcher (runs in all environments) ─────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') {
        // Token was silently refreshed — session is healthy, nothing to do
      }
      // SIGNED_OUT is handled globally by useAuth which redirects to /login
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Strategy 2: Local dev backend health-poll ────────────────────────────
  useEffect(() => {
    if (!IS_DEV) return // skip entirely in production builds

    const checkBackend = async () => {
      if (isStreaming) return // never interrupt a live stream

      try {
        const res = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
          failCountRef.current = 0 // backend responded — reset fail counter
        } else {
          await handleFail()
        }
      } catch {
        // Network error or timeout counts as a failure
        await handleFail()
      }
    }

    const handleFail = async () => {
      failCountRef.current += 1
      console.warn(`[SessionGuard] Backend unreachable (${failCountRef.current}/${MAX_FAILS})`)
      if (failCountRef.current >= MAX_FAILS) {
        clearInterval(intervalRef.current) // stop polling — we're about to sign out
        console.warn('[SessionGuard] Backend down — signing out user')
        await supabase.auth.signOut()
        // useAuth onAuthStateChange SIGNED_OUT handler will redirect to /login
      }
    }

    intervalRef.current = setInterval(checkBackend, POLL_INTERVAL)
    return () => clearInterval(intervalRef.current) // cleanup on unmount or isStreaming change
  }, [isStreaming])
}