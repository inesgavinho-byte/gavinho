import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PortalToggle from '../PortalToggle'

const TIPO_OPTIONS = [
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'material', label: 'Material', icon: '🪨' },
  { value: 'tecnico', label: 'Técnico', icon: '⚙️' },
  { value: 'financeiro', label: 'Financeiro', icon: '💰' },
  { value: 'prazo', label: 'Prazo', icon: '📅' },
  { value: 'fornecedor', label: 'Fornecedor', icon: '🏭' },
  { value: 'alteracao', label: 'Alteração', icon: '🔄' }
]

const IMPACTO_OPTIONS = [
  { value: 'critico', label: 'Crítico', color: '#EF4444' },
  { value: 'alto', label: 'Alto', color: '#F59E0B' },
  { value: 'medio', label: 'Médio', color: '#8B8670' },
  { value: 'baixo', label: 'Baixo', color: '#9CA3AF' }
]

const INITIAL_FORM = {
  titulo: '', descricao: '', tipo: 'design', impacto: 'medio',
  decidido_por: '', decidido_por_tipo: 'cliente',
  data_decisao: new Date().toISOString().split('T')[0],
  impacto_orcamento: '', impacto_prazo_dias: '', divisao: '',
  justificacao: '', categoria_orcamento: '', tags: [], alternativas: [],
  publicar_no_portal: false, requer_resposta_cliente: false, prazo_resposta_cliente: ''
}

