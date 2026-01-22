import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  ArrowLeft,
  ClipboardList,
  MessageSquare,
  FileSearch,
  FileText,
  Save,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Loader,
  Building2,
  MapPin,
  Leaf,
  Home,
  Briefcase
} from 'lucide-react'
import { ClassificacaoBadge, EstadoBadge } from './ViabilidadeModule'

// Categorias de solo
const CATEGORIAS_URBANO = [
  { value: 'espacos_centrais', label: 'Espaços Centrais' },
  { value: 'espacos_habitacionais', label: 'Espaços Habitacionais' },
  { value: 'espacos_baixa_densidade', label: 'Espaços de Baixa Densidade' },
  { value: 'espacos_atividades_economicas', label: 'Espaços de Atividades Económicas' }
]

const CATEGORIAS_RUSTICO = [
  { value: 'espacos_naturais', label: 'Espaços Naturais' },
  { value: 'espacos_florestais', label: 'Espaços Florestais' },
  { value: 'espacos_agricolas', label: 'Espaços Agrícolas' },
  { value: 'espacos_ocupacao_turistica', label: 'Espaços de Ocupação Turística' },
  { value: 'aglomerados_rurais', label: 'Aglomerados Rurais' }
]

const TIPOS_OPERACAO = [
  { value: 'construcao_nova', label: 'Construção Nova' },
  { value: 'ampliacao', label: 'Ampliação' },
  { value: 'legalizacao', label: 'Legalização' },
  { value: 'alteracao', label: 'Alteração' },
  { value: 'reconstrucao', label: 'Reconstrução' }
]

const TIPOS_USO = [
  { value: 'habitacao', label: 'Habitação' },
  { value: 'turismo', label: 'Turismo' },
  { value: 'atividades_economicas', label: 'Atividades Económicas' },
  { value: 'equipamentos', label: 'Equipamentos' }
]

