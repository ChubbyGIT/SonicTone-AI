/**
 * Sidebar.jsx — Chat History Sidebar
 * -------------------------------------
 * A 260px-wide persistent panel that displays the user's chat history grouped
 * by recency (Today / Yesterday / Earlier), with inline rename and delete.
 *
 * Sub-components (both memoized for performance):
 *
 *   ChatItem — renders a single chat row with:
 *     • Inline rename on pencil-icon click (autoFocus input, blur/Enter/Escape to commit)
 *     • Delete button (on hover) with confirmation via onDelete callback
 *     • Active indicator: left gold bar + highlighted background
 *     • Custom equality check to skip re-renders when id/title/active haven't changed
 *
 *   ChatGroup — renders a labelled section (e.g. "TODAY") with a list of ChatItems.
 *     • Also memoized; skips re-render when item list content is unchanged.
 *
 * Sidebar props:
 *   chats        {array}    — full list of chat objects from useChat
 *   activeChatId {string}   — UUID of the currently selected chat
 *   onSelect     {fn}       — called with chat.id when user clicks a chat
 *   onNew        {fn}       — called when "New Chat" button is clicked
 *   onDelete     {fn}       — called with chat.id to delete
 *   onRename     {fn}       — called with (chat.id, newTitle) to rename
 *   onBack       {fn}       — navigates back to /home
 *   onSignOut    {fn}       — signs out via useAuth
 *   user         {object}   — Supabase user object (for name/email in footer)
 */
import { useState, memo, useMemo } from 'react'
import { useTheme } from '../App.jsx'
import aiIcon from '../assets/ai-icon.png'

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
          ? 'rgba(212,175,55,0.1)'
          : hovered ? 'rgba(212,175,55,0.05)' : 'transparent',
        border: isActive ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
      }}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
          style={{ background: 'linear-gradient(180deg, #FFD700, #D4AF37)' }} />
      )}

      {editing ? (
        <input autoFocus value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          onClick={e => e.stopPropagation()}
          className="w-full bg-transparent text-xs outline-none"
          style={{ color: '#FFD700', borderBottom: '1px solid rgba(212,175,55,0.3)' }}
        />
      ) : (
        <p className="text-xs truncate pr-12"
          style={{ color: isActive ? 'rgba(255,215,0,0.85)' : 'rgba(212,175,55,0.5)' }}>
          {chat.title}
        </p>
      )}

      {hovered && !editing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          <button onClick={e => { e.stopPropagation(); setEditing(true) }}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'rgba(212,175,55,0.08)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                stroke="rgba(212,175,55,0.6)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke="rgba(212,175,55,0.6)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(chat.id) }}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/20"
            style={{ background: 'rgba(212,175,55,0.08)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"
                stroke="rgba(220,80,60,0.7)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}, (prev, next) => (
  prev.chat.id === next.chat.id &&
  prev.chat.title === next.chat.title &&
  prev.isActive === next.isActive
))

const ChatGroup = memo(function ChatGroup({ label, items, activeChatId, onSelect, onRename, onDelete }) {
  if (!items.length) return null
  return (
    <div className="mb-4">
      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase px-3 mb-1"
        style={{ color: 'rgba(212,175,55,0.25)', fontFamily: 'Impact, Arial, sans-serif' }}>
        {label}
      </p>
      {items.map(chat => (
        <ChatItem key={chat.id} chat={chat} isActive={activeChatId === chat.id}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
      ))}
    </div>
  )
}, (prev, next) => {
  if (prev.activeChatId !== next.activeChatId) return false
  if (prev.items.length !== next.items.length) return false
  return prev.items.every((item, i) => item.id === next.items[i].id && item.title === next.items[i].title)
})

export default function Sidebar({ chats, activeChatId, onSelect, onNew, onDelete, onRename, onBack, user, onSignOut }) {
  const { isDark, setIsDark } = useTheme()

  const { todayChats, yesterdayChats, olderChats } = useMemo(() => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    return {
      todayChats: chats.filter(c => new Date(c.created_at || c.createdAt).toDateString() === today),
      yesterdayChats: chats.filter(c => new Date(c.created_at || c.createdAt).toDateString() === yesterday),
      olderChats: chats.filter(c => {
        const d = new Date(c.created_at || c.createdAt).toDateString()
        return d !== today && d !== yesterday
      }),
    }
  }, [chats.map(c => c.id + c.title).join()])

  const userName = user?.user_metadata?.name || 'Guitarist'

  return (
    <div className="w-[260px] h-screen flex flex-col"
      style={{ background: isDark ? 'rgba(4,4,2,0.97)' : 'rgba(250,246,233,0.97)',
        borderRight: '1px solid rgba(212,175,55,0.1)' }}>

      {/* Back */}
      <div className="px-4 pt-5 pb-3">
        <button onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all w-full"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
            color: '#D4AF37' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,175,55,0.08)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-xs font-medium" style={{ fontFamily: 'Impact, Arial, sans-serif',
            letterSpacing: '0.05em' }}>BACK TO HOME</span>
        </button>
      </div>

      {/* Logo */}
      <div className="px-4 pb-4 flex items-center gap-2.5">
        <img src={aiIcon} alt="Sonic"
          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          style={{ boxShadow: '0 0 12px rgba(255,215,0,0.4)' }} />
        <span className="text-sm font-semibold"
          style={{ color: '#D4AF37', fontFamily: 'Impact, Arial, sans-serif', letterSpacing: '0.1em' }}>
          SONIC
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setIsDark(d => !d)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(212,175,55,0.07)' }}>
            {isDark ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="#FFD700" strokeWidth="2"/>
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                  stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="#8B6914" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          <span className="text-[10px] font-mono" style={{ color: 'rgba(212,175,55,0.2)' }}>v1.0</span>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 mb-4">
        <button onClick={onNew}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all"
          style={{ border: '1px solid rgba(212,175,55,0.15)', color: 'rgba(212,175,55,0.5)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'; e.currentTarget.style.color = 'rgba(212,175,55,0.8)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.15)'; e.currentTarget.style.color = 'rgba(212,175,55,0.5)' }}>
          <div className="w-5 h-5 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.08)' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-1">
        <ChatGroup label="Today" items={todayChats} activeChatId={activeChatId}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
        <ChatGroup label="Yesterday" items={yesterdayChats} activeChatId={activeChatId}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
        <ChatGroup label="Earlier" items={olderChats} activeChatId={activeChatId}
          onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
        {chats.length === 0 && (
          <p className="text-[11px] text-center mt-8 px-4" style={{ color: 'rgba(212,175,55,0.2)' }}>
            No chats yet. Generate a tone!
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(212,175,55,0.08)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FFD700, #D4AF37)', color: '#020202' }}>
            {userName[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'rgba(212,175,55,0.7)' }}>
              {userName}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(212,175,55,0.25)' }}>
              {user?.email}
            </p>
          </div>
          <button
            onClick={onSignOut || (async () => {
              const { supabase } = await import('../lib/supabase.js')
              await supabase.auth.signOut()
              window.location.href = '/login'
            })}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-red-500/20"
            style={{ background: 'rgba(212,175,55,0.06)' }}
            title="Sign out">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="rgba(220,80,60,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}