import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus,
  FileSearch,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronRight,
  FileText,
  Building2,
  MapPin,
  Calendar
} from 'lucide-react'
import { useToast } from '../ui/Toast'

// Badge de classificação
const ClassificacaoBadge = ({ classificacao, size = 'normal' }) => {
  const configs = {
    viavel: { bg: '#dcfce7', color: '#16a34a', label: 'Viável', icon: CheckCircle },
    viavel_condicionado: { bg: '#fef3c7', color: '#d97706', label: 'Viável Condicionado', icon: AlertTriangle },
    inviavel: { bg: '#fee2e2', color: '#dc2626', label: 'Inviável', icon: XCircle }
  }

  const config = configs[classificacao] || { bg: '#f5f5f4', color: '#78716c', label: 'Pendente', icon: Clock }
  const Icon = config.icon

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: size === 'small' ? '4px 8px' : '6px 12px',
      background: config.bg,
      color: config.color,
      borderRadius: '16px',
      fontSize: size === 'small' ? '11px' : '12px',
      fontWeight: 600
    }}>
      <Icon size={size === 'small' ? 12 : 14} />
      {config.label}
    </span>
  )
}

// Badge de estado
const EstadoBadge = ({ estado }) => {
  const configs = {
    rascunho: { bg: '#f5f5f4', color: '#78716c', label: 'Rascunho' },
    em_analise: { bg: '#dbeafe', color: '#2563eb', label: 'Em Análise' },
    validado: { bg: '#dcfce7', color: '#16a34a', label: 'Validado' },
    finalizado: { bg: '#8B8670', color: '#FFFFFF', label: 'Finalizado' }
  }

  const config = configs[estado] || configs.rascunho

  return (
    <span style={{
      padding: '4px 10px',
      background: config.bg,
      color: config.color,
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 500
    }}>
      {config.label}
    </span>
  )
}

