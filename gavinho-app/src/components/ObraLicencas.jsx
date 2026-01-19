import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Shield, Plus, Edit, Trash2, AlertTriangle, Calendar, Clock, 
  CheckCircle2, XCircle, AlertCircle, FileText, Bell, X, ChevronDown
} from 'lucide-react'

// Tipos de licenças predefinidos
const TIPOS_LICENCA = [
  { id: 'ovp', nome: 'OVP - Ocupação da Via Pública', cor: '#3B82F6' },
  { id: 'alvara_construcao', nome: 'Alvará de Construção', cor: '#10B981' },
  { id: 'licenca_utilizacao', nome: 'Licença de Utilização', cor: '#8B5CF6' },
  { id: 'licenca_ruido', nome: 'Licença de Ruído', cor: '#F59E0B' },
  { id: 'licenca_andaimes', nome: 'Licença de Andaimes', cor: '#EF4444' },
  { id: 'licenca_grua', nome: 'Licença de Grua', cor: '#EC4899' },
  { id: 'seguro_obra', nome: 'Seguro de Obra', cor: '#06B6D4' },
  { id: 'outro', nome: 'Outro', cor: '#6B7280' }
]

// Calcular dias até expiração
const calcularDiasRestantes = (dataExpiracao) => {
  if (!dataExpiracao) return null
  const hoje = new Date()
  const expira = new Date(dataExpiracao)
  const diff = expira - hoje
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Status baseado nos dias restantes
const getStatusLicenca = (diasRestantes) => {
  if (diasRestantes === null) return { status: 'indefinida', cor: 'var(--brown-light)', label: 'Sem data' }
  if (diasRestantes < 0) return { status: 'expirada', cor: 'var(--error)', label: 'Expirada' }
  if (diasRestantes <= 30) return { status: 'urgente', cor: 'var(--error)', label: `${diasRestantes} dias` }
  if (diasRestantes <= 60) return { status: 'atencao', cor: 'var(--warning)', label: `${diasRestantes} dias` }
  return { status: 'ok', cor: 'var(--success)', label: `${diasRestantes} dias` }
}

export default function ObraLicencas({ obraId, obraCodigo }) {
  const [licencas, setLicencas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLicenca, setEditingLicenca] = useState(null)
  const [showTipoCustom, setShowTipoCustom] = useState(false)
  
  const [formData, setFormData] = useState({
    tipo: 'ovp',
    tipo_custom: '',
    numero: '',
    entidade_emissora: '',
    data_emissao: '',
    data_expiracao: '',
    valor: '',
    notas: '',
    documento_url: '',
    notificar_email: true,
    notificar_push: true,
    dias_antecedencia_alerta: 30
  })

  useEffect(() => {
    if (obraId) {
      loadLicencas()
    }
  }, [obraId])

  const loadLicencas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('obra_licencas')
        .select('*')
        .eq('obra_id', obraId)
        .order('data_expiracao', { ascending: true })
      
      if (error) throw error
      setLicencas(data || [])
    } catch (err) {
      console.error('Erro ao carregar licenças:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.tipo) return
    
    try {
      const tipoInfo = TIPOS_LICENCA.find(t => t.id === formData.tipo)
      const licencaData = {
        obra_id: obraId,
        tipo: formData.tipo,
        tipo_nome: formData.tipo === 'outro' ? formData.tipo_custom : tipoInfo?.nome,
        tipo_cor: tipoInfo?.cor || '#6B7280',
        numero: formData.numero || null,
        entidade_emissora: formData.entidade_emissora || null,
        data_emissao: formData.data_emissao || null,
        data_expiracao: formData.data_expiracao || null,
        valor: formData.valor ? parseFloat(formData.valor) : null,
        notas: formData.notas || null,
        documento_url: formData.documento_url || null,
        notificar_email: formData.notificar_email,
        notificar_push: formData.notificar_push,
        dias_antecedencia_alerta: formData.dias_antecedencia_alerta
      }
      
      if (editingLicenca) {
        const { error } = await supabase
          .from('obra_licencas')
          .update(licencaData)
          .eq('id', editingLicenca.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('obra_licencas')
          .insert(licencaData)
        if (error) throw error
        
        // Criar evento no calendário automaticamente
        if (formData.data_expiracao) {
          await supabase.from('calendario_eventos').insert({
            titulo: `${licencaData.tipo_nome} - Expiração`,
            descricao: `Licença ${licencaData.numero || ''} expira nesta data`,
            data_inicio: formData.data_expiracao,
            data_fim: formData.data_expiracao,
            tipo: 'licenca',
            cor: licencaData.tipo_cor,
            obra_id: obraId,
            referencia_tipo: 'obra_licenca',
            referencia_id: null, // será atualizado após obter o ID
            alerta_dias: formData.dias_antecedencia_alerta
          })
        }
      }
      
      await loadLicencas()
      handleCloseModal()
    } catch (err) {
      console.error('Erro ao guardar licença:', err)
      alert('Erro ao guardar: ' + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar esta licença?')) return
    
    try {
      const { error } = await supabase
        .from('obra_licencas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      await loadLicencas()
    } catch (err) {
      console.error('Erro ao eliminar:', err)
    }
  }

  const handleEdit = (licenca) => {
    setEditingLicenca(licenca)
    setFormData({
      tipo: licenca.tipo,
      tipo_custom: licenca.tipo === 'outro' ? licenca.tipo_nome : '',
      numero: licenca.numero || '',
      entidade_emissora: licenca.entidade_emissora || '',
      data_emissao: licenca.data_emissao || '',
      data_expiracao: licenca.data_expiracao || '',
      valor: licenca.valor || '',
      notas: licenca.notas || '',
      documento_url: licenca.documento_url || '',
      notificar_email: licenca.notificar_email ?? true,
      notificar_push: licenca.notificar_push ?? true,
      dias_antecedencia_alerta: licenca.dias_antecedencia_alerta || 30
    })
    setShowTipoCustom(licenca.tipo === 'outro')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingLicenca(null)
    setShowTipoCustom(false)
    setFormData({
      tipo: 'ovp',
      tipo_custom: '',
      numero: '',
      entidade_emissora: '',
      data_emissao: '',
      data_expiracao: '',
      valor: '',
      notas: '',
      documento_url: '',
      notificar_email: true,
      notificar_push: true,
      dias_antecedencia_alerta: 30
    })
  }

  // Licenças que precisam de atenção (próximas de expirar ou expiradas)
  const licencasUrgentes = licencas.filter(l => {
    const dias = calcularDiasRestantes(l.data_expiracao)
    return dias !== null && dias <= 30
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
            Licenças e Autorizações
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginTop: '4px' }}>
            Gestão de licenças, alvarás e documentos legais
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          Nova Licença
        </button>
      </div>

      {/* Alertas de licenças urgentes */}
      {licencasUrgentes.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--error)' }} />
            <span style={{ fontWeight: 600, color: 'var(--error)' }}>
              Atenção: {licencasUrgentes.length} licença(s) a expirar
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {licencasUrgentes.map(l => {
              const dias = calcularDiasRestantes(l.data_expiracao)
              const status = getStatusLicenca(dias)
              return (
                <div key={l.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'white',
                  padding: '10px 14px',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{l.tipo_nome}</span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 600, 
                    color: status.cor,
                    background: `${status.cor}15`,
                    padding: '4px 10px',
                    borderRadius: '6px'
                  }}>
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de licenças */}
      {licencas.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          background: 'var(--cream)', 
          borderRadius: '12px' 
        }}>
          <Shield size={48} style={{ color: 'var(--brown-light)', marginBottom: '16px', opacity: 0.4 }} />
          <p style={{ color: 'var(--brown-light)', marginBottom: '16px' }}>Sem licenças registadas</p>
          <button 
            onClick={() => setShowModal(true)}
            className="btn btn-secondary"
          >
            <Plus size={16} /> Adicionar Licença
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {licencas.map(licenca => {
            const diasRestantes = calcularDiasRestantes(licenca.data_expiracao)
            const status = getStatusLicenca(diasRestantes)
            
            return (
              <div 
                key={licenca.id} 
                className="card"
                style={{ 
                  borderLeft: `4px solid ${licenca.tipo_cor || 'var(--blush)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px'
                }}
              >
                {/* Àcone */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: `${licenca.tipo_cor}20` || 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Shield size={22} style={{ color: licenca.tipo_cor || 'var(--blush)' }} />
                </div>
                
                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--brown)' }}>
                      {licenca.tipo_nome}
                    </span>
                    {licenca.numero && (
                      <span style={{ fontSize: '12px', color: 'var(--brown-light)', background: 'var(--cream)', padding: '2px 8px', borderRadius: '4px' }}>
                        Nº {licenca.numero}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                    {licenca.entidade_emissora && (
                      <span>{licenca.entidade_emissora}</span>
                    )}
                    {licenca.data_emissao && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        Emitida: {new Date(licenca.data_emissao).toLocaleDateString('pt-PT')}
                      </span>
                    )}
                    {licenca.valor && (
                      <span style={{ fontWeight: 500 }}>
                        â‚¬{licenca.valor.toLocaleString('pt-PT')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Status de expiração */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  gap: '4px'
                }}>
                  {licenca.data_expiracao ? (
                    <>
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        color: status.cor,
                        background: `${status.cor}15`,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {status.status === 'expirada' && <XCircle size={12} />}
                        {status.status === 'urgente' && <AlertCircle size={12} />}
                        {status.status === 'ok' && <CheckCircle2 size={12} />}
                        {status.label}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                        Expira: {new Date(licenca.data_expiracao).toLocaleDateString('pt-PT')}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Sem data de expiração</span>
                  )}
                </div>
                
                {/* Notificações ativas */}
                {(licenca.notificar_email || licenca.notificar_push) && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: 'var(--info)',
                    fontSize: '11px'
                  }}>
                    <Bell size={12} />
                  </div>
                )}
                
                {/* Ações */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(licenca)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', padding: '6px' }}
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(licenca.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '6px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div 
            className="modal" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: '600px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Header Premium */}
            <div style={{
              background: 'linear-gradient(135deg, #5F5C59 0%, #4A4745 100%)',
              padding: '28px 32px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative element */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '120px',
                height: '120px',
                background: 'rgba(201, 168, 130, 0.1)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-30px',
                right: '60px',
                width: '80px',
                height: '80px',
                background: 'rgba(201, 168, 130, 0.08)',
                borderRadius: '50%'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'rgba(201, 168, 130, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(201, 168, 130, 0.3)'
                }}>
                  <Shield size={26} style={{ color: '#C9A882' }} />
                </div>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    color: '#ffffff',
                    fontSize: '22px',
                    fontWeight: 600,
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    letterSpacing: '0.5px'
                  }}>
                    {editingLicenca ? 'Editar Licença' : 'Nova Licença'}
                  </h3>
                  <p style={{ 
                    margin: '4px 0 0', 
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '13px'
                  }}>
                    {editingLicenca ? 'Atualizar dados da licença' : 'Registar nova licença ou autorização'}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={handleCloseModal} 
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Body */}
            <div style={{ 
              padding: '28px 32px',
              maxHeight: '60vh',
              overflowY: 'auto',
              background: '#FAFAF8'
            }}>
              {/* Secção: Identificação */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--stone)'
                }}>
                  <FileText size={14} style={{ color: 'var(--blush)' }} />
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: 'var(--brown)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Identificação
                  </span>
                </div>
                
                {/* Tipo como cards selecionáveis */}
                <label style={{ 
                  display: 'block',
                  fontSize: '12px', 
                  fontWeight: 500, 
                  color: 'var(--brown-light)',
                  marginBottom: '10px'
                }}>
                  Tipo de Licença *
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '10px',
                  marginBottom: '16px'
                }}>
                  {TIPOS_LICENCA.slice(0, 6).map(t => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setFormData({ ...formData, tipo: t.id })
                        setShowTipoCustom(t.id === 'outro')
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: formData.tipo === t.id 
                          ? `2px solid ${t.cor}` 
                          : '2px solid var(--stone)',
                        background: formData.tipo === t.id 
                          ? `${t.cor}10` 
                          : 'var(--white)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: t.cor
                      }} />
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: formData.tipo === t.id ? 600 : 400,
                        color: formData.tipo === t.id ? t.cor : 'var(--brown)'
                      }}>
                        {t.nome.replace('OVP - ', '').replace(' de ', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Mais tipos (dropdown) */}
                <div style={{ marginBottom: '16px' }}>
                  <select
                    value={formData.tipo}
                    onChange={(e) => {
                      setFormData({ ...formData, tipo: e.target.value })
                      setShowTipoCustom(e.target.value === 'outro')
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--stone)',
                      fontSize: '13px',
                      color: 'var(--brown)',
                      background: 'var(--white)',
                      cursor: 'pointer'
                    }}
                  >
                    {TIPOS_LICENCA.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                
                {showTipoCustom && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block',
                      fontSize: '12px', 
                      fontWeight: 500, 
                      color: 'var(--brown-light)',
                      marginBottom: '6px'
                    }}>
                      Nome da Licença Personalizada
                    </label>
                    <input
                      type="text"
                      value={formData.tipo_custom}
                      onChange={(e) => setFormData({ ...formData, tipo_custom: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--stone)',
                        fontSize: '13px'
                      }}
                      placeholder="Ex: Licença de Corte de Àrvores"
                    />
                  </div>
                )}
                
                {/* Número e Entidade */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ 
                      display: 'block',
                      fontSize: '12px', 
                      fontWeight: 500, 
                      color: 'var(--brown-light)',
                      marginBottom: '6px'
                    }}>
                      Número do Processo
                    </label>
                    <input
                      type="text"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--stone)',
                        fontSize: '13px'
                      }}
                      placeholder="Ex: e-EDI/OVP/2025/597"
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block',
                      fontSize: '12px', 
                      fontWeight: 500, 
                      color: 'var(--brown-light)',
                      marginBottom: '6px'
                    }}>
                      Entidade Emissora
                    </label>
                    <input
                      type="text"
                      value={formData.entidade_emissora}
                      onChange={(e) => setFormData({ ...formData, entidade_emissora: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--stone)',
                        fontSize: '13px'
                      }}
                      placeholder="Ex: CML"
                    />
                  </div>
                </div>
              </div>
              
              {/* Secção: Datas e Valor */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--stone)'
                }}>
                  <Calendar size={14} style={{ color: 'var(--blush)' }} />
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: 'var(--brown)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Datas & Valor
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ 
                      display: 'block',
                      fontSize: '12px', 
                      fontWeight: 500, 
                      color: 'var(--brown-light)',
                      marginBottom: '6px'
                    }}>
                      Data de Emissão
                    </label>
                    <input
                      type="date"
                      value={formData.data_emissao}
                      onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--stone)',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block',
                      fontSize: '12px', 
                      fontWeight: 500, 
                      color: 'var(--brown-light)',
                      marginBottom: '6px'
                    }}>
                      Data de Expiração
                    </label>
                    <input
                      type="date"
                      value={formData.data_expiracao}
                      onChange={(e) => setFormData({ ...formData, data_expiracao: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--stone)',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block',
                      fontSize: '12px', 
                      fontWeight: 500, 
                      color: 'var(--brown-light)',
                      marginBottom: '6px'
                    }}>
                      Valor (â‚¬)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--stone)',
                        fontSize: '13px'
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              
              {/* Secção: Notificações */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--stone)'
                }}>
                  <Bell size={14} style={{ color: 'var(--blush)' }} />
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: 'var(--brown)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Alertas
                  </span>
                </div>
                
                <div style={{ 
                  background: 'var(--white)', 
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid var(--stone)'
                }}>
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      cursor: 'pointer',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: formData.notificar_email ? 'rgba(201, 168, 130, 0.1)' : 'transparent',
                      border: formData.notificar_email ? '1px solid var(--blush)' : '1px solid var(--stone)',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.notificar_email}
                        onChange={(e) => setFormData({ ...formData, notificar_email: e.target.checked })}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: formData.notificar_email ? '2px solid var(--blush)' : '2px solid var(--stone)',
                        background: formData.notificar_email ? 'var(--blush)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {formData.notificar_email && (
                          <CheckCircle2 size={14} style={{ color: 'white' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>E-mail</div>
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Receber por email</div>
                      </div>
                    </label>
                    
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      cursor: 'pointer',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: formData.notificar_push ? 'rgba(201, 168, 130, 0.1)' : 'transparent',
                      border: formData.notificar_push ? '1px solid var(--blush)' : '1px solid var(--stone)',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="checkbox"
                        checked={formData.notificar_push}
                        onChange={(e) => setFormData({ ...formData, notificar_push: e.target.checked })}
                        style={{ display: 'none' }}
                      />
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: formData.notificar_push ? '2px solid var(--blush)' : '2px solid var(--stone)',
                        background: formData.notificar_push ? 'var(--blush)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {formData.notificar_push && (
                          <CheckCircle2 size={14} style={{ color: 'white' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>Push</div>
                        <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Notificação na app</div>
                      </div>
                    </label>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '12px 16px',
                    background: 'var(--cream)',
                    borderRadius: '8px'
                  }}>
                    <Clock size={16} style={{ color: 'var(--brown-light)' }} />
                    <span style={{ fontSize: '13px', color: 'var(--brown)' }}>Alertar</span>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={formData.dias_antecedencia_alerta}
                      onChange={(e) => setFormData({ ...formData, dias_antecedencia_alerta: parseInt(e.target.value) || 30 })}
                      style={{ 
                        width: '60px', 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        border: '1px solid var(--stone)', 
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'center',
                        background: 'var(--white)'
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--brown)' }}>dias antes da expiração</span>
                  </div>
                </div>
              </div>
              
              {/* Secção: Notas */}
              <div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--stone)'
                }}>
                  <FileText size={14} style={{ color: 'var(--blush)' }} />
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: 'var(--brown)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Observações
                  </span>
                </div>
                
                <textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--stone)',
                    fontSize: '13px',
                    resize: 'vertical',
                    minHeight: '80px',
                    background: 'var(--white)'
                  }}
                  rows={3}
                  placeholder="Referências de pagamento, contactos, etc..."
                />
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ 
              padding: '20px 32px',
              background: 'var(--white)',
              borderTop: '1px solid var(--stone)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button 
                onClick={handleCloseModal} 
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid var(--stone)',
                  background: 'var(--white)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--brown)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={!formData.tipo || (formData.tipo === 'outro' && !formData.tipo_custom)}
                style={{
                  padding: '12px 32px',
                  borderRadius: '10px',
                  border: 'none',
                  background: (!formData.tipo || (formData.tipo === 'outro' && !formData.tipo_custom)) 
                    ? 'var(--stone)' 
                    : 'linear-gradient(135deg, #C9A882 0%, #B89B75 100%)',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: (!formData.tipo || (formData.tipo === 'outro' && !formData.tipo_custom)) 
                    ? 'not-allowed' 
                    : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (!formData.tipo || (formData.tipo === 'outro' && !formData.tipo_custom)) 
                    ? 'none' 
                    : '0 4px 14px rgba(201, 168, 130, 0.4)'
                }}
              >
                {editingLicenca ? 'Guardar Alterações' : 'Criar Licença'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
