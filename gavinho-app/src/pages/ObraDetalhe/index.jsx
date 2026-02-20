import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useObraId } from '../../hooks/useObraId'
import { ArrowLeft, MapPin, Users, AlertTriangle, FileText, MessageSquare, Loader2 } from 'lucide-react'
import ObraChat from '../../components/ObraChat'
import ObraChecklist from '../../components/ObraChecklist'
import { useToast } from '../../components/ui/Toast'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { mainTabs, trackingSubtabs, acompanhamentoSubtabs, fiscalizacaoSubtabs, equipasSubtabs, colors } from './constants'
import TrackingTab from './TrackingTab'
import AcompanhamentoTab from './AcompanhamentoTab'
import FiscalizacaoTab from './FiscalizacaoTab'
import EquipasTab from './EquipasTab'
import DashboardTab from './DashboardTab'

export default function ObraDetalhe() {
  const { id, tab: urlTab } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })
  const { obraUuid, obra: resolvedObra, loading: resolving } = useObraId(id)

  // Estados principais
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeMainTab, setActiveMainTab] = useState('tracking')
  const [activeTrackingSubtab, setActiveTrackingSubtab] = useState('mqt')
  const [activeAcompanhamentoSubtab, setActiveAcompanhamentoSubtab] = useState('resumo')
  const [activeFiscalizacaoSubtab, setActiveFiscalizacaoSubtab] = useState('hso')
  const [activeEquipasSubtab, setActiveEquipasSubtab] = useState('equipa')
  const [checklistCount, setChecklistCount] = useState(0)
  const [currentUser, setCurrentUser] = useState(null)

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (resolvedObra) {
      setObra(resolvedObra)
      setLoading(false)
    } else if (!resolving && !resolvedObra) {
      setLoading(false)
    }
  }, [resolvedObra, resolving])

  useEffect(() => {
    if (obra?.id) fetchChecklistCount()
  }, [obra?.id])

  useEffect(() => {
    if (urlTab) {
      const isMainTab = mainTabs.some(t => t.id === urlTab)
      const isTrackingSubtab = trackingSubtabs.some(t => t.id === urlTab)
      if (isMainTab) {
        setActiveMainTab(urlTab)
      } else if (isTrackingSubtab) {
        setActiveMainTab('tracking')
        setActiveTrackingSubtab(urlTab)
      }
    }
  }, [urlTab])

  // ============================================
  // FUNÇÕES DE FETCH
  // ============================================

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile || { id: user.id, email: user.email, nome: user.email?.split('@')[0] })
    }
  }

  const fetchChecklistCount = async () => {
    try {
      const { count, error } = await supabase
        .from('checklist_items').select('*', { count: 'exact', head: true })
        .eq('obra_id', obra.id).eq('estado', 'aberto')
      if (error) { setChecklistCount(0); return }
      setChecklistCount(count || 0)
    } catch { setChecklistCount(0) }
  }

  // ============================================
  // NAVEGAÇÃO
  // ============================================

  const handleMainTabChange = (tabId) => {
    setActiveMainTab(tabId)
    navigate(`/obras/${id}/${tabId}`, { replace: true })
  }

  const handleTrackingSubtabChange = (subtabId) => {
    setActiveTrackingSubtab(subtabId)
    navigate(`/obras/${id}/${subtabId}`, { replace: true })
  }

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!obra) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <AlertTriangle size={48} style={{ color: colors.warning, marginBottom: '16px' }} />
        <h2>Obra não encontrada</h2>
        <button onClick={() => navigate('/obras')} className="btn btn-primary" style={{ marginTop: '16px' }}>
          Voltar às Obras
        </button>
      </div>
    )
  }

  const renderSubtabs = (subtabs, activeSubtab, setActiveSubtab, ariaLabel) => (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'flex', gap: '8px', padding: '16px 0', marginBottom: '20px',
        background: colors.white, borderBottom: `1px solid ${colors.border}`
      }}
    >
      {subtabs.map(subtab => (
        <button
          key={subtab.id}
          role="tab"
          aria-selected={activeSubtab === subtab.id}
          onClick={() => setActiveSubtab(subtab.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
            background: activeSubtab === subtab.id ? colors.primary : 'transparent',
            border: activeSubtab === subtab.id ? 'none' : `1px solid ${colors.border}`,
            borderRadius: '20px', cursor: 'pointer',
            color: activeSubtab === subtab.id ? colors.white : colors.textMuted,
            fontWeight: activeSubtab === subtab.id ? 600 : 400, fontSize: '13px', transition: 'all 0.2s'
          }}
        >
          <subtab.icon size={14} />
          {subtab.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/obras')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none',
            color: colors.textMuted, fontSize: '13px', cursor: 'pointer', marginBottom: '16px', padding: 0
          }}
        >
          <ArrowLeft size={16} />
          Voltar às Obras
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '13px', fontWeight: 700, color: colors.success, letterSpacing: '0.5px',
                fontFamily: 'monospace', background: '#EEF5EC', padding: '4px 10px', borderRadius: '6px'
              }}>
                {obra.codigo}
              </span>
              {obra.projetos?.codigo && (
                <button
                  onClick={() => navigate(`/projetos/${obra.projetos.codigo}`)}
                  aria-label={`Ver projeto ${obra.projetos.codigo}`}
                  style={{
                    cursor: 'pointer', background: colors.background, border: 'none',
                    padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: colors.text
                  }}
                >
                  {obra.projetos.codigo}
                </button>
              )}
              <span style={{
                padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                background: obra.status === 'em_curso' ? '#E8F5E915' : '#F5A62315',
                color: obra.status === 'em_curso' ? '#2E7D32' : '#D97706'
              }}>
                {obra.status === 'em_curso' ? 'Em Curso' : obra.status}
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px', color: colors.text }}>
              {obra.nome}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: colors.textMuted }}>
              {obra.localizacao && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={14} /> {obra.localizacao}
                </span>
              )}
              {obra.projetos?.cliente_nome && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} /> {obra.projetos.cliente_nome}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div
        role="tablist"
        aria-label="Separadores principais"
        style={{ display: 'flex', gap: '4px', marginBottom: '0', borderBottom: `1px solid ${colors.border}`, paddingBottom: '0' }}
      >
        {mainTabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeMainTab === tab.id}
            onClick={() => handleMainTabChange(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px',
              background: activeMainTab === tab.id ? colors.white : 'transparent',
              border: activeMainTab === tab.id ? `1px solid ${colors.border}` : '1px solid transparent',
              borderBottom: activeMainTab === tab.id ? `1px solid ${colors.white}` : '1px solid transparent',
              borderRadius: '8px 8px 0 0', marginBottom: '-1px', cursor: 'pointer',
              color: activeMainTab === tab.id ? colors.text : colors.textMuted,
              fontWeight: activeMainTab === tab.id ? 600 : 400, fontSize: '14px',
              transition: 'all 0.2s', position: 'relative'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.id === 'chat' && checklistCount > 0 && (
              <span style={{
                position: 'absolute', top: '6px', right: '8px', minWidth: '18px', height: '18px',
                padding: '0 5px', borderRadius: '9px', background: colors.warning, color: colors.white,
                fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {checklistCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tabs */}
      {activeMainTab === 'tracking' && renderSubtabs(trackingSubtabs, activeTrackingSubtab, handleTrackingSubtabChange, 'Sub-separadores tracking')}
      {activeMainTab === 'acompanhamento' && (
        <div
          role="tablist"
          aria-label="Sub-separadores acompanhamento"
          style={{
            display: 'flex', gap: '24px', padding: '0', marginBottom: '20px',
            borderBottom: `1px solid ${colors.border}`
          }}
        >
          {acompanhamentoSubtabs.map(subtab => {
            const isActive = activeAcompanhamentoSubtab === subtab.id
            return (
              <button
                key={subtab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveAcompanhamentoSubtab(subtab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 0',
                  background: 'none', border: 'none',
                  borderBottom: isActive ? '2px solid #2C2C2B' : '2px solid transparent',
                  cursor: 'pointer', marginBottom: '-1px',
                  color: isActive ? '#2C2C2B' : colors.textMuted,
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '14px',
                  fontFamily: "'Quattrocento Sans', sans-serif",
                  transition: 'all 0.2s'
                }}
              >
                {subtab.label}
              </button>
            )
          })}
        </div>
      )}
      {activeMainTab === 'fiscalizacao' && renderSubtabs(fiscalizacaoSubtabs, activeFiscalizacaoSubtab, setActiveFiscalizacaoSubtab, 'Sub-separadores fiscalização')}
      {activeMainTab === 'equipas' && renderSubtabs(equipasSubtabs, activeEquipasSubtab, setActiveEquipasSubtab, 'Sub-separadores equipas')}

      {/* Tab Content */}
      <div role="tabpanel" aria-label={`Conteúdo do separador ${activeMainTab}`} style={{ marginTop: activeMainTab === 'dashboard' || activeMainTab === 'projeto' ? '24px' : '0' }}>
        {activeMainTab === 'dashboard' && (
          <DashboardTab obra={obra} obraId={obra.id} />
        )}

        {activeMainTab === 'tracking' && (
          <TrackingTab
            obra={obra}
            activeSubtab={activeTrackingSubtab}
            onSubtabChange={handleTrackingSubtabChange}
            toast={toast}
            setConfirmModal={setConfirmModal}
          />
        )}

        {activeMainTab === 'acompanhamento' && (
          <AcompanhamentoTab
            obra={obra}
            obraId={obra.id}
            activeSubtab={activeAcompanhamentoSubtab}
            currentUser={currentUser}
          />
        )}

        {activeMainTab === 'fiscalizacao' && (
          <FiscalizacaoTab
            obraId={obra.id}
            activeSubtab={activeFiscalizacaoSubtab}
            currentUser={currentUser}
          />
        )}

        {activeMainTab === 'equipas' && (
          <EquipasTab
            obraId={obra.id}
            activeSubtab={activeEquipasSubtab}
          />
        )}

        {activeMainTab === 'projeto' && (
          <div style={{
            background: colors.white, borderRadius: '12px', padding: '48px',
            textAlign: 'center', border: `1px solid ${colors.border}`
          }}>
            <FileText size={48} style={{ color: colors.textMuted, opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', color: colors.text }}>Projeto de Execução</h3>
            <p style={{ color: colors.textMuted, marginBottom: '16px' }}>Funcionalidades previstas:</p>
            <div style={{ display: 'inline-block', textAlign: 'left', color: colors.textMuted, fontSize: '13px', lineHeight: '1.8' }}>
              • Peças desenhadas e plantas<br/>
              • Documentação técnica e cadernos de encargos<br/>
              • Controlo de revisões e versões<br/>
              • Distribuição de documentos à equipa
            </div>
          </div>
        )}

        {activeMainTab === 'chat' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
            <ObraChat obraId={obra.id} obraCodigo={obra.codigo} currentUser={currentUser} />
            <ObraChecklist obraId={obra.id} />
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  )
}
