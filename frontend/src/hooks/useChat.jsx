import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'sonictone_chats'

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveChats(chats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
}

export function useChat() {
  const [chats, setChats] = useState(loadChats)
  const [activeChatId, setActiveChatId] = useState(null)

  useEffect(() => {
    saveChats(chats)
  }, [chats])

  const activeChat = chats.find(c => c.id === activeChatId) || null

  const createChat = useCallback((vst, band) => {
    const id = uuidv4()
    const title = vst ? `${vst} → ${band}` : `Any VST → ${band}`
    const newChat = {
      id,
      title,
      vst: vst || null,
      band,
      messages: [],
      createdAt: new Date().toISOString(),
    }
    setChats(prev => [newChat, ...prev])
    return id
  }, [])

  const deleteChat = useCallback((id) => {
    setChats(prev => prev.filter(c => c.id !== id))
    setActiveChatId(prev => prev === id ? null : prev)
  }, [])

  const renameChat = useCallback((id, title) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c))
  }, [])

  const addMessage = useCallback((chatId, message) => {
    setChats(prev => prev.map(c =>
      c.id === chatId
        ? { ...c, messages: [...c.messages, message] }
        : c
    ))
  }, [])

  const updateLastMessage = useCallback((chatId, content, streaming) => {
    setChats(prev => {
      const idx = prev.findIndex(c => c.id === chatId)
      if (idx === -1) return prev
      const chat = prev[idx]
      const messages = chat.messages
      const lastIdx = messages.length - 1
      if (lastIdx < 0 || messages[lastIdx].role !== 'tony') return prev
      const last = messages[lastIdx]
      // Skip update if nothing changed
      if (last.content === content && last.streaming === streaming) return prev
      const updatedMessages = [...messages]
      updatedMessages[lastIdx] = { ...last, content, streaming }
      const updatedChats = [...prev]
      updatedChats[idx] = { ...chat, messages: updatedMessages }
      return updatedChats
    })
  }, [])

  return {
    chats,
    activeChatId,
    activeChat,
    createChat,
    deleteChat,
    renameChat,
    addMessage,
    setActiveChatId,
    updateLastMessage,
  }
}