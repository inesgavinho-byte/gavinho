// =====================================================
// PEDIR MATERIAIS COMPONENT
// Material request form with approval workflow
// Features: Recent/favorite materials dropdown
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { Package, Plus, Check, CheckCheck, AlertTriangle, Loader2, Clock, Star, ChevronDown } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { styles } from '../styles'
import { formatDateTime, MATERIAL_UNITS, REQUEST_STATUS_LABELS } from '../utils'

const STORAGE_KEY = 'obra_app_recent_materials'
const FAVORITES_KEY = 'obra_app_favorite_materials'

// Component-specific styles
const localStyles = {
  novaReqButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: '#3d4349',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  formCard: {
    background: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    fontWeight: 600,
    color: '#3d4349'
  },
  closeFormButton: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#999'
  },
  listSection: {
    marginTop: 8
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#666',
    marginBottom: 12
  },
  emptyList: {
    textAlign: 'center',
    padding: 32,
    color: '#888'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  reqCard: {
    background: 'white',
    borderRadius: 10,
    padding: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
  },
  reqHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8
  },
  reqMaterial: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontWeight: 600,
    color: '#333',
    fontSize: 14,
    flex: 1
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 12,
    whiteSpace: 'nowrap'
  },
  reqMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#888',
    marginBottom: 6
  },
  reqNotas: {
    fontSize: 13,
    color: '#666',
    background: '#f8f8f8',
    padding: '8px 10px',
    borderRadius: 6,
    margin: '8px 0 0 0'
  },
  aprovacao: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    padding: '6px 0',
    borderTop: '1px solid #f0f0f0'
  },
  // Material dropdown styles
  materialInputWrapper: {
    position: 'relative'
  },
  materialInput: {
    paddingRight: 36
  },
  dropdownToggle: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center'
  },
  materialDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 100,
    maxHeight: 250,
    overflow: 'auto',
    marginTop: 4
  },
  dropdownSection: {
    padding: '8px 0'
  },
  dropdownSectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.15s'
  },
  dropdownItemText: {
    flex: 1
  },
  dropdownItemUnit: {
    fontSize: 12,
    color: '#9ca3af'
  },
  starButton: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: '#d1d5db'
  },
  starButtonActive: {
    color: '#f59e0b'
  },
  dropdownEmpty: {
    padding: '16px 12px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13
  }
}

const getStatusInfo = (status) => {
  switch (status) {
    case 'pendente':
      return { text: 'Aguarda Encarregado', color: '#FF9800', bg: '#FFF3E0', icon: '⏳' }
    case 'aprovado':
      return { text: 'Aguarda Direção', color: '#2196F3', bg: '#E3F2FD', icon: '✓' }
    case 'validado':
      return { text: 'Validado', color: '#4CAF50', bg: '#E8F5E9', icon: '✓✓' }
    case 'rejeitado':
      return { text: 'Rejeitado', color: '#F44336', bg: '#FFEBEE', icon: '✕' }
    case 'entregue':
      return { text: 'Entregue', color: '#9C27B0', bg: '#F3E5F5', icon: '📦' }
    default:
      return { text: status, color: '#666', bg: '#f5f5f5', icon: '?' }
  }
}

