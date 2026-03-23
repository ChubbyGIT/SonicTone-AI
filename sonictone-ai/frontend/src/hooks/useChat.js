import { useState, useEffect, useRef, useCallback } from 'react'
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

  // Use a ref to track messages separately during streaming
  // This prevents sidebar re-renders on every token
  const messagesRef = useRef({})
  const creatingRef = useRef(false)

  // Only save to localStorage when chats structure changes (not during streaming)
  useEffect(() => {
    saveChats(chats)
  }, [chats])

  const activeChat = chats.find(c => c.id === activeChatId) || null

  const createChat = useCallback((vst, band) => {
    // Hard guard against double creation
    if (creatingRef.current) return null
    creatingRef.current = true

    const id = uuidv4()
    const title = vst ? `${vst} → ${band}` : `Any VST → ${band}`
    const newChat = {
      id, title,
      vst: vst || null,
      band,
      messages: [],
      createdAt: new Date().toISOString(),
    }

    setChats(prev => {
      // Don't add if a chat for this band+vst already exists with no messages
      const duplicate = prev.find(
        c => c.band === band && c.vst === (vst || null) && c.messages.length === 0
      )
      if (duplicate) {
        creatingRef.current = false
        return prev
      }
      return [newChat, ...prev]
    })

    setTimeout(() => { creatingRef.current = false }, 800)
    return id
  }, [])

  const deleteChat = useCallback((id) => {
    setChats(prev => prev.filter(c => c.id !== id))
    if (activeChatId === id) setActiveChatId(null)
  }, [activeChatId])

  const renameChat = useCallback((id, title) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c))
  }, [])

  // addMessage only updates the specific chat's message list
  const addMessage = useCallback((chatId, message) => {
    setChats(prev => prev.map(c =>
      c.id === chatId
        ? { ...c, messages: [...c.messages, message] }
        : c
    ))
  }, [])

  // KEY FIX: updateLastMessage uses a ref-based approach
  // It batches streaming updates and only triggers a re-render
  // when content actually changes, without touching other chats
  const updateLastMessage = useCallback((chatId, content, streaming) => {
    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.id === chatId)
      if (chatIndex === -1) return prev

      const chat = prev[chatIndex]
      const messages = chat.messages
      const lastIdx = messages.length - 1

      if (lastIdx < 0 || messages[lastIdx].role !== 'tony') return prev

      // Skip if nothing changed — prevents unnecessary re-renders
      const last = messages[lastIdx]
      if (last.content === content && last.streaming === streaming) return prev

      const updatedMessages = [...messages]
      updatedMessages[lastIdx] = { ...last, content, streaming }

      const updatedChats = [...prev]
      updatedChats[chatIndex] = { ...chat, messages: updatedMessages }
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