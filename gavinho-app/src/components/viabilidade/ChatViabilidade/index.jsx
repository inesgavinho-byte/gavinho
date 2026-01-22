import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  Send,
  Loader,
  Bot,
  User,
  Play,
  AlertTriangle
} from 'lucide-react'

export default function ChatViabilidade({ analiseId, analise, onAnaliseComplete }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0 && analise) {
      setMessages([{
        role: 'assistant',
        content: `Olá! Sou o Assistente GAVINHO para análises de viabilidade urbanística.

Estou a ver a análise **${analise.codigo}** para o concelho de **${analise.concelho_nome || 'não especificado'}**.

Como posso ajudar? Pode:
- Fazer perguntas sobre a classificação do solo
- Esclarecer dúvidas sobre regimes e servidões
- Pedir ajuda para preencher os dados da análise
- Executar a análise automática quando estiver pronto

O que gostaria de saber?`
      }])
    }
  }, [analise])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('viabilidade-chat', {
        body: {
          analise_id: analiseId,
          message: userMessage,
          history: messages
        }
      })

      if (error) throw error

      // Add assistant response
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Erro no chat:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar a sua mensagem. Por favor, tente novamente.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async (modo = 'interno') => {
    setAnalyzing(true)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `A iniciar análise de viabilidade (modo ${modo === 'cliente' ? 'executivo' : 'técnico'})...`
    }])

    try {
      const { data, error } = await supabase.functions.invoke('analisar-viabilidade', {
        body: {
          analise_id: analiseId,
          modo: modo
        }
      })

      if (error) throw error

      const result = data.resultado
      let resultMessage = `**Análise Concluída**\n\n`
      resultMessage += `**Classificação:** ${getClassificacaoLabel(result.classificacao)}\n\n`
      resultMessage += `**Fundamentação:**\n${result.fundamentacao}\n\n`

      if (result.enquadramento_legal?.length > 0) {
        resultMessage += `**Enquadramento Legal:**\n`
        result.enquadramento_legal.forEach(item => {
          resultMessage += `- ${item}\n`
        })
        resultMessage += '\n'
      }

      if (result.condicionantes?.length > 0) {
        resultMessage += `**Condicionantes:**\n`
        result.condicionantes.forEach(item => {
          resultMessage += `- ${item}\n`
        })
        resultMessage += '\n'
      }

      if (result.recomendacoes?.length > 0) {
        resultMessage += `**Recomendações:**\n`
        result.recomendacoes.forEach(item => {
          resultMessage += `- ${item}\n`
        })
      }

      setMessages(prev => [...prev, { role: 'assistant', content: resultMessage }])

      // Notify parent component
      if (onAnaliseComplete) {
        onAnaliseComplete(result)
      }
    } catch (error) {
      console.error('Erro na análise:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Ocorreu um erro ao executar a análise. Por favor, verifique se os dados estão preenchidos corretamente e tente novamente.'
      }])
    } finally {
      setAnalyzing(false)
    }
  }

  const getClassificacaoLabel = (classificacao) => {
    switch (classificacao) {
      case 'viavel': return 'Viável'
      case 'viavel_condicionado': return 'Viável com Condicionantes'
      case 'inviavel': return 'Inviável'
      default: return classificacao
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Action Bar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        background: '#fafaf9'
      }}>
        <button
          onClick={() => runAnalysis('interno')}
          disabled={analyzing || loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: analyzing ? '#d6d3d1' : '#8B8670',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: analyzing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {analyzing ? <Loader size={16} className="spin" /> : <Play size={16} />}
          Executar Análise
        </button>

        <select
          onChange={(e) => e.target.value && runAnalysis(e.target.value)}
          disabled={analyzing || loading}
          value=""
          style={{
            padding: '8px 12px',
            border: '1px solid #d6d3d1',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            background: 'white'
          }}
        >
          <option value="">Modo de análise...</option>
          <option value="interno">Técnico (interno)</option>
          <option value="cliente">Executivo (cliente)</option>
        </select>

        {!analise?.dados_entrada?.solo?.tipo && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: 'auto',
            color: '#d97706',
            fontSize: '13px'
          }}>
            <AlertTriangle size={14} />
            <span>Dados incompletos</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: message.role === 'user' ? '#8B8670' : '#f5f5f4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {message.role === 'user' ? (
                <User size={16} color="white" />
              ) : (
                <Bot size={16} color="#8B8670" />
              )}
            </div>

            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: '12px',
              background: message.role === 'user' ? '#8B8670' : '#f5f5f4',
              color: message.role === 'user' ? 'white' : '#44403c',
              fontSize: '14px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {message.content.split('**').map((part, i) =>
                i % 2 === 0 ? part : <strong key={i}>{part}</strong>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f5f5f4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={16} color="#8B8670" />
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#f5f5f4',
              color: '#78716c',
              fontSize: '14px'
            }}>
              <Loader size={16} className="spin" style={{ display: 'inline-block' }} /> A processar...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e7e5e4',
        background: '#fafaf9'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva a sua pergunta..."
            disabled={loading || analyzing}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #d6d3d1',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              fontFamily: 'inherit'
            }}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading || analyzing}
            style={{
              padding: '12px',
              background: input.trim() && !loading && !analyzing ? '#8B8670' : '#d6d3d1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: input.trim() && !loading && !analyzing ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