export default function ViabilidadeModule({ projeto, onSelectAnalise }) {
  const { user } = useAuth()
  const toast = useToast()
  const [analises, setAnalises] = useState([])
  const [concelhos, setConcelhos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNovaAnalise, setShowNovaAnalise] = useState(false)
  const [novaAnaliseForm, setNovaAnaliseForm] = useState({
    concelho_id: '',
    localizacao: {
      morada: projeto?.localizacao || '',
      freguesia: '',
      artigo_matricial: '',
      descricao_predial: ''
    }
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [projeto?.id])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar análises do projeto
      if (projeto?.id) {
        const { data: analisesData } = await supabase
          .from('v_analises_completas')
          .select('*')
          .eq('projeto_id', projeto.id)
          .order('created_at', { ascending: false })

        setAnalises(analisesData || [])
      }

      // Carregar concelhos ativos
      const { data: concelhosData } = await supabase
        .from('concelhos')
        .select('*')
        .eq('activo', true)
        .order('nome')

      setConcelhos(concelhosData || [])
    } catch (error) {
      // Tables may not exist yet
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnalise = async () => {
    if (!novaAnaliseForm.concelho_id) {
      toast.warning('Aviso', 'Selecione um concelho')
      return
    }

    try {
      setCreating(true)

      const { data, error } = await supabase
        .from('analises_viabilidade')
        .insert({
          projeto_id: projeto.id,
          concelho_id: novaAnaliseForm.concelho_id,
          localizacao: novaAnaliseForm.localizacao,
          solo: {},
          regimes: {},
          preexistencia: {},
          operacao: {},
          created_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      setShowNovaAnalise(false)
      setNovaAnaliseForm({
        concelho_id: '',
        localizacao: {
          morada: projeto?.localizacao || '',
          freguesia: '',
          artigo_matricial: '',
          descricao_predial: ''
        }
      })

      // Abrir a análise criada
      if (onSelectAnalise) {
        onSelectAnalise(data)
      }

      loadData()
    } catch (error) {
      console.error('Erro ao criar análise:', error)
      toast.error('Erro', 'Erro ao criar análise')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#78716c' }}>
        A carregar...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            margin: '0 0 4px 0',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: 'Cormorant Garamond'
          }}>
            Análises de Viabilidade
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#78716c' }}>
            Análises urbanísticas para o projeto {projeto?.codigo}
          </p>
        </div>

        <button
          onClick={() => setShowNovaAnalise(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            background: '#8B8670',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          <Plus size={16} />
          Nova Análise
        </button>
      </div>

      {/* Lista de análises */}
      {analises.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center',
          border: '1px solid #e7e5e4'
        }}>
          <FileSearch size={48} style={{ color: '#d6d3d1', marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
            Sem análises de viabilidade
          </h3>
          <p style={{ margin: '0 0 20px 0', color: '#78716c', fontSize: '14px' }}>
            Crie uma análise para avaliar a viabilidade urbanística deste projeto.
          </p>
          <button
            onClick={() => setShowNovaAnalise(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: '#8B8670',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <Plus size={16} />
            Criar Primeira Análise
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {analises.map(analise => (
            <div
              key={analise.id}
              onClick={() => onSelectAnalise && onSelectAnalise(analise)}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e7e5e4',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ':hover': { borderColor: '#8B8670' }
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#8B8670'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e7e5e4'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      fontFamily: 'Cormorant Garamond'
                    }}>
                      {analise.codigo}
                    </span>
                    <EstadoBadge estado={analise.estado} />
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#78716c' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={14} />
                      {analise.concelho_nome}
                    </span>
                    {analise.localizacao?.morada && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} />
                        {analise.localizacao.morada}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      {new Date(analise.created_at).toLocaleDateString('pt-PT')}
                    </span>
                    {analise.total_versoes > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={14} />
                        {analise.total_versoes} versão(ões)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {analise.resultado?.classificacao && (
                    <ClassificacaoBadge classificacao={analise.resultado.classificacao} />
                  )}
                  <ChevronRight size={20} style={{ color: '#a8a29e' }} />
                </div>
              </div>

              {/* Resumo do resultado */}
              {analise.resultado?.condicionantes?.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f5f5f4',
                  fontSize: '12px',
                  color: '#78716c'
                }}>
                  <strong>Condicionantes:</strong> {analise.resultado.condicionantes.slice(0, 2).join('; ')}
                  {analise.resultado.condicionantes.length > 2 && ` (+${analise.resultado.condicionantes.length - 2})`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Análise */}
      {showNovaAnalise && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowNovaAnalise(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              margin: '20px',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e7e5e4',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Nova Análise de Viabilidade
              </h3>
              <button
                onClick={() => setShowNovaAnalise(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Seleção de Concelho */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#5F5C59',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Concelho *
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {concelhos.map(concelho => (
                    <button
                      key={concelho.id}
                      onClick={() => setNovaAnaliseForm(prev => ({
                        ...prev,
                        concelho_id: concelho.id
                      }))}
                      style={{
                        flex: '1 1 calc(50% - 6px)',
                        minWidth: '150px',
                        padding: '16px',
                        border: novaAnaliseForm.concelho_id === concelho.id
                          ? '2px solid #8B8670'
                          : '1px solid #e7e5e4',
                        borderRadius: '8px',
                        background: novaAnaliseForm.concelho_id === concelho.id
                          ? '#F2F0E7'
                          : 'white',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: 600,
                        marginBottom: '4px'
                      }}>
                        {concelho.nome}
                      </span>
                      {concelho.versao_pdm && (
                        <span style={{ fontSize: '12px', color: '#78716c' }}>
                          {concelho.versao_pdm}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Localização */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#5F5C59',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Morada
                </label>
                <input
                  type="text"
                  value={novaAnaliseForm.localizacao.morada}
                  onChange={(e) => setNovaAnaliseForm(prev => ({
                    ...prev,
                    localizacao: { ...prev.localizacao, morada: e.target.value }
                  }))}
                  placeholder="Morada do imóvel"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e7e5e4',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#5F5C59',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Freguesia
                  </label>
                  <input
                    type="text"
                    value={novaAnaliseForm.localizacao.freguesia}
                    onChange={(e) => setNovaAnaliseForm(prev => ({
                      ...prev,
                      localizacao: { ...prev.localizacao, freguesia: e.target.value }
                    }))}
                    placeholder="Freguesia"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e7e5e4',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: '#5F5C59',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Artigo Matricial
                  </label>
                  <input
                    type="text"
                    value={novaAnaliseForm.localizacao.artigo_matricial}
                    onChange={(e) => setNovaAnaliseForm(prev => ({
                      ...prev,
                      localizacao: { ...prev.localizacao, artigo_matricial: e.target.value }
                    }))}
                    placeholder="Ex: 1234"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e7e5e4',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Info */}
              <div style={{
                padding: '12px 16px',
                background: '#F2F0E7',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#5F5C59',
                marginBottom: '20px'
              }}>
                <strong>Nota:</strong> Após criar a análise, poderá preencher os dados detalhados
                sobre classificação do solo, regimes aplicáveis e operação pretendida.
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e7e5e4',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowNovaAnalise(false)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #e7e5e4',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAnalise}
                disabled={!novaAnaliseForm.concelho_id || creating}
                style={{
                  padding: '10px 20px',
                  background: novaAnaliseForm.concelho_id && !creating ? '#8B8670' : '#e7e5e4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: novaAnaliseForm.concelho_id && !creating ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                {creating ? 'A criar...' : 'Criar Análise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { ClassificacaoBadge, EstadoBadge }
