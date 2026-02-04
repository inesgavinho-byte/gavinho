import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Package, Search, Filter, Check, CheckCheck, X, Truck,
  Building2, AlertTriangle, Loader2, Calendar, User,
  ChevronDown, ChevronUp, Clock, Download
} from 'lucide-react'

export default function Requisicoes() {
  const { profile } = useAuth()
  const [requisicoes, setRequisicoes] = useState([])
  const [obras, setObras] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroUrgente, setFiltroUrgente] = useState(false)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [selectedReq, setSelectedReq] = useState(null)
  const [modalNotas, setModalNotas] = useState('')

  // Stats
  const [stats, setStats] = useState({
    pendentes: 0,
    aprovadas: 0,
    validadas: 0,
    rejeitadas: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadRequisicoes()
  }, [filtroStatus, filtroObra, filtroUrgente])

  const loadData = async () => {
    try {
      const { data: obrasData } = await supabase
        .from('obras')
        .select('id, codigo, nome')
        .order('codigo', { ascending: false })

      setObras(obrasData || [])
    } catch (err) {
      console.error('Erro ao carregar obras:', err)
    }
  }

  const loadRequisicoes = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('requisicoes_materiais')
        .select(`
          *,
          obras(id, codigo, nome)
        `)
        .order('data_pedido', { ascending: false })

      if (filtroStatus) {
        query = query.eq('status', filtroStatus)
      }

      if (filtroObra) {
        query = query.eq('obra_id', filtroObra)
      }

      if (filtroUrgente) {
        query = query.eq('urgente', true)
      }

      const { data, error } = await query

      if (error) throw error

      setRequisicoes(data || [])

      // Calcular stats
      const allReqs = data || []
      setStats({
        pendentes: allReqs.filter(r => r.status === 'pendente').length,
        aprovadas: allReqs.filter(r => r.status === 'aprovado').length,
        validadas: allReqs.filter(r => r.status === 'validado').length,
        rejeitadas: allReqs.filter(r => r.status === 'rejeitado').length
      })
    } catch (err) {
      console.error('Erro ao carregar requisições:', err)
    } finally {
      setLoading(false)
    }
  }

  const openActionModal = (req, action) => {
    setSelectedReq(req)
    setModalAction(action)
    setModalNotas('')
    setShowModal(true)
  }

  const handleAction = async () => {
    if (!selectedReq || !modalAction) return

    setActionLoading(selectedReq.id)
    try {
      const now = new Date().toISOString()
      let updateData = {}

      switch (modalAction) {
        case 'aprovar':
          updateData = {
            status: 'aprovado',
            aprovado_por_id: profile?.id,
            aprovado_por_nome: 'Edgard Borges',
            data_aprovacao: now,
            notas_aprovacao: modalNotas || null
          }
          break

        case 'validar':
          updateData = {
            status: 'validado',
            validado_por_id: profile?.id,
            validado_por_nome: 'João Umbelino',
            data_validacao: now,
            notas_validacao: modalNotas || null
          }
          break

        case 'rejeitar':
          updateData = {
            status: 'rejeitado',
            rejeitado_por_id: profile?.id,
            rejeitado_por_nome: profile?.nome || 'Utilizador',
            data_rejeicao: now,
            motivo_rejeicao: modalNotas || 'Sem motivo especificado'
          }
          break

        case 'entregar':
          updateData = {
            status: 'entregue',
            data_entrega: now,
            entregue_por: profile?.nome || 'Utilizador'
          }
          break
      }

      const { error } = await supabase
        .from('requisicoes_materiais')
        .update(updateData)
        .eq('id', selectedReq.id)

      if (error) throw error

      // Notificar no chat da obra
      let mensagem = ''
      switch (modalAction) {
        case 'aprovar':
          mensagem = `✅ Requisição APROVADA pelo Encarregado\n📦 ${selectedReq.quantidade} ${selectedReq.unidade} de ${selectedReq.material}\nAprovado por: Edgard Borges`
          break
        case 'validar':
          mensagem = `✓✓ Requisição VALIDADA pela Direção\n📦 ${selectedReq.quantidade} ${selectedReq.unidade} de ${selectedReq.material}\nValidado por: João Umbelino - Direção Operação`
          break
        case 'rejeitar':
          mensagem = `❌ Requisição REJEITADA\n📦 ${selectedReq.quantidade} ${selectedReq.unidade} de ${selectedReq.material}\nMotivo: ${modalNotas || 'Não especificado'}`
          break
        case 'entregar':
          mensagem = `📦 Material ENTREGUE\n${selectedReq.quantidade} ${selectedReq.unidade} de ${selectedReq.material}`
          break
      }

      if (mensagem) {
        await supabase.from('obra_mensagens').insert({
          obra_id: selectedReq.obra_id,
          autor_id: profile?.id,
          autor_nome: profile?.nome || 'Sistema',
          conteudo: mensagem,
          tipo: 'requisicao_update'
        })
      }

      setShowModal(false)
      loadRequisicoes()
    } catch (err) {
      console.error('Erro na ação:', err)
      alert('Erro ao processar ação')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pendente':
        return { text: 'Aguarda Encarregado', color: '#FF9800', bg: '#FFF3E0' }
      case 'aprovado':
        return { text: 'Aguarda Direção', color: '#2196F3', bg: '#E3F2FD' }
      case 'validado':
        return { text: 'Validado', color: '#4CAF50', bg: '#E8F5E9' }
      case 'rejeitado':
        return { text: 'Rejeitado', color: '#F44336', bg: '#FFEBEE' }
      case 'entregue':
        return { text: 'Entregue', color: '#9C27B0', bg: '#F3E5F5' }
      default:
        return { text: status, color: '#666', bg: '#f5f5f5' }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportCSV = () => {
    const headers = ['Data', 'Obra', 'Material', 'Qtd', 'Unidade', 'Pedido por', 'Status', 'Aprovado por', 'Validado por']
    const rows = requisicoes.map(r => [
      formatDate(r.data_pedido),
      r.obras?.codigo || '',
      r.material,
      r.quantidade,
      r.unidade,
      r.pedido_por_nome,
      r.status,
      r.aprovado_por_nome || '',
      r.validado_por_nome || ''
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `requisicoes_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Package size={28} style={{ color: 'var(--brown)' }} />
            Requisições de Materiais
          </h1>
          <p style={styles.subtitle}>Aprovar e gerir pedidos de materiais das obras</p>
        </div>
        <button onClick={exportCSV} style={styles.exportButton}>
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div
          style={{ ...styles.statCard, cursor: 'pointer', border: filtroStatus === 'pendente' ? '2px solid #FF9800' : '1px solid var(--stone)' }}
          onClick={() => setFiltroStatus(filtroStatus === 'pendente' ? '' : 'pendente')}
        >
          <div style={{ ...styles.statIcon, background: '#FFF3E0' }}>
            <Clock size={24} style={{ color: '#FF9800' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.pendentes}</div>
            <div style={styles.statLabel}>Pendentes</div>
          </div>
        </div>
        <div
          style={{ ...styles.statCard, cursor: 'pointer', border: filtroStatus === 'aprovado' ? '2px solid #2196F3' : '1px solid var(--stone)' }}
          onClick={() => setFiltroStatus(filtroStatus === 'aprovado' ? '' : 'aprovado')}
        >
          <div style={{ ...styles.statIcon, background: '#E3F2FD' }}>
            <Check size={24} style={{ color: '#2196F3' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.aprovadas}</div>
            <div style={styles.statLabel}>Aguardam Validação</div>
          </div>
        </div>
        <div
          style={{ ...styles.statCard, cursor: 'pointer', border: filtroStatus === 'validado' ? '2px solid #4CAF50' : '1px solid var(--stone)' }}
          onClick={() => setFiltroStatus(filtroStatus === 'validado' ? '' : 'validado')}
        >
          <div style={{ ...styles.statIcon, background: '#E8F5E9' }}>
            <CheckCheck size={24} style={{ color: '#4CAF50' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.validadas}</div>
            <div style={styles.statLabel}>Validadas</div>
          </div>
        </div>
        <div
          style={{ ...styles.statCard, cursor: 'pointer', border: filtroStatus === 'rejeitado' ? '2px solid #F44336' : '1px solid var(--stone)' }}
          onClick={() => setFiltroStatus(filtroStatus === 'rejeitado' ? '' : 'rejeitado')}
        >
          <div style={{ ...styles.statIcon, background: '#FFEBEE' }}>
            <X size={24} style={{ color: '#F44336' }} />
          </div>
          <div>
            <div style={styles.statValue}>{stats.rejeitadas}</div>
            <div style={styles.statLabel}>Rejeitadas</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={styles.filtersCard}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Obra</label>
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">Todas as obras</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovadas</option>
              <option value="validado">Validadas</option>
              <option value="rejeitado">Rejeitadas</option>
              <option value="entregue">Entregues</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>&nbsp;</label>
            <label style={styles.checkboxFilter}>
              <input
                type="checkbox"
                checked={filtroUrgente}
                onChange={(e) => setFiltroUrgente(e.target.checked)}
              />
              <AlertTriangle size={16} style={{ color: filtroUrgente ? '#F44336' : '#999' }} />
              Apenas urgentes
            </label>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div style={styles.listCard}>
        {loading ? (
          <div style={styles.loadingState}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--brown-light)' }} />
          </div>
        ) : requisicoes.length === 0 ? (
          <div style={styles.emptyState}>
            <Package size={48} style={{ color: 'var(--stone)', marginBottom: 12 }} />
            <p style={{ color: 'var(--brown-light)', margin: 0 }}>Nenhuma requisição encontrada</p>
          </div>
        ) : (
          requisicoes.map(req => {
            const statusInfo = getStatusInfo(req.status)
            return (
              <div key={req.id} style={styles.reqCard}>
                <div style={styles.reqHeader}>
                  <div style={styles.reqInfo}>
                    <div style={styles.reqMaterial}>
                      {req.urgente && <AlertTriangle size={16} style={{ color: '#F44336' }} />}
                      <strong>{req.quantidade} {req.unidade}</strong> - {req.material}
                    </div>
                    <div style={styles.reqMeta}>
                      <span style={styles.metaItem}>
                        <Building2 size={14} />
                        {req.obras?.codigo}
                      </span>
                      <span style={styles.metaItem}>
                        <User size={14} />
                        {req.pedido_por_nome}
                      </span>
                      <span style={styles.metaItem}>
                        <Calendar size={14} />
                        {formatDate(req.data_pedido)}
                      </span>
                    </div>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    color: statusInfo.color,
                    background: statusInfo.bg
                  }}>
                    {statusInfo.text}
                  </span>
                </div>

                {req.notas && (
                  <p style={styles.reqNotas}>📝 {req.notas}</p>
                )}

                {/* Workflow info */}
                <div style={styles.workflowInfo}>
                  <div style={styles.workflowStep}>
                    <span style={styles.workflowLabel}>Pedido por:</span>
                    <span>{req.pedido_por_nome}</span>
                  </div>
                  {req.aprovado_por_nome && (
                    <div style={styles.workflowStep}>
                      <span style={styles.workflowLabel}>Aprovado por:</span>
                      <span><strong>{req.aprovado_por_nome}</strong> - Encarregado</span>
                    </div>
                  )}
                  {req.validado_por_nome && (
                    <div style={styles.workflowStep}>
                      <span style={styles.workflowLabel}>Validado por:</span>
                      <span><strong>{req.validado_por_nome}</strong> - Direção Operação</span>
                    </div>
                  )}
                  {req.status === 'rejeitado' && (
                    <div style={{ ...styles.workflowStep, color: '#F44336' }}>
                      <span style={styles.workflowLabel}>Rejeitado:</span>
                      <span>{req.motivo_rejeicao || 'Sem motivo'}</span>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div style={styles.reqActions}>
                  {req.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => openActionModal(req, 'aprovar')}
                        style={styles.approveButton}
                        disabled={actionLoading === req.id}
                      >
                        <Check size={16} />
                        Aprovar (Encarregado)
                      </button>
                      <button
                        onClick={() => openActionModal(req, 'rejeitar')}
                        style={styles.rejectButton}
                        disabled={actionLoading === req.id}
                      >
                        <X size={16} />
                        Rejeitar
                      </button>
                    </>
                  )}
                  {req.status === 'aprovado' && (
                    <>
                      <button
                        onClick={() => openActionModal(req, 'validar')}
                        style={styles.validateButton}
                        disabled={actionLoading === req.id}
                      >
                        <CheckCheck size={16} />
                        Validar (Direção)
                      </button>
                      <button
                        onClick={() => openActionModal(req, 'rejeitar')}
                        style={styles.rejectButton}
                        disabled={actionLoading === req.id}
                      >
                        <X size={16} />
                        Rejeitar
                      </button>
                    </>
                  )}
                  {req.status === 'validado' && (
                    <button
                      onClick={() => openActionModal(req, 'entregar')}
                      style={styles.deliverButton}
                      disabled={actionLoading === req.id}
                    >
                      <Truck size={16} />
                      Marcar como Entregue
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Ação */}
      {showModal && selectedReq && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalAction === 'aprovar' && 'Aprovar Requisição'}
                {modalAction === 'validar' && 'Validar Requisição'}
                {modalAction === 'rejeitar' && 'Rejeitar Requisição'}
                {modalAction === 'entregar' && 'Confirmar Entrega'}
              </h2>
              <button onClick={() => setShowModal(false)} style={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalReqInfo}>
                <strong>{selectedReq.quantidade} {selectedReq.unidade}</strong> de <strong>{selectedReq.material}</strong>
                <br />
                <span style={{ color: '#666', fontSize: 13 }}>
                  Obra: {selectedReq.obras?.codigo} | Pedido por: {selectedReq.pedido_por_nome}
                </span>
              </div>

              {modalAction === 'aprovar' && (
                <div style={styles.modalInfo}>
                  <p>Ao aprovar, a requisição será enviada para validação da Direção de Operação.</p>
                  <p><strong>Aprovado por: Edgard Borges - Encarregado</strong></p>
                </div>
              )}

              {modalAction === 'validar' && (
                <div style={styles.modalInfo}>
                  <p>Ao validar, a requisição será marcada como pronta para entrega.</p>
                  <p><strong>Validado por: João Umbelino - Direção Operação</strong></p>
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>
                  {modalAction === 'rejeitar' ? 'Motivo da rejeição *' : 'Notas (opcional)'}
                </label>
                <textarea
                  value={modalNotas}
                  onChange={(e) => setModalNotas(e.target.value)}
                  placeholder={modalAction === 'rejeitar' ? 'Explique o motivo da rejeição...' : 'Adicione notas se necessário...'}
                  style={styles.textarea}
                  rows={3}
                />
              </div>
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setShowModal(false)} style={styles.cancelButton}>
                Cancelar
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading || (modalAction === 'rejeitar' && !modalNotas.trim())}
                style={{
                  ...styles.confirmButton,
                  background: modalAction === 'rejeitar' ? '#F44336' :
                             modalAction === 'aprovar' ? '#FF9800' :
                             modalAction === 'validar' ? '#4CAF50' : '#9C27B0'
                }}
              >
                {actionLoading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    {modalAction === 'aprovar' && <><Check size={16} /> Aprovar</>}
                    {modalAction === 'validar' && <><CheckCheck size={16} /> Validar</>}
                    {modalAction === 'rejeitar' && <><X size={16} /> Rejeitar</>}
                    {modalAction === 'entregar' && <><Truck size={16} /> Confirmar Entrega</>}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--brown)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: 0
  },
  subtitle: {
    color: 'var(--brown-light)',
    marginTop: 4,
    marginBottom: 0,
    fontSize: 14
  },
  exportButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    background: 'var(--brown)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24
  },
  statCard: {
    background: 'var(--white)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s'
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--brown)'
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--brown-light)'
  },
  filtersCard: {
    background: 'var(--white)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--brown)'
  },
  filterInput: {
    padding: '10px 12px',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: 'white'
  },
  checkboxFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13
  },
  listCard: {
    background: 'var(--white)',
    borderRadius: 16,
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--stone)',
    overflow: 'hidden'
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48
  },
  emptyState: {
    padding: 48,
    textAlign: 'center'
  },
  reqCard: {
    padding: 20,
    borderBottom: '1px solid var(--stone)'
  },
  reqHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12
  },
  reqInfo: {
    flex: 1
  },
  reqMaterial: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 16,
    color: 'var(--brown)',
    marginBottom: 6
  },
  reqMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    fontSize: 13,
    color: 'var(--brown-light)'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 16,
    whiteSpace: 'nowrap'
  },
  reqNotas: {
    fontSize: 13,
    color: '#666',
    background: 'var(--cream)',
    padding: '10px 12px',
    borderRadius: 8,
    margin: '0 0 12px 0'
  },
  workflowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 16,
    padding: '12px',
    background: '#f9f9f9',
    borderRadius: 8,
    fontSize: 13
  },
  workflowStep: {
    display: 'flex',
    gap: 8
  },
  workflowLabel: {
    color: 'var(--brown-light)',
    minWidth: 100
  },
  reqActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap'
  },
  approveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#FF9800',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  validateButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  rejectButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'transparent',
    color: '#F44336',
    border: '2px solid #F44336',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  deliverButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: '#9C27B0',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16
  },
  modal: {
    background: 'var(--white)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    padding: 20,
    borderBottom: '1px solid var(--stone)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--brown)',
    margin: 0
  },
  closeButton: {
    padding: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--brown-light)'
  },
  modalBody: {
    padding: 20
  },
  modalReqInfo: {
    padding: 16,
    background: 'var(--cream)',
    borderRadius: 10,
    marginBottom: 16
  },
  modalInfo: {
    padding: 12,
    background: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
    color: '#1976D2'
  },
  field: {
    marginBottom: 16
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--brown)',
    marginBottom: 6
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical'
  },
  modalActions: {
    padding: 20,
    borderTop: '1px solid var(--stone)',
    display: 'flex',
    gap: 12
  },
  cancelButton: {
    flex: 1,
    padding: '12px 20px',
    background: 'transparent',
    border: '2px solid var(--stone)',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--brown)'
  },
  confirmButton: {
    flex: 1,
    padding: '12px 20px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  }
}