export default function DecisaoForm({ projetoId, decisao, onClose, onSave }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [newTag, setNewTag] = useState('')

  const isEditing = !!decisao?.id

  useEffect(() => {
    if (decisao) {
      setForm({
        titulo: decisao.titulo || '', descricao: decisao.descricao || '',
        tipo: decisao.tipo || 'design', impacto: decisao.impacto || 'medio',
        decidido_por: decisao.decidido_por || '',
        decidido_por_tipo: decisao.decidido_por_tipo || 'cliente',
        data_decisao: decisao.data_decisao || new Date().toISOString().split('T')[0],
        impacto_orcamento: decisao.impacto_orcamento || '',
        impacto_prazo_dias: decisao.impacto_prazo_dias || '',
        divisao: decisao.divisao || '', justificacao: decisao.justificacao || '',
        categoria_orcamento: decisao.categoria_orcamento || '',
        tags: decisao.tags || [], alternativas: decisao.alternativas_consideradas || [],
        publicar_no_portal: decisao.publicar_no_portal || false,
        requer_resposta_cliente: decisao.requer_resposta_cliente || false,
        prazo_resposta_cliente: decisao.prazo_resposta_cliente || ''
      })
    }
  }, [decisao])

  const validate = () => {
    const newErrors = {}
    if (!form.titulo.trim()) newErrors.titulo = 'Título é obrigatório'
    if (!form.descricao.trim()) newErrors.descricao = 'Descrição é obrigatória'
    if (!form.decidido_por.trim()) newErrors.decidido_por = 'Quem decidiu é obrigatório'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const dataToSave = {
      projeto_id: projetoId,
      titulo: form.titulo.trim(), descricao: form.descricao.trim(),
      tipo: form.tipo, impacto: form.impacto,
      decidido_por: form.decidido_por.trim(), decidido_por_tipo: form.decidido_por_tipo,
      data_decisao: form.data_decisao,
      impacto_orcamento: form.impacto_orcamento ? parseFloat(form.impacto_orcamento) : null,
      impacto_prazo_dias: form.impacto_prazo_dias ? parseInt(form.impacto_prazo_dias) : null,
      divisao: form.divisao.trim() || null, justificacao: form.justificacao.trim() || null,
      categoria_orcamento: form.categoria_orcamento.trim() || null,
      tags: form.tags.length > 0 ? form.tags : null,
      alternativas_consideradas: form.alternativas.length > 0 ? form.alternativas : null,
      fonte: 'manual', estado: 'validada',
      publicar_no_portal: form.publicar_no_portal,
      requer_resposta_cliente: form.requer_resposta_cliente,
      prazo_resposta_cliente: form.prazo_resposta_cliente || null
    }

    try {
      if (isEditing) {
        await supabase.from('decisoes').update(dataToSave).eq('id', decisao.id)
      } else {
        const user = (await supabase.auth.getUser()).data.user
        dataToSave.created_by = user?.id
        dataToSave.aprovado_por = user?.id
        await supabase.from('decisoes').insert(dataToSave)
      }
      onSave?.()
      onClose()
    } catch (error) {
      setErrors({ submit: error.message })
    } finally {
      setSaving(false)
    }
  }

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }))
      setNewTag('')
    }
  }

  const removeTag = (tag) => setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))

  const addAlternativa = () => setForm(prev => ({ ...prev, alternativas: [...prev.alternativas, { opcao: '', motivo_rejeicao: '' }] }))

  const updateAlternativa = (index, field, value) => {
    setForm(prev => ({ ...prev, alternativas: prev.alternativas.map((alt, i) => i === index ? { ...alt, [field]: value } : alt) }))
  }

  const removeAlternativa = (index) => setForm(prev => ({ ...prev, alternativas: prev.alternativas.filter((_, i) => i !== index) }))

  const inputStyle = { padding: '10px 12px', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '14px', fontFamily: 'Quattrocento Sans, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#5F5C59', marginBottom: '6px', display: 'block' }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: '#FFF', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #E5E5E5' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, fontFamily: 'Cormorant Garamond, serif' }}>{isEditing ? 'Editar Decisão' : 'Nova Decisão'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9CA3AF' }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Título */}
          <div>
            <label style={labelStyle}>Título <span style={{ color: '#EF4444' }}>*</span></label>
            <input value={form.titulo} onChange={e => updateForm('titulo', e.target.value)} style={{ ...inputStyle, borderColor: errors.titulo ? '#EF4444' : '#E5E5E5' }} placeholder="Ex: Mármore Calacatta Gold para bancada WC Suite" maxLength={100} />
            {errors.titulo && <span style={{ fontSize: '11px', color: '#EF4444' }}>{errors.titulo}</span>}
          </div>

          {/* Tipo + Impacto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Tipo de Decisão</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {TIPO_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => updateForm('tipo', opt.value)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 8px', border: '1px solid #E5E5E5', borderRadius: '6px', backgroundColor: form.tipo === opt.value ? '#8B8670' : '#FFF', color: form.tipo === opt.value ? '#FFF' : '#5F5C59', cursor: 'pointer', fontSize: '11px' }}>
                    <span style={{ fontSize: '18px' }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Nível de Impacto</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {IMPACTO_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => updateForm('impacto', opt.value)} style={{ flex: 1, padding: '10px 12px', border: '1px solid #E5E5E5', borderRadius: '6px', backgroundColor: form.impacto === opt.value ? opt.color : '#FFF', color: form.impacto === opt.value ? '#FFF' : '#5F5C59', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição <span style={{ color: '#EF4444' }}>*</span></label>
            <textarea value={form.descricao} onChange={e => updateForm('descricao', e.target.value)} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', borderColor: errors.descricao ? '#EF4444' : '#E5E5E5' }} placeholder="Descrição completa da decisão tomada..." rows={3} />
            {errors.descricao && <span style={{ fontSize: '11px', color: '#EF4444' }}>{errors.descricao}</span>}
          </div>

          {/* Quem + Tipo + Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Decidido por <span style={{ color: '#EF4444' }}>*</span></label>
              <input value={form.decidido_por} onChange={e => updateForm('decidido_por', e.target.value)} style={{ ...inputStyle, borderColor: errors.decidido_por ? '#EF4444' : '#E5E5E5' }} placeholder="Nome" />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select value={form.decidido_por_tipo} onChange={e => updateForm('decidido_por_tipo', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="cliente">Cliente</option>
                <option value="gavinho">GAVINHO</option>
                <option value="conjunto">Conjunto</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data</label>
              <input type="date" value={form.data_decisao} onChange={e => updateForm('data_decisao', e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Impactos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Impacto Orçamento (€)</label>
              <input type="number" value={form.impacto_orcamento} onChange={e => updateForm('impacto_orcamento', e.target.value)} style={inputStyle} placeholder="Ex: 3200" />
            </div>
            <div>
              <label style={labelStyle}>Categoria Orçamento</label>
              <input value={form.categoria_orcamento} onChange={e => updateForm('categoria_orcamento', e.target.value)} style={inputStyle} placeholder="Ex: Acabamentos WC" />
            </div>
            <div>
              <label style={labelStyle}>Impacto Prazo (dias)</label>
              <input type="number" value={form.impacto_prazo_dias} onChange={e => updateForm('impacto_prazo_dias', e.target.value)} style={inputStyle} placeholder="Ex: 15" />
            </div>
          </div>

          {/* Divisão */}
          <div>
            <label style={labelStyle}>Divisão/Zona Afectada</label>
            <input value={form.divisao} onChange={e => updateForm('divisao', e.target.value)} style={inputStyle} placeholder="Ex: WC Suite, Cozinha, Toda a habitação" />
          </div>

          {/* Justificação */}
          <div>
            <label style={labelStyle}>Justificação</label>
            <textarea value={form.justificacao} onChange={e => updateForm('justificacao', e.target.value)} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Porquê esta escolha? (opcional)" rows={2} />
          </div>

          {/* Alternativas */}
          <div>
            <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Alternativas Consideradas
              <button type="button" onClick={addAlternativa} style={{ padding: '4px 8px', backgroundColor: '#F2F0E7', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#5F5C59' }}>+ Adicionar</button>
            </label>
            {form.alternativas.map((alt, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input value={alt.opcao} onChange={e => updateAlternativa(i, 'opcao', e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="Opção alternativa" />
                <input value={alt.motivo_rejeicao} onChange={e => updateAlternativa(i, 'motivo_rejeicao', e.target.value)} style={{ ...inputStyle, flex: 2 }} placeholder="Motivo da rejeição" />
                <button type="button" onClick={() => removeAlternativa(i)} style={{ padding: '8px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#EF4444' }}>🗑</button>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} style={{ ...inputStyle, flex: 1 }} placeholder="Adicionar tag..." />
              <button type="button" onClick={addTag} style={{ padding: '10px 12px', backgroundColor: '#8B8670', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>+</button>
            </div>
            {form.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {form.tags.map((tag, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#F2F0E7', borderRadius: '4px', fontSize: '12px', color: '#5F5C59' }}>
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#9CA3AF', padding: 0 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Portal Cliente */}
          <div style={{ borderTop: '1px solid #E8E6DF', paddingTop: '12px' }}>
            <PortalToggle
              checked={form.publicar_no_portal}
              onChange={v => updateForm('publicar_no_portal', v)}
            />
            {form.publicar_no_portal && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#5F5C59', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.requer_resposta_cliente} onChange={e => updateForm('requer_resposta_cliente', e.target.checked)} />
                  Requer resposta do cliente
                </label>
                {form.requer_resposta_cliente && (
                  <div>
                    <label style={{ fontSize: '11px', color: '#8B8670', display: 'block', marginBottom: '2px' }}>Prazo de resposta</label>
                    <input type="date" value={form.prazo_resposta_cliente} onChange={e => updateForm('prazo_resposta_cliente', e.target.value)} style={inputStyle} />
                  </div>
                )}
              </div>
            )}
          </div>

          {errors.submit && <div style={{ padding: '12px', backgroundColor: '#FEE2E2', borderRadius: '6px', color: '#DC2626', fontSize: '13px' }}>{errors.submit}</div>}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #E5E5E5', backgroundColor: '#F9F9F7' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#FFF', color: '#5F5C59', border: '1px solid #E5E5E5', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', backgroundColor: '#8B8670', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
            {saving ? '⏳ A guardar...' : `💾 ${isEditing ? 'Guardar Alterações' : 'Registar Decisão'}`}
          </button>
        </div>
      </div>
    </div>
  )
}
