// =====================================================
// EQUIPA CARD
// Card com a equipa do projeto
// =====================================================

export default function EquipaCard({ equipaProjeto }) {
  return (
    <div className="card" style={{ gridColumn: 'span 2' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
        Equipa do Projeto
      </h3>

      {equipaProjeto.length === 0 ? (
        <p style={{
          fontSize: '13px',
          color: 'var(--brown-light)',
          textAlign: 'center',
          padding: '24px',
          background: 'var(--cream)',
          borderRadius: '12px'
        }}>
          Nenhum membro atribuído. Clique em Editar para adicionar membros.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {equipaProjeto.map((membro) => (
            <div
              key={membro.id}
              style={{
                padding: '16px',
                background: 'var(--cream)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '200px'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--brown)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600
              }}>
                {membro.utilizadores?.nome?.substring(0, 2).toUpperCase() || '??'}
              </div>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--brown)', fontSize: '14px' }}>
                  {membro.utilizadores?.nome || 'Sem nome'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                  {membro.funcao || membro.utilizadores?.cargo || 'Membro'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