export default function AnaliseDetalhe({ analiseId, onBack }) {
  const { user } = useAuth()
  const [analise, setAnalise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('dados')

  // Form state
  const [formData, setFormData] = useState({
    localizacao: {},
    solo: {},
    regimes: {},
    preexistencia: {},
    operacao: {}
  })

  useEffect(() => {
    if (analiseId) {
      loadAnalise()
    }
  }, [analiseId])

  const loadAnalise = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('v_analises_completas')
        .select('*')
        .eq('id', analiseId)
        .single()

      if (error) throw error

      setAnalise(data)
      setFormData({
        localizacao: data.localizacao || {},
        solo: data.solo || {},
        regimes: data.regimes || {},
        preexistencia: data.preexistencia || {},
        operacao: data.operacao || {}
      })
    } catch (error) {
      console.error('Erro ao carregar análise:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('analises_viabilidade')
        .update({
          localizacao: formData.localizacao,
          solo: formData.solo,
          regimes: formData.regimes,
          preexistencia: formData.preexistencia,
          operacao: formData.operacao,
          updated_at: new Date().toISOString()
        })
        .eq('id', analiseId)

      if (error) throw error

      await loadAnalise()
    } catch (error) {
      console.error('Erro ao guardar:', error)
      alert('Erro ao guardar alterações')
    } finally {
      setSaving(false)
    }
  }

  const updateFormData = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: '#8B8670' }} />
        <p style={{ marginTop: '16px', color: '#78716c' }}>A carregar análise...</p>
      </div>
    )
  }

  if (!analise) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p style={{ color: '#78716c' }}>Análise não encontrada</p>
        <button onClick={onBack} style={{ marginTop: '16px', color: '#8B8670', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Voltar
        </button>
      </div>
    )
  }

  const categorias = formData.solo.classificacao === 'urbano' ? CATEGORIAS_URBANO :
                     formData.solo.classificacao === 'rustico' ? CATEGORIAS_RUSTICO : []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: 'white',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#78716c',
              fontSize: '14px'
            }}
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, fontFamily: 'Cormorant Garamond' }}>
              {analise.codigo}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#78716c' }}>
              {analise.concelho_nome} · {analise.projeto_codigo || 'Sem projeto'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {analise.resultado?.classificacao && (
            <ClassificacaoBadge classificacao={analise.resultado.classificacao} />
          )}
          <EstadoBadge estado={analise.estado} />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#8B8670',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        padding: '0 24px',
        background: 'white',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex',
        gap: '24px'
      }}>
        {[
          { id: 'dados', label: 'Dados', icon: ClipboardList },
          { id: 'chat', label: 'Assistente IA', icon: MessageSquare },
          { id: 'resultado', label: 'Análise', icon: FileSearch },
          { id: 'relatorio', label: 'Relatório', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 0',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? '#8B8670' : '#78716c',
                borderBottom: activeTab === tab.id ? '2px solid #8B8670' : '2px solid transparent'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#EEEAE5' }}>
        {activeTab === 'dados' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Localização */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} />
                Localização
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Morada</label>
                  <input
                    type="text"
                    value={formData.localizacao.morada || ''}
                    onChange={(e) => updateFormData('localizacao', 'morada', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Freguesia</label>
                    <input
                      type="text"
                      value={formData.localizacao.freguesia || ''}
                      onChange={(e) => updateFormData('localizacao', 'freguesia', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Artigo Matricial</label>
                    <input
                      type="text"
                      value={formData.localizacao.artigo_matricial || ''}
                      onChange={(e) => updateFormData('localizacao', 'artigo_matricial', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Descrição Predial</label>
                  <textarea
                    value={formData.localizacao.descricao_predial || ''}
                    onChange={(e) => updateFormData('localizacao', 'descricao_predial', e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Solo */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} />
                Classificação do Solo
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#5F5C59' }}>Classificação</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['urbano', 'rustico'].map(tipo => (
                      <button
                        key={tipo}
                        onClick={() => {
                          updateFormData('solo', 'classificacao', tipo)
                          updateFormData('solo', 'categoria_espaco', '')
                        }}
                        style={{
                          flex: 1,
                          padding: '14px',
                          border: formData.solo.classificacao === tipo ? '2px solid #8B8670' : '1px solid #e7e5e4',
                          borderRadius: '8px',
                          background: formData.solo.classificacao === tipo ? '#F2F0E7' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ display: 'block', fontWeight: 600, fontSize: '14px' }}>
                          Solo {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.solo.classificacao && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Categoria de Espaço</label>
                    <select
                      value={formData.solo.categoria_espaco || ''}
                      onChange={(e) => updateFormData('solo', 'categoria_espaco', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                    >
                      <option value="">Selecione...</option>
                      {categorias.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.solo.categoria_espaco === 'espacos_naturais' && (
                  <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                    <strong>Atenção:</strong> Espaços Naturais têm edificabilidade muito restrita.
                  </div>
                )}
              </div>
            </div>

            {/* Regimes */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Leaf size={18} />
                Regimes e Condicionantes
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { key: 'ren', label: 'REN' },
                  { key: 'ran', label: 'RAN' },
                  { key: 'natura2000', label: 'Natura 2000' },
                  { key: 'pnsc', label: 'PNSC' },
                  { key: 'cheias', label: 'Zona de Cheias' },
                  { key: 'incendio', label: 'Risco de Incêndio' }
                ].map(regime => (
                  <label
                    key={regime.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      border: '1px solid #e7e5e4',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: formData.regimes[regime.key] ? '#fef3c7' : 'white'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.regimes[regime.key] || false}
                      onChange={(e) => updateFormData('regimes', regime.key, e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{regime.label}</span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f5f5f4' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#5F5C59' }}>Património</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { key: 'classificado', label: 'Imóvel Classificado' },
                    { key: 'inventariado', label: 'Imóvel Inventariado' },
                    { key: 'arqueologia', label: 'Zona Arqueológica' }
                  ].map(item => (
                    <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.regimes.patrimonio?.[item.key] || false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          regimes: {
                            ...prev.regimes,
                            patrimonio: {
                              ...prev.regimes.patrimonio,
                              [item.key]: e.target.checked
                            }
                          }
                        }))}
                        style={{ width: '16px', height: '16px' }}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Preexistência */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Home size={18} />
                Preexistência
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.preexistencia.existe || false}
                      onChange={(e) => updateFormData('preexistencia', 'existe', e.target.checked)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Existe edificação</span>
                  </label>

                  {formData.preexistencia.existe && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.preexistencia.valida || false}
                        onChange={(e) => updateFormData('preexistencia', 'valida', e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px' }}>Preexistência válida</span>
                    </label>
                  )}
                </div>

                {formData.preexistencia.existe && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Ano de Construção</label>
                      <input
                        type="number"
                        value={formData.preexistencia.ano_construcao || ''}
                        onChange={(e) => updateFormData('preexistencia', 'ano_construcao', parseInt(e.target.value) || null)}
                        placeholder="Ex: 1985"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Área Construção (m²)</label>
                      <input
                        type="number"
                        value={formData.preexistencia.area_construcao || ''}
                        onChange={(e) => updateFormData('preexistencia', 'area_construcao', parseFloat(e.target.value) || null)}
                        placeholder="Ex: 120"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Título/Licença</label>
                      <input
                        type="text"
                        value={formData.preexistencia.titulo || ''}
                        onChange={(e) => updateFormData('preexistencia', 'titulo', e.target.value)}
                        placeholder="Alvará, licença, etc."
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Operação */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', gridColumn: 'span 2' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} />
                Operação Pretendida
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Tipo de Operação</label>
                  <select
                    value={formData.operacao.tipo || ''}
                    onChange={(e) => updateFormData('operacao', 'tipo', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_OPERACAO.map(tipo => (
                      <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Uso Pretendido</label>
                  <select
                    value={formData.operacao.uso || ''}
                    onChange={(e) => updateFormData('operacao', 'uso', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_USO.map(uso => (
                      <option key={uso.value} value={uso.value}>{uso.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Área Pretendida (m²)</label>
                  <input
                    type="number"
                    value={formData.operacao.area_pretendida || ''}
                    onChange={(e) => updateFormData('operacao', 'area_pretendida', parseFloat(e.target.value) || null)}
                    placeholder="Ex: 250"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 3' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: '#5F5C59' }}>Programa / Descrição</label>
                  <textarea
                    value={formData.operacao.programa || ''}
                    onChange={(e) => updateFormData('operacao', 'programa', e.target.value)}
                    rows={3}
                    placeholder="Descreva brevemente o programa pretendido..."
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e7e5e4', borderRadius: '8px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <MessageSquare size={48} style={{ color: '#d6d3d1', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Assistente IA</h3>
            <p style={{ color: '#78716c', fontSize: '14px' }}>
              O chat conversacional com IA será implementado na próxima fase.
            </p>
          </div>
        )}

        {activeTab === 'resultado' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
            {analise.resultado ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Resultado da Análise</h3>
                  <ClassificacaoBadge classificacao={analise.resultado.classificacao} />
                </div>

                {analise.resultado.fundamentacao?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#5F5C59' }}>Fundamentação</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {analise.resultado.fundamentacao.map((f, i) => (
                        <li key={i} style={{ marginBottom: '8px', fontSize: '14px', color: '#44403c' }}>
                          {f.norma_aplicavel || f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analise.resultado.condicionantes?.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#5F5C59' }}>Condicionantes</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {analise.resultado.condicionantes.map((c, i) => (
                        <li key={i} style={{ marginBottom: '8px', fontSize: '14px', color: '#44403c' }}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analise.resultado.proximos_passos?.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#5F5C59' }}>Próximos Passos</h4>
                    <ol style={{ margin: 0, paddingLeft: '20px' }}>
                      {analise.resultado.proximos_passos.map((p, i) => (
                        <li key={i} style={{ marginBottom: '8px', fontSize: '14px', color: '#44403c' }}>{p}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <FileSearch size={48} style={{ color: '#d6d3d1', marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Sem análise executada</h3>
                <p style={{ color: '#78716c', fontSize: '14px', marginBottom: '20px' }}>
                  Preencha os dados e execute a análise com o assistente IA.
                </p>
                <button
                  onClick={() => setActiveTab('chat')}
                  style={{
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
                  Iniciar Análise
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'relatorio' && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <FileText size={48} style={{ color: '#d6d3d1', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600 }}>Geração de Relatório</h3>
            <p style={{ color: '#78716c', fontSize: '14px' }}>
              A geração de relatório DOCX será implementada na próxima fase.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
