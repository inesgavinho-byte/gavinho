// src/components/projeto/ChatMessages.jsx

import { User, Bot, Zap, Clock, Sparkles } from 'lucide-react'

export default function ChatMessages({ messages, isTyping = false }) {
  if (messages.length === 0 && !isTyping) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>
          <Sparkles size={24} />
        </div>
        <h3 style={styles.emptyTitle}>Assistente GAVINHO</h3>
        <p style={styles.emptyText}>Inicia a conversa com o assistente IA.</p>
        <div style={styles.suggestions}>
          <span style={styles.suggestionLabel}>Sugestões:</span>
          <div style={styles.suggestionChips}>
            <span style={styles.chip}>Resumo do projeto</span>
            <span style={styles.chip}>Fases pendentes</span>
            <span style={styles.chip}>Próximos passos</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {messages.map((msg, index) => (
        <div
          key={msg.id || index}
          className="animate-fade-in"
          style={{
            ...styles.message,
            ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage)
          }}
        >
          <div style={{
            ...styles.avatar,
            ...(msg.role === 'assistant' ? styles.assistantAvatar : {})
          }}>
            {msg.role === 'user' ? (
              <User size={16} />
            ) : (
              <Bot size={16} />
            )}
          </div>
          <div style={{
            ...styles.content,
            ...(msg.role === 'user' ? styles.userContent : {})
          }}>
            <div style={styles.header}>
              <span style={styles.role}>
                {msg.role === 'user' ? (msg.autor_nome || 'Tu') : 'Assistente GAVINHO'}
              </span>
              <span style={styles.time}>
                {new Date(msg.created_at).toLocaleTimeString('pt-PT', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {msg.id === 'temp-assistant' ? (
              <TypingIndicator />
            ) : (
              <div
                style={styles.text}
                dangerouslySetInnerHTML={{
                  __html: formatMessage(msg.conteudo)
                }}
              />
            )}
            {msg.tokens_output && (
              <TokenDisplay
                tokens={msg.tokens_output}
                inputTokens={msg.tokens_input}
                time={msg.tempo_resposta_ms}
              />
            )}
          </div>
        </div>
      ))}

      {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
        <div style={{ ...styles.message, ...styles.assistantMessage }} className="animate-fade-in">
          <div style={{ ...styles.avatar, ...styles.assistantAvatar }}>
            <Bot size={16} />
          </div>
          <div style={styles.content}>
            <TypingIndicator />
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de indicador de digitação
function TypingIndicator() {
  return (
    <div style={styles.typingContainer}>
      <div style={styles.typingDots}>
        <span style={{ ...styles.typingDot, animationDelay: '0ms' }} />
        <span style={{ ...styles.typingDot, animationDelay: '150ms' }} />
        <span style={{ ...styles.typingDot, animationDelay: '300ms' }} />
      </div>
      <span style={styles.typingText}>A pensar...</span>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}

// Componente de display de tokens/custo
function TokenDisplay({ tokens, inputTokens, time }) {
  // Estimativa de custo aproximado (Claude Sonnet: $3/1M input, $15/1M output)
  const inputCost = (inputTokens || 0) * 0.000003
  const outputCost = tokens * 0.000015
  const totalCost = inputCost + outputCost

  return (
    <div style={styles.tokenDisplay}>
      <div style={styles.tokenItem} title="Tokens de saída">
        <Zap size={10} />
        <span>{tokens.toLocaleString()} tokens</span>
      </div>
      <div style={styles.tokenItem} title="Tempo de resposta">
        <Clock size={10} />
        <span>{time < 1000 ? `${time}ms` : `${(time/1000).toFixed(1)}s`}</span>
      </div>
      {totalCost > 0.0001 && (
        <div style={styles.tokenCost} title="Custo estimado">
          ~€{totalCost.toFixed(4)}
        </div>
      )}
    </div>
  )
}

// Formatacao basica de Markdown
function formatMessage(text) {
  if (!text) return ''
  return text
    // Negrito
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italico
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Codigo inline
    .replace(/`(.*?)`/g, '<code style="background:#F5F3EF;padding:2px 4px;border-radius:3px;font-size:12px;">$1</code>')
    // Quebras de linha
    .replace(/\n/g, '<br/>')
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  // Empty state
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  emptyIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, var(--gold-light), var(--gold))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--white)',
    marginBottom: '8px',
  },
  emptyTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--brown)',
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: 'var(--brown-light)',
    maxWidth: '300px',
  },
  suggestions: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  suggestionLabel: {
    fontSize: '11px',
    color: 'var(--brown-light)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  suggestionChips: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px',
  },
  chip: {
    padding: '6px 12px',
    backgroundColor: 'var(--cream)',
    border: '1px solid var(--stone)',
    borderRadius: '16px',
    fontSize: '12px',
    color: 'var(--brown)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  // Messages
  message: {
    display: 'flex',
    gap: '12px',
    maxWidth: '85%',
  },
  userMessage: {
    marginLeft: 'auto',
    flexDirection: 'row-reverse',
  },
  assistantMessage: {
    marginRight: 'auto',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#F2F0E7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#5F5C59',
    flexShrink: 0,
  },
  assistantAvatar: {
    backgroundColor: '#8B8670',
    color: '#FFFFFF',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  userContent: {
    backgroundColor: '#F2F0E7',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
    gap: '12px',
  },
  role: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#1C1917',
  },
  time: {
    fontSize: '11px',
    color: '#9CA3AF',
  },
  text: {
    fontSize: '14px',
    color: '#1C1917',
    lineHeight: 1.5,
  },
  // Typing indicator
  typingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
  },
  typingDots: {
    display: 'flex',
    gap: '4px',
  },
  typingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#8B8670',
    animation: 'bounce 1.4s ease-in-out infinite',
    display: 'inline-block',
  },
  typingText: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // Token display
  tokenDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(0,0,0,0.05)',
  },
  tokenItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: '#9CA3AF',
  },
  tokenCost: {
    fontSize: '10px',
    color: '#8B8670',
    fontWeight: 500,
    marginLeft: 'auto',
    backgroundColor: 'rgba(139, 134, 112, 0.1)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
}
