/**
 * useChat.js — Chat State & Supabase Persistence Hook
 * ------------------------------------------------------
 * Manages all chat CRUD operations and keeps local React state in sync with
 * the Supabase `chats` table.
 *
 * Data model (Supabase `chats` table):
 *   id         uuid (PK, auto-generated)
 *   user_id    uuid (FK → auth.users; used to isolate chats per user)
 *   title      text ("VST → Band" or "Any VST → Band")
 *   vst        text | null
 *   band       text
 *   messages   jsonb  (array of { id, role, content, streaming? })
 *   created_at timestamptz
 *
 * State shape:
 *   chats        — full list for the authenticated user, newest first
 *   activeChatId — the UUID of the currently open chat (or null for empty state)
 *   activeChat   — derived: the chat object matching activeChatId, or null
 *   loading      — true until the initial DB fetch resolves
 *
 * Message roles: "user" | "sonic"
 * (the backend uses "assistant" in the chat_history payload; the mapping
 *  happens in ChatWindow.jsx → buildHistory())
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useChat(user) {
  const [chats, setChats]               = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [loading, setLoading]           = useState(true)

  // Re-fetch when the logged-in user changes (e.g. after sign-in/sign-out)
  useEffect(() => {
    if (!user) {
      setChats([])
      setLoading(false)
      return
    }
    loadChats()
  }, [user?.id])

  /** Fetch all chats for the current user, ordered newest-first. */
  const loadChats = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)           // row-level isolation — only this user's chats
      .order('created_at', { ascending: false })
    if (!error && data) setChats(data)
    setLoading(false)
  }

  // Derived: find the active chat object from the local array (no extra DB call)
  const activeChat = chats.find(c => c.id === activeChatId) || null

  /**
   * createChat — inserts a new chat row and optimistically prepends it to state.
   * @param {string|null} vst  — plugin name (null = "Any VST")
   * @param {string}      band — band / artist name
   * @returns {string|null} new chat UUID, or null on error
   */
  const createChat = useCallback(async (vst, band) => {
    if (!user) return null
    const title = vst ? `${vst} → ${band}` : `Any VST → ${band}`
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id:  user.id,
        title,
        vst:      vst || null,
        band,
        messages: [],  // starts with empty message array
      })
      .select()
      .single()

    if (error || !data) {
      console.error('createChat error:', error)
      return null
    }
    setChats(prev => [data, ...prev]) // prepend so newest appears at the top
    setActiveChatId(data.id)
    return data.id
  }, [user])

  /**
   * deleteChat — deletes from Supabase and removes from local state.
   * If the deleted chat was active, activeChatId is cleared (→ empty state).
   */
  const deleteChat = useCallback(async (id) => {
    await supabase.from('chats').delete().eq('id', id)
    setChats(prev => prev.filter(c => c.id !== id))
    setActiveChatId(prev => prev === id ? null : prev)
  }, [])

  /**
   * renameChat — updates the title in Supabase and in local state.
   */
  const renameChat = useCallback(async (id, title) => {
    await supabase.from('chats').update({ title }).eq('id', id)
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c))
  }, [])

  /**
   * addMessage — appends a message object to the local messages array.
   * NOTE: this is optimistic; the final persist happens in updateLastMessage
   * when streaming ends.
   * @param {string} chatId   — UUID of the target chat
   * @param {object} message  — { id, role, content, streaming? }
   */
  const addMessage = useCallback((chatId, message) => {
    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c
      const updated = [...(c.messages || []), message]
      return { ...c, messages: updated }
    }))
  }, [])

  /**
   * updateLastMessage — updates the last message's content in local state,
   * and persists the full messages array to Supabase once streaming ends.
   *
   * Called on every SSE token during streaming (streaming=true) and once
   * more with the final content when the stream closes (streaming=false).
   *
   * @param {string}  chatId    — target chat UUID
   * @param {string}  content   — accumulated text so far
   * @param {boolean} streaming — true while stream is active
   */
  const updateLastMessage = useCallback((chatId, content, streaming) => {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === chatId)
      if (idx === -1) return prev

      const chat       = prev[idx]
      const messages   = [...(chat.messages || [])]
      const lastIdx    = messages.length - 1

      // Only modify the last message if it's a sonic (assistant) message
      if (lastIdx < 0 || messages[lastIdx].role !== 'sonic') return prev

      const last = messages[lastIdx]

      // Bail out early if nothing actually changed (avoids unnecessary re-renders)
      if (last.content === content && last.streaming === streaming) return prev

      messages[lastIdx] = { ...last, content, streaming }
      const updatedChats = [...prev]
      updatedChats[idx] = { ...chat, messages }

      // Persist to Supabase only when the stream has fully ended
      if (!streaming) {
        supabase
          .from('chats')
          .update({ messages })
          .eq('id', chatId)
          .then(({ error }) => {
            if (error) console.error('updateLastMessage save error:', error)
          })
      }
      return updatedChats
    })
  }, [])

  return {
    chats,
    activeChatId,
    activeChat,
    loading,
    createChat,
    deleteChat,
    renameChat,
    addMessage,
    setActiveChatId,
    updateLastMessage,
  }
}