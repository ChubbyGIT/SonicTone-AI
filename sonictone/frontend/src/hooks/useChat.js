import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useChat(user) {
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setChats([])
      setLoading(false)
      return
    }
    loadChats()
  }, [user?.id])

  const loadChats = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)           // ← user-specific isolation
      .order('created_at', { ascending: false })
    if (!error && data) setChats(data)
    setLoading(false)
  }

  const activeChat = chats.find(c => c.id === activeChatId) || null

  const createChat = useCallback(async (vst, band) => {
    if (!user) return null
    const title = vst ? `${vst} → ${band}` : `Any VST → ${band}`
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title,
        vst: vst || null,
        band,
        messages: [],
      })
      .select()
      .single()

    if (error || !data) {
      console.error('createChat error:', error)
      return null
    }
    setChats(prev => [data, ...prev])
    setActiveChatId(data.id)
    return data.id
  }, [user])

  const deleteChat = useCallback(async (id) => {
    await supabase.from('chats').delete().eq('id', id)
    setChats(prev => prev.filter(c => c.id !== id))
    setActiveChatId(prev => prev === id ? null : prev)
  }, [])

  const renameChat = useCallback(async (id, title) => {
    await supabase.from('chats').update({ title }).eq('id', id)
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c))
  }, [])

  const addMessage = useCallback((chatId, message) => {
    setChats(prev => prev.map(c => {
      if (c.id !== chatId) return c
      const updated = [...(c.messages || []), message]
      return { ...c, messages: updated }
    }))
  }, [])

  const updateLastMessage = useCallback((chatId, content, streaming) => {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === chatId)
      if (idx === -1) return prev
      const chat = prev[idx]
      const messages = [...(chat.messages || [])]
      const lastIdx = messages.length - 1
      if (lastIdx < 0 || messages[lastIdx].role !== 'sonic') return prev
      const last = messages[lastIdx]
      if (last.content === content && last.streaming === streaming) return prev
      messages[lastIdx] = { ...last, content, streaming }
      const updatedChats = [...prev]
      updatedChats[idx] = { ...chat, messages }

      // Persist to Supabase only when streaming ends
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