import { useState, memo, useMemo } from 'react'
import { useTheme } from '../App.jsx'
import aiIcon from '../assets/ai-icon.png'

// Fully memoized chat item — NEVER re-renders during streaming
const ChatItem = memo(function ChatItem({ chat, isActive, onSelect, onRename, onDelete }) {
  const { isDark } = useTheme()
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(chat.title)

  const commitEdit = () => {
    if (editVal.trim()) onRename(chat.id, editVal.trim())
    setEditing(false)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !editing && onSelect(chat.id)}
      className="relative mx-2 mb-0.5 rounded-xl px-3 py-2.5 cursor-pointer transition-colors duration-150"
      style={{
        background: isActive
          ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
          : hovered
            ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
            : 'transparent',
        border: isActive
          ? isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'
          : '1px solid transparent',
      }}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#B13A29] rounded-full" />
      )}

      {editing ? (
        <input
          autoFocus
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
          onClick={e => e.stopPropagation()}
          className="w-full bg-transparent text-xs outline-none"
          style={{
            color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
          }}
        />
      ) : (
        <p className="text-xs truncate pr-12"
          style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
          {chat.title}
        </p>
      )}

      {hovered && !editing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button
            onClick={e => { e.stopPropagation(); setEditing(true) }}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} strokeWidth="2" strokeLinecap="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(chat.id) }}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/20"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"
                stroke="rgba(220,80,60,0.8)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  // Custom comparison — only re-render if these specific props changed
  // Critically: ignore message content changes (streaming) entirely
  return (
    prev.chat.id === next.chat.id &&
    prev.chat.title === next.chat.title &&
    prev.isActive === next.isActive
  )
})

// Memoized group
const ChatGroup = memo(function ChatGroup({ label, items, activeChatId, onSelect, onRename, onDelete }) {
  if (!items.length) return null
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase px-3 mb-1"
        style={{ color: 'rgba(255,255,255,0.2)' }}>
        {label}
      </p>
      {items.map(chat => (
        <ChatItem
          key={chat.id}
          chat={chat}
          isActive={activeChatId === chat.id}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}, (prev, next) => {
  // Only re-render group if chat list structure changed (add/delete)
  // NOT when message content changes
  if (prev.activeChatId !== next.activeChatId) return false
  if (prev.items.length !== next.items.length) return false
  return prev.items.every((item, i) =>
    item.id === next.items[i].id &&
    item.title === next.items[i].title
  )
})

export default function Sidebar({ chats, activeChatId, onSelect, onNew, onDelete, onRename, onBack }) {
  const { isDark, setIsDark } = useTheme()

  // Memoize grouping so it doesn't recompute on streaming re-renders
  const { todayChats, yesterdayChats, olderChats } = useMemo(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    return {
      todayChats: chats.filter(c => new Date(c.createdAt).toDateString() === today),
      yesterdayChats: chats.filter(c => new Date(c.createdAt).toDateString() === yesterday),
      olderChats: chats.filter(c => {
        const d = new Date(c.createdAt).toDateString()
        return d !== today && d !== yesterday
      }),
    }
  }, [chats.map(c => c.id + c.title).join()])
  // ↑ Only recomputes when IDs or titles change, NOT when messages change

  const sidebarBg = isDark ? 'rgba(8,8,8,0.97)' : 'rgba(245,240,235,0.97)'
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'

  return (
    <div className="w-[260px] h-screen flex flex-col"
      style={{ background: sidebarBg, borderRight: `1px solid ${borderColor}` }}>

      {/* Back Button */}
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 w-full"
          style={{
            background: isDark ? 'rgba(177,58,41,0.12)' : 'rgba(177,58,41,0.08)',
            border: '1px solid rgba(177,58,41,0.3)',
            color: '#B13A29',
          }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(177,58,41,0.22)' : 'rgba(177,58,41,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = isDark ? 'rgba(177,58,41,0.12)' : 'rgba(177,58,41,0.08)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="#B13A29" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-xs font-medium">Back to Home</span>
        </button>
      </div>

      {/* Logo */}
      <div className="px-4 pb-4 flex items-center gap-2.5">
        <img src={aiIcon} alt="Tony"
          className="w-7 h-7 rounded-full object-cover shadow-[0_0_16px_rgba(177,58,41,0.5)] flex-shrink-0" />
        <span className="text-sm font-semibold font-display"
          style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}>
          Tony
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setIsDark(d => !d)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}
          >
            {isDark ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="#FFD700" strokeWidth="2"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                  stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <span className="text-[10px] font-mono"
            style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)' }}>v1.0</span>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 mb-4">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all duration-200"
          style={{
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'}`,
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          }}
        >
          <div className="w-5 h-5 rounded-lg flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-1">
        <ChatGroup
          label="Today" items={todayChats}
          activeChatId={activeChatId}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete}
        />
        <ChatGroup
          label="Yesterday" items={yesterdayChats}
          activeChatId={activeChatId}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete}
        />
        <ChatGroup
          label="Earlier" items={olderChats}
          activeChatId={activeChatId}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete}
        />

        {chats.length === 0 && (
          <p className="text-[11px] text-center mt-8 px-4"
            style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.25)' }}>
            No chats yet. Generate a tone!
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: `1px solid ${borderColor}` }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'rgba(3,40,184,0.2)', border: '1px solid rgba(3,40,184,0.3)', color: '#6b9ef7' }}>
            AI
          </div>
          <div>
            <p className="text-xs font-medium"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Tony Engine</p>
            <p className="text-[10px]"
              style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)' }}>RAG · Ollama · ChromaDB</p>
          </div>
        </div>
      </div>
    </div>
  )
}