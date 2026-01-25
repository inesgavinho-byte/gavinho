import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  FileText, Download, Eye, Search, Filter, ChevronDown, ChevronRight,
  Loader2, Shield, Calendar, User, FolderOpen
} from 'lucide-react'
import { FileTypeIcon, formatFileSize } from './deliveries'

export default function ObraProjetoExecucao({ obra }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState({})

  useEffect(() => {
    if (obra?.id || obra?.projeto_id) {
      fetchDocuments()
    }
  }, [obra?.id, obra?.projeto_id])

  const fetchDocuments = async () => {
    try {
      // Tentar usar a view primeiro
      const { data: viewData, error: viewError } = await supabase
        .from('obra_documentos_execucao')
        .select('*')
        .eq('obra_id', obra.id)

      if (!viewError && viewData) {
        setDocuments(viewData)
      } else {
        // Fallback: buscar diretamente da tabela
        const projetoId = obra.projeto_id || obra.id
        const { data, error } = await supabase
          .from('entrega_ficheiros')
          .select(`
            *,
            entregavel:projeto_entregaveis(
              id,
              codigo,
              nome,
              fase,
              categoria,
              escala
            )
          `)
          .eq('projeto_id', projetoId)
          .eq('aprovado_construcao', true)
          .eq('versao_atual', true)
          .order('aprovado_em', { ascending: false })

        if (!error && data) {
          // Transformar dados para formato esperado
          const transformedData = data.map(d => ({
            id: d.id,
            nome_ficheiro: d.nome_ficheiro,
            tipo_ficheiro: d.tipo_ficheiro,
            ficheiro_url: d.ficheiro_url,
            versao: d.versao,
            tamanho_bytes: d.tamanho_bytes,
            aprovado_em: d.aprovado_em,
            aprovado_por_nome: d.aprovado_por_nome,
            notas: d.notas,
            entregavel_codigo: d.entregavel?.codigo,
            entregavel_descricao: d.entregavel?.nome,
            escala: d.entregavel?.escala,
            fase: d.entregavel?.fase,
            categoria: d.entregavel?.categoria
          }))
          setDocuments(transformedData)
        }
      }
    } catch (err) {
      console.error('Erro ao carregar documentos:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar documentos pela pesquisa
  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      doc.nome_ficheiro?.toLowerCase().includes(search) ||
      doc.entregavel_codigo?.toLowerCase().includes(search) ||
      doc.entregavel_descricao?.toLowerCase().includes(search) ||
      doc.fase?.toLowerCase().includes(search)
    )
  })

  // Agrupar por fase/categoria
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    const fase = doc.fase || 'Sem Fase'
    if (!acc[fase]) acc[fase] = []
    acc[fase].push(doc)
    return acc
  }, {})

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        color: 'var(--brown-light)'
      }}>
        <Loader2 className="animate-spin" size={24} />
        <span style={{ marginLeft: '12px' }}>A carregar documentos...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--brown)',
              fontFamily: "'Cormorant Garamond', Georgia, serif"
            }}>
              Projeto em Execução
            </h3>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: 'var(--brown-light)'
            }}>
              Documentos aprovados para construção · {documents.length} ficheiros
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(122, 158, 122, 0.1)',
            borderRadius: '8px',
            color: 'var(--success)',
            fontSize: '13px'
          }}>
            <Shield size={16} />
            Bom para Construção
          </div>
        </div>

        {/* Search */}
        {documents.length > 0 && (
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--brown-light)'
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por código, nome ou fase..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid var(--stone)',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      {documents.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center',
          padding: '60px',
          color: 'var(--brown-light)'
        }}>
          <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ margin: '0 0 8px', fontSize: '15px', color: 'var(--brown)' }}>
            Nenhum documento aprovado para construção
          </p>
          <p style={{ margin: 0, fontSize: '13px' }}>
            Os documentos aparecem aqui quando marcados como "Bom para Construção" nos entregáveis do projeto.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(groupedDocuments).map(([fase, docs]) => (
            <div key={fase} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Fase Header */}
              <div
                onClick={() => toggleCategory(fase)}
                style={{
                  padding: '16px 20px',
                  background: 'linear-gradient(135deg, var(--success) 0%, rgba(122, 158, 122, 0.8) 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {expandedCategories[fase] !== false ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{fase}</h4>
                    <span style={{ fontSize: '11px', opacity: 0.9 }}>
                      {docs.length} documento{docs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Documents List */}
              {expandedCategories[fase] !== false && (
                <div style={{ padding: '12px' }}>
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '14px 16px',
                        background: 'var(--white)',
                        borderRadius: '8px',
                        border: '1px solid var(--stone)',
                        marginBottom: '8px'
                      }}
                    >
                      <FileTypeIcon type={doc.tipo_ficheiro} size={44} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px'
                        }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--brown-light)',
                            padding: '2px 8px',
                            background: 'var(--stone)',
                            borderRadius: '4px'
                          }}>
                            {doc.entregavel_codigo}
                          </span>
                          {doc.escala && (
                            <span style={{
                              fontSize: '10px',
                              color: 'var(--brown-light)'
                            }}>
                              {doc.escala}
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontWeight: 500,
                          color: 'var(--brown)',
                          display: 'block',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {doc.entregavel_descricao || doc.nome_ficheiro}
                        </span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '11px',
                          color: 'var(--brown-light)'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} />
                            {formatDate(doc.aprovado_em)}
                          </span>
                          {doc.aprovado_por_nome && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={11} />
                              {doc.aprovado_por_nome}
                            </span>
                          )}
                          <span>v{doc.versao}</span>
                          {doc.tamanho_bytes && (
                            <span>{formatFileSize(doc.tamanho_bytes)}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a
                          href={doc.ficheiro_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            background: 'var(--brown)',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '12px',
                            color: 'white',
                            fontWeight: 500
                          }}
                        >
                          <Eye size={14} />
                          Ver
                        </a>
                        <a
                          href={doc.ficheiro_url}
                          download
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            background: 'var(--stone)',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: 'var(--brown)'
                          }}
                          title="Download"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
