// =====================================================
// CREATE TASK MODAL
// Modal para criar tarefas a partir de mensagens
// =====================================================

import { CheckSquare, X } from 'lucide-react'

export default function CreateTaskModal({
  isOpen,
  onClose,
  message,
  onCreateTask
}) {
  if (!isOpen || !message) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    onCreateTask({
      titulo: formData.get('titulo'),
      descricao: formData.get('descricao'),
      prioridade: formData.get('prioridade'),
      prazo: formData.get('prazo'),
      mensagem_origem: message.id
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          padding: '24px',
          width: '480px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--brown)' }}>
            <CheckSquare size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Criar Tarefa
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Preview */}
        <div style={{
          padding: '12px',
          background: 'var(--cream)',
          borderRadius: '8px',
          borderLeft: '3px solid var(--accent-olive)',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
            Mensagem de {message.autor?.nome}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--brown)' }}>
            {message.conteudo?.substring(0, 150)}{message.conteudo?.length > 150 ? '...' : ''}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
              Título da tarefa
            </label>
            <input
              name="titulo"
              type="text"
              defaultValue={message.conteudo?.substring(0, 50)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
              Descrição
            </label>
            <textarea
              name="descricao"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                Prioridade
              </label>
              <select
                name="prioridade"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white'
                }}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
                Prazo
              </label>
              <input
                name="prazo"
                type="date"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--stone)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'var(--stone)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--brown)',
                fontWeight: 500
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'var(--accent-olive)',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                fontWeight: 500
              }}
            >
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
