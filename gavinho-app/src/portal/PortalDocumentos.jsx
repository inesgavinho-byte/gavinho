import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePortal } from './PortalLayout'
import { Loader2, FolderOpen, FileText, Image, File, Download, ExternalLink } from 'lucide-react'

const CATEGORIAS = {
  projecto: { label: 'Projecto', icon: FileText, color: '#3B82F6' },
  render: { label: 'Renders / 3D', icon: Image, color: '#8B5CF6' },
  proposta: { label: 'Propostas', icon: File, color: '#F59E0B' },
  contrato: { label: 'Contratos', icon: FileText, color: '#10B981' },
  especificacao: { label: 'Especificações', icon: File, color: '#EC4899' },
  outro: { label: 'Outros', icon: File, color: '#8B8670' },
}

export default function PortalDocumentos() {
  const { config, t } = usePortal()
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState('todas')

  useEffect(() => {
    loadDocumentos()
  }, [config])

  const loadDocumentos = async () => {
    if (!config?.projeto_id) { setLoading(false); return }

    try {
      const { data, error } = await supabase
        .from('portal_documentos')
        .select('*')
        .eq('projeto_id', config.projeto_id)
        .order('categoria')
        .order('ordem')
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') { setLoading(false); return }
        throw error
      }

      setDocumentos(data || [])
    } catch (err) {
      console.error('Documents error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filtroCategoria === 'todas'
    ? documentos
    : documentos.filter(d => d.categoria === filtroCategoria)

  // Group by category
  const grouped = filtered.reduce((acc, doc) => {
    const cat = doc.categoria || 'outro'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(doc)
    return acc
  }, {})

  const availableCats = [...new Set(documentos.map(d => d.categoria || 'outro'))]

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#ADAA96' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={S.h1}>{t('documents')}</h1>
        <p style={{ fontSize: '14px', color: '#8B8670', marginTop: '4px' }}>
          {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'}
        </p>
      </div>

      {/* Category Filter */}
      {availableCats.length > 1 && (
        <div style={S.filters}>
          <button
            onClick={() => setFiltroCategoria('todas')}
            style={{
              ...S.filterBtn,
              background: filtroCategoria === 'todas' ? '#2D2B28' : '#FFFFFF',
              color: filtroCategoria === 'todas' ? '#FFFFFF' : '#8B8670',
            }}
          >
            Todas
          </button>
          {availableCats.map(cat => {
            const info = CATEGORIAS[cat] || CATEGORIAS.outro
            return (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                style={{
                  ...S.filterBtn,
                  background: filtroCategoria === cat ? '#2D2B28' : '#FFFFFF',
                  color: filtroCategoria === cat ? '#FFFFFF' : '#8B8670',
                }}
              >
                {info.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Documents */}
      {Object.keys(grouped).length === 0 ? (
        <div style={S.empty}>
          <FolderOpen size={32} style={{ color: '#D4D1C7', marginBottom: '12px' }} />
          <p style={{ color: '#8B8670', fontSize: '14px' }}>Ainda não existem documentos partilhados.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, docs]) => {
          const info = CATEGORIAS[cat] || CATEGORIAS.outro
          const Icon = info.icon

          return (
            <div key={cat} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Icon size={16} style={{ color: info.color }} />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#2D2B28' }}>{info.label}</span>
                <span style={{ fontSize: '12px', color: '#ADAA96' }}>({docs.length})</span>
              </div>
              <div style={S.docList}>
                {docs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.ficheiro_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={S.docRow}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#2D2B28' }}>
                        {doc.titulo}
                        {doc.versao && <span style={{ fontSize: '11px', color: '#ADAA96', marginLeft: '8px' }}>v{doc.versao}</span>}
                      </div>
                      {doc.descricao && (
                        <div style={{ fontSize: '12px', color: '#8B8670', marginTop: '2px' }}>{doc.descricao}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ADAA96', flexShrink: 0 }}>
                      {doc.ficheiro_tipo && (
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>
                          {doc.ficheiro_tipo}
                        </span>
                      )}
                      <ExternalLink size={14} />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )
        })
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const S = {
  h1: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '28px',
    fontWeight: 500,
    color: '#2D2B28',
    margin: 0,
  },
  filters: {
    display: 'flex',
    gap: '6px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '6px 14px',
    border: '1px solid #E8E6DF',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Quattrocento Sans', sans-serif",
    transition: 'all 0.2s',
  },
  docList: {
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E6DF',
    overflow: 'hidden',
  },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    borderBottom: '1px solid #F0EDE6',
    textDecoration: 'none',
    transition: 'background 0.15s',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E8E6DF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
}
