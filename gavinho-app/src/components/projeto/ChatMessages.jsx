// src/components/projeto/ChatMessages.jsx

import { User, Bot } from 'lucide-react'

export default function ChatMessages({ messages }) {
  if (messages.length === 0) {
    return (
      <div style={styles.empty}>
        <Bot size={32} strokeWidth={1} />
        <p>Inicia a conversa com o assistente IA.</p>
        <p style={styles.hint}>
          Podes perguntar sobre o projecto, pedir ajuda com decisoes tecnicas,
          ou esclarecer duvidas de licenciamento.
        </p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {messages.map((msg, index) => (
        <div
          key={msg.id || index}
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
            <div
              style={styles.text}
              dangerouslySetInnerHTML={{
                __html: formatMessage(msg.conteudo)
              }}
            />
            {msg.tokens_output && (
              <div style={styles.meta}>
                {msg.tokens_output} tokens • {msg.tempo_resposta_ms}ms
              </div>
            )}
          </div>
        </div>
      ))}
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
  empty: {
    textAlign: 'center',
    color: '#78716C',
    padding: '40px 20px',
  },
  hint: {
    fontSize: '13px',
    maxWidth: '400px',
    margin: '0 auto',
  },
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
  meta: {
    fontSize: '10px',
    color: '#9CA3AF',
    marginTop: '8px',
  },
}
