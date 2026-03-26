/**
 * App.jsx — Root Application Component
 * --------------------------------------
 * Sets up the global context providers and React Router routes.
 *
 * Context providers (exposed at the top level so every child can consume them):
 *   • ThemeContext  — isDark flag + setter for dark/light mode toggling
 *   • StreamingContext — whether the AI is currently generating a response;
 *                        used by useSessionGuard to pause health-checks mid-stream
 *
 * Route structure:
 *   /          → redirects to /login (always start at auth)
 *   /login     → PublicOnly wrapper (redirects logged-in users to /home)
 *   /home      → Protected wrapper (redirects guests to /login)
 *   /chat      → Protected — empty chat state (e.g. "New Chat" from sidebar)
 *   /chat/:id  → Protected — loads existing chat by Supabase row id
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useState } from 'react'
import Home from './pages/Home.jsx'
import Chat from './pages/Chat.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './hooks/useAuth.js'
import { useSessionGuard } from './hooks/useSessionGuard.js'

// ── Theme Context ──────────────────────────────────────────────────────────────
// Provides isDark boolean + setIsDark to any component in the tree.
export const ThemeContext = createContext()
export function useTheme() { return useContext(ThemeContext) }

// ── Streaming Context ────────────────────────────────────────────────────────
// isStreaming is set to true by ChatWindow while the SSE stream is active.
// useSessionGuard reads this to skip backend health-checks mid-generation.
export const StreamingContext = createContext(false)
export function useStreaming() { return useContext(StreamingContext) }

/**
 * Protected — route wrapper that requires a logged-in Supabase user.
 * Shows a spinner while session is being resolved, then either renders
 * the child page or redirects to /login.
 */
function Protected({ children }) {
  const { user, loading } = useAuth()
  const isStreaming = useContext(StreamingContext)
  useSessionGuard(isStreaming) // attaches session watcher (and local dev health-poll)

  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#B13A29] border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

/**
 * PublicOnly — route wrapper for pages that should only be visible to guests.
 * Redirects already-authenticated users straight to /home.
 */
function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#B13A29] border-t-transparent animate-spin" />
    </div>
  )
  if (user) return <Navigate to="/home" replace />
  return children
}

export default function App() {
  const [isDark, setIsDark] = useState(true)         // default to dark mode
  const [isStreaming, setIsStreaming] = useState(false)

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <StreamingContext.Provider value={{ isStreaming, setIsStreaming }}>
        {/* The .dark / .light class on this div drives the CSS theme selectors in index.css */}
        <div className={isDark ? 'dark' : 'light'}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              {/* Root always bounces to /login; after login the user is sent to /home */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/home" element={<Protected><Home /></Protected>} />
              <Route path="/chat" element={<Protected><Chat /></Protected>} />
              <Route path="/chat/:chatId" element={<Protected><Chat /></Protected>} />
            </Routes>
          </BrowserRouter>
        </div>
      </StreamingContext.Provider>
    </ThemeContext.Provider>
  )
}