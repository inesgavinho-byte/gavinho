// =====================================================
// USE AI ASSISTANT HOOK
// Manages AI assistant state and functionality
// =====================================================

import { useState, useCallback } from 'react'

/**
 * Custom hook for AI Assistant functionality
 * @param {Object} options - Configuration options
 * @param {Object} options.channelInfo - Current channel information
 * @param {number} options.messageCount - Number of messages in current channel
 * @param {number} options.topicCount - Number of active topics
 * @param {string} options.lastActivityTime - Formatted last activity time
 * @returns {Object} AI assistant state and functions
 */
const useAIAssistant = (options = {}) => {
  const {
    channelInfo = null,
    messageCount = 0,
    topicCount = 0,
    lastActivityTime = ''
  } = options

  // ========== STATE ==========
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiMessages, setAiMessages] = useState([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // ========== HELPERS ==========
  const openAIAssistant = useCallback(() => {
    setShowAIAssistant(true)
  }, [])

  const closeAIAssistant = useCallback(() => {
    setShowAIAssistant(false)
  }, [])

  const toggleAIAssistant = useCallback(() => {
    setShowAIAssistant(prev => !prev)
  }, [])

  // ========== AI RESPONSE LOGIC ==========
  const getAIResponse = useCallback((query) => {
    const lowerQuery = query.toLowerCase()

    if (lowerQuery.includes('ajuda') || lowerQuery.includes('help')) {
      return 'Posso ajudar-te com:\n• Resumir conversas\n• Encontrar mensagens\n• Criar tarefas\n• Agendar reuniões\n• Responder a perguntas sobre projetos'
    }

    if (lowerQuery.includes('resumo') || lowerQuery.includes('resumir')) {
      const channelCode = channelInfo?.codigo || 'atual'
      return `📋 Resumo do canal ${channelCode}:\n\n• ${messageCount} mensagens no total\n• Tópicos ativos: ${topicCount}\n• Última atividade: ${lastActivityTime || 'N/A'}`
    }

    if (lowerQuery.includes('tarefa') || lowerQuery.includes('task')) {
      return 'Para criar uma tarefa a partir de uma mensagem, clica nos três pontos (⋯) da mensagem e seleciona "Criar tarefa".'
    }

    return 'Entendi! Posso ajudar-te com informações sobre este projeto, resumos de conversas, ou criar tarefas. O que precisas?'
  }, [channelInfo, messageCount, topicCount, lastActivityTime])

  // ========== SEND MESSAGE ==========
  const sendAIMessage = useCallback(async () => {
    if (!aiInput.trim()) return

    const userMessage = {
      role: 'user',
      content: aiInput,
      timestamp: new Date().toISOString()
    }

    const currentInput = aiInput
    setAiMessages(prev => [...prev, userMessage])
    setAiInput('')
    setAiLoading(true)

    // Simulate AI response (in production, would call AI API)
    setTimeout(() => {
      const aiResponse = {
        role: 'assistant',
        content: getAIResponse(currentInput),
        timestamp: new Date().toISOString()
      }
      setAiMessages(prev => [...prev, aiResponse])
      setAiLoading(false)
    }, 1000)
  }, [aiInput, getAIResponse])

  // ========== CLEAR MESSAGES ==========
  const clearAIMessages = useCallback(() => {
    setAiMessages([])
  }, [])

  return {
    // State
    showAIAssistant,
    aiMessages,
    aiInput,
    aiLoading,

    // State setters
    setAiInput,
    setAiMessages,

    // Actions
    sendAIMessage,
    getAIResponse,
    openAIAssistant,
    closeAIAssistant,
    toggleAIAssistant,
    clearAIMessages
  }
}

export default useAIAssistant
