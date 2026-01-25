// src/components/projeto/ChatInput.jsx

import { useState } from 'react'
import { Send, Paperclip } from 'lucide-react'

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value.trim() && !disabled) {
      onSend(value)
      setValue('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <button type="button" style={styles.attachButton} disabled>
        <Paperclip size={18} />
      </button>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={styles.textarea}
      />

      <button
        type="submit"
        disabled={disabled || !value.trim()}
        style={{
          ...styles.sendButton,
          ...(disabled || !value.trim() ? styles.sendButtonDisabled : {})
        }}
      >
        <Send size={18} />
      </button>
    </form>
  )
}

const styles = {
  form: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    backgroundColor: '#F5F3EF',
    borderRadius: '12px',
    padding: '8px 12px',
  },
  attachButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#9CA3AF',
  },
  textarea: {
    flex: 1,
    padding: '8px 0',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontSize: '14px',
    color: '#1C1917',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    maxHeight: '120px',
  },
  sendButton: {
    padding: '8px',
    backgroundColor: '#8B8670',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    cursor: 'not-allowed',
  },
}
