import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useState } from 'react'
import Home from './pages/Home.jsx'
import Chat from './pages/Chat.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './hooks/useAuth.js'
import { useSessionGuard } from './hooks/useSessionGuard.js'

export const ThemeContext = createContext()
export function useTheme() { return useContext(ThemeContext) }

// isStreaming is passed down from ChatWindow via context
export const StreamingContext = createContext(false)
export function useStreaming() { return useContext(StreamingContext) }

function Protected({ children }) {
  const { user, loading } = useAuth()
  const isStreaming = useContext(StreamingContext)
  useSessionGuard(isStreaming)

  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#B13A29] border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

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
  const [isDark, setIsDark] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <StreamingContext.Provider value={{ isStreaming, setIsStreaming }}>
        <div className={isDark ? 'dark' : 'light'}>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
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