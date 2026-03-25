import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '../components/Sidebar.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import { useChat } from '../hooks/useChat.js'
import { useAuth } from '../hooks/useAuth.js'

export default function Chat() {
  const location = useLocation()
  const navigate = useNavigate()
  const { chatId } = useParams()
  const homeState = location.state
  const { user, signOut } = useAuth()

  const {
    chats, activeChatId, activeChat,
    createChat, deleteChat, renameChat,
    addMessage, setActiveChatId, updateLastMessage,
  } = useChat(user)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const initDone = useRef(false)

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    if (chatId) {
      // Loading existing chat from URL — just set it active
      setActiveChatId(chatId)
    }
    // Note: if coming from home, chat was already created there
    // homeState.fromHome flag confirms this
  }, [chatId])

  const handleSelectChat = (id) => {
    setActiveChatId(id)
    navigate(`/chat/${id}`, { state: null })
  }

  const handleNewChat = () => {
    setActiveChatId(null)
    navigate('/chat', { state: null })
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#020202' }}>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0"
          >
            <Sidebar
              chats={chats}
              activeChatId={activeChatId}
              onSelect={handleSelectChat}
              onNew={handleNewChat}
              onDelete={deleteChat}
              onRename={renameChat}
              onBack={() => navigate('/home')}
              onSignOut={signOut}
              user={user}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setSidebarOpen(o => !o)}
        className="absolute top-4 z-50 w-8 h-8 glass rounded-lg flex items-center justify-center
          text-white/40 hover:text-white/80 transition-colors"
        style={{ left: sidebarOpen ? '268px' : '16px' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <ChatWindow
          chat={activeChat}
          homeState={homeState}
          addMessage={addMessage}
          updateLastMessage={updateLastMessage}
          activeChatId={activeChatId}
          createChat={createChat}
          setActiveChatId={setActiveChatId}
          renameChat={renameChat}
          navigate={navigate}
        />
      </div>
    </div>
  )
}