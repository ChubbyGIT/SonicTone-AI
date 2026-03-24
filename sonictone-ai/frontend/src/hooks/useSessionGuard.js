import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

const POLL_INTERVAL = 15000  // check every 15 seconds
const BACKEND_URL = 'http://localhost:8000/session-status'
const MAX_FAILS = 3  // sign out after 3 consecutive failures (~45s)

export function useSessionGuard(isStreaming = false) {
  const intervalRef = useRef(null)
  const failCountRef = useRef(0)

  useEffect(() => {
    const checkBackend = async () => {
      // Never check while AI is generating — avoid false positives
      if (isStreaming) return

      try {
        const res = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(4000) })
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
      console.warn(`Backend unreachable (${failCountRef.current}/${MAX_FAILS})`)
      if (failCountRef.current >= MAX_FAILS) {
        clearInterval(intervalRef.current)
        await supabase.auth.signOut()
        window.location.href = '/login'
      }
    }

    intervalRef.current = setInterval(checkBackend, POLL_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [isStreaming])
}