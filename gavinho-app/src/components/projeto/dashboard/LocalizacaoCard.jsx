// =====================================================
// LOCALIZACAO CARD
// Card com localização e áreas do projeto
// =====================================================

export default function LocalizacaoCard({ project }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', marginBottom: '16px' }}>
        Localização
      </h3>

      <div style={{
        padding: '16px',
        background: 'var(--cream)',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brown)', marginBottom: '8px' }}>
          {project.localizacao?.morada || project.morada || '—'}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
          {[project.localizacao?.codigo_postal, project.localizacao?.cidade || project.cidade].filter(Boolean).join(' ')}
          {project.localizacao?.estado && `, ${project.localizacao.estado}`}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
          {project.localizacao?.pais || project.pais || 'Portugal'}
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: '12px' }}>
        <div style={{ padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
            Área Bruta
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
            {project.area_bruta} {project.unidade_area}
          </div>
        </div>
        <div style={{ padding: '12px', background: 'var(--cream)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--brown-light)', marginBottom: '4px' }}>
            Área Exterior
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>
            {project.area_exterior} {project.unidade_area}
          </div>
        </div>
      </div>
    </div>
  )
}