export default function PedirMateriais({ obra, user }) {
  const [material, setMaterial] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [unidade, setUnidade] = useState('un')
  const [urgente, setUrgente] = useState(false)
  const [notas, setNotas] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [requisicoes, setRequisicoes] = useState([])
  const [loadingReqs, setLoadingReqs] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [recentMaterials, setRecentMaterials] = useState([])
  const [favoriteMaterials, setFavoriteMaterials] = useState([])
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)

  const materialInputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Load recent and favorite materials from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${user?.id}`)
      if (saved) setRecentMaterials(JSON.parse(saved))

      const favorites = localStorage.getItem(`${FAVORITES_KEY}_${user?.id}`)
      if (favorites) setFavoriteMaterials(JSON.parse(favorites))
    } catch (err) {
      console.error('Error loading materials:', err)
    }
  }, [user?.id])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          materialInputRef.current && !materialInputRef.current.contains(e.target)) {
        setShowMaterialDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Save recent material
  const saveRecentMaterial = (materialName, unit) => {
    const item = { name: materialName, unit, usedAt: new Date().toISOString() }
    const updated = [item, ...recentMaterials.filter(m => m.name !== materialName)].slice(0, 10)
    setRecentMaterials(updated)
    try {
      localStorage.setItem(`${STORAGE_KEY}_${user?.id}`, JSON.stringify(updated))
    } catch (err) {
      console.error('Error saving recent material:', err)
    }
  }

  // Toggle favorite material
  const toggleFavorite = (materialName) => {
    const isFavorite = favoriteMaterials.includes(materialName)
    const updated = isFavorite
      ? favoriteMaterials.filter(m => m !== materialName)
      : [...favoriteMaterials, materialName]

    setFavoriteMaterials(updated)
    try {
      localStorage.setItem(`${FAVORITES_KEY}_${user?.id}`, JSON.stringify(updated))
    } catch (err) {
      console.error('Error saving favorites:', err)
    }
  }

  // Select material from dropdown
  const selectMaterial = (item) => {
    setMaterial(item.name)
    if (item.unit) setUnidade(item.unit)
    setShowMaterialDropdown(false)
    // Focus on quantity after selecting material
    setTimeout(() => {
      const qtyInput = document.querySelector('input[type="number"]')
      if (qtyInput) qtyInput.focus()
    }, 100)
  }

  useEffect(() => {
    loadRequisicoes()
  }, [obra, user])

  const loadRequisicoes = async () => {
    setLoadingReqs(true)
    try {
      const { data } = await supabase
        .from('requisicoes_materiais')
        .select('*')
        .eq('obra_id', obra.id)
        .order('data_pedido', { ascending: false })
        .limit(20)

      setRequisicoes(data || [])
    } catch (err) {
      console.error('Erro ao carregar requisições:', err)
    } finally {
      setLoadingReqs(false)
    }
  }

  const handleSubmit = async () => {
    if (!material.trim() || !quantidade) return

    setSending(true)
    try {
      // Save to requisitions table
      const { error } = await supabase.from('requisicoes_materiais').insert({
        obra_id: obra.id,
        pedido_por_id: user.id,
        pedido_por_nome: user.nome,
        pedido_por_tipo: user.tipo || 'trabalhador',
        material: material.trim(),
        quantidade: parseFloat(quantidade),
        unidade,
        notas: notas || null,
        urgente,
        status: 'pendente'
      })

      if (error) throw error

      // Save to recent materials
      saveRecentMaterial(material.trim(), unidade)

      // Send notification in chat
      await supabase.from('obra_mensagens').insert({
        obra_id: obra.id,
        autor_id: user.id,
        autor_nome: user.nome,
        conteudo: `📦 REQUISIÇÃO DE MATERIAL${urgente ? ' (URGENTE)' : ''}\n${quantidade} ${unidade} de ${material}${notas ? `\nNotas: ${notas}` : ''}\n\n⏳ Aguarda aprovação do Encarregado`,
        tipo: 'requisicao_material'
      })

      setSuccess(true)
      setMaterial('')
      setQuantidade('')
      setNotas('')
      setUrgente(false)
      setShowForm(false)
      loadRequisicoes()

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao enviar requisição:', err)
      alert('Erro ao enviar requisição: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={styles.formContainer}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ ...styles.formTitle, marginBottom: 0 }}>
          <Package size={24} /> Materiais
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={localStyles.novaReqButton}
          >
            <Plus size={18} />
            Nova Requisição
          </button>
        )}
      </div>

      {success && (
        <div style={styles.successMessage}>
          <Check size={20} /> Requisição enviada! Aguarda aprovação.
        </div>
      )}

      {/* New request form */}
      {showForm && (
        <div style={localStyles.formCard}>
          <div style={localStyles.formHeader}>
            <span>Nova Requisição de Material</span>
            <button onClick={() => setShowForm(false)} style={localStyles.closeFormButton}>✕</button>
          </div>

          <div style={styles.formField}>
            <label>Material *</label>
            <div style={localStyles.materialInputWrapper}>
              <input
                ref={materialInputRef}
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                onFocus={() => setShowMaterialDropdown(true)}
                placeholder="Ex: Cimento Portland"
                style={{ ...styles.formInput, ...localStyles.materialInput }}
                autoComplete="off"
              />
              <button
                type="button"
                style={localStyles.dropdownToggle}
                onClick={() => setShowMaterialDropdown(!showMaterialDropdown)}
              >
                <ChevronDown size={18} style={{ transform: showMaterialDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {/* Materials dropdown */}
              {showMaterialDropdown && (
                <div ref={dropdownRef} style={localStyles.materialDropdown}>
                  {/* Favorites section */}
                  {favoriteMaterials.length > 0 && (
                    <div style={localStyles.dropdownSection}>
                      <div style={localStyles.dropdownSectionTitle}>
                        <Star size={12} /> Favoritos
                      </div>
                      {favoriteMaterials.map(name => {
                        const recentItem = recentMaterials.find(m => m.name === name)
                        return (
                          <div
                            key={`fav_${name}`}
                            style={localStyles.dropdownItem}
                            onClick={() => selectMaterial({ name, unit: recentItem?.unit })}
                          >
                            <Star size={14} style={{ color: '#f59e0b' }} />
                            <span style={localStyles.dropdownItemText}>{name}</span>
                            {recentItem?.unit && (
                              <span style={localStyles.dropdownItemUnit}>{recentItem.unit}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Recent section */}
                  {recentMaterials.length > 0 && (
                    <div style={{
                      ...localStyles.dropdownSection,
                      borderTop: favoriteMaterials.length > 0 ? '1px solid #f3f4f6' : 'none'
                    }}>
                      <div style={localStyles.dropdownSectionTitle}>
                        <Clock size={12} /> Recentes
                      </div>
                      {recentMaterials.filter(m => !favoriteMaterials.includes(m.name)).map(item => (
                        <div
                          key={`recent_${item.name}`}
                          style={localStyles.dropdownItem}
                        >
                          <Clock size={14} style={{ color: '#9ca3af' }} />
                          <span
                            style={localStyles.dropdownItemText}
                            onClick={() => selectMaterial(item)}
                          >
                            {item.name}
                          </span>
                          <span style={localStyles.dropdownItemUnit}>{item.unit}</span>
                          <button
                            type="button"
                            style={{
                              ...localStyles.starButton,
                              ...(favoriteMaterials.includes(item.name) ? localStyles.starButtonActive : {})
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(item.name)
                            }}
                          >
                            <Star size={14} fill={favoriteMaterials.includes(item.name) ? '#f59e0b' : 'none'} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {recentMaterials.length === 0 && favoriteMaterials.length === 0 && (
                    <div style={localStyles.dropdownEmpty}>
                      Sem materiais recentes.<br />
                      Os teus pedidos ficarão guardados aqui.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={{ ...styles.formField, flex: 1 }}>
              <label>Quantidade *</label>
              <input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="0"
                min="0"
                style={styles.formInput}
              />
            </div>
            <div style={{ ...styles.formField, width: 100 }}>
              <label>Unidade</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                style={styles.formInput}
              >
                {MATERIAL_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.value}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formField}>
            <label>Notas adicionais</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Especificações, marca preferida..."
              style={{ ...styles.formInput, minHeight: 60 }}
            />
          </div>

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={urgente}
              onChange={(e) => setUrgente(e.target.checked)}
            />
            <AlertTriangle size={16} style={{ color: urgente ? '#F44336' : '#999' }} />
            <span>Urgente</span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={sending || !material.trim() || !quantidade}
            style={styles.submitButton}
          >
            {sending ? 'A enviar...' : 'Enviar Requisição'}
          </button>
        </div>
      )}

      {/* Requests list */}
      <div style={localStyles.listSection}>
        <h3 style={localStyles.listTitle}>Requisições da Obra</h3>

        {loadingReqs ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : requisicoes.length === 0 ? (
          <div style={localStyles.emptyList}>
            <Package size={40} style={{ opacity: 0.3 }} />
            <p>Ainda não há requisições</p>
          </div>
        ) : (
          <div style={localStyles.list}>
            {requisicoes.map(req => {
              const statusInfo = getStatusInfo(req.status)
              return (
                <div key={req.id} style={localStyles.reqCard}>
                  <div style={localStyles.reqHeader}>
                    <span style={localStyles.reqMaterial}>
                      {req.urgente && <AlertTriangle size={14} style={{ color: '#F44336' }} />}
                      {req.quantidade} {req.unidade} - {req.material}
                    </span>
                    <span style={{
                      ...localStyles.statusBadge,
                      color: statusInfo.color,
                      background: statusInfo.bg
                    }}>
                      {statusInfo.icon} {statusInfo.text}
                    </span>
                  </div>

                  <div style={localStyles.reqMeta}>
                    <span>Pedido por: <strong>{req.pedido_por_nome}</strong></span>
                    <span>{formatDate(req.data_pedido)}</span>
                  </div>

                  {req.notas && (
                    <p style={localStyles.reqNotas}>{req.notas}</p>
                  )}

                  {/* Approvals */}
                  {req.aprovado_por_nome && (
                    <div style={localStyles.aprovacao}>
                      <Check size={14} style={{ color: '#4CAF50' }} />
                      Aprovado por: <strong>{req.aprovado_por_nome}</strong> - Encarregado
                    </div>
                  )}

                  {req.validado_por_nome && (
                    <div style={localStyles.aprovacao}>
                      <CheckCheck size={14} style={{ color: '#2196F3' }} />
                      Validado por: <strong>{req.validado_por_nome}</strong> - Direção Operação
                    </div>
                  )}

                  {req.status === 'rejeitado' && req.motivo_rejeicao && (
                    <div style={{ ...localStyles.aprovacao, color: '#F44336' }}>
                      Motivo: {req.motivo_rejeicao}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
