// =====================================================
// EQUIPA MODAL
// Modal para adicionar membros à equipa do projeto
// =====================================================

import { X } from 'lucide-react'

export default function EquipaModal({
  isOpen,
  onClose,
  utilizadores,
  equipaProjeto,
  onAddMembro
}) {
  if (!isOpen) return null

  const availableUsers = utilizadores.filter(u => !equipaProjeto.some(e => e.utilizador_id === u.id))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          margin: '20px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--stone)'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Adicionar Membro</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Lista de utilizadores */}
        <div style={{ padding: '16px 24px' }}>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '16px' }}>
            Selecione um colaborador para adicionar à equipa do projeto
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableUsers.map(u => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: 'var(--cream)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--brown)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    {u.nome?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{u.nome}</div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                      {u.cargo || 'Sem cargo'} • {u.departamento || 'Sem departamento'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const funcao = prompt('Função no projeto:', u.cargo || 'Membro')
                    if (funcao !== null) {
                      onAddMembro(u.id, funcao || 'Membro')
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--brown)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Adicionar
                </button>
              </div>
            ))}

            {availableUsers.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--brown-light)', padding: '24px' }}>
                Todos os colaboradores já estão na equipa
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
