import { useState } from 'react'
import { UserCircle, Edit, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

export default function ProjetoFichaCliente({ project, setProject }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})

  const startEditing = () => {
    const c = project.cliente || {}
    setForm({
      nome: c.nome || project.cliente_nome || '',
      tipo: c.tipo || 'Particular',
      empresa: c.empresa || '',
      email: c.email || '',
      telefone: c.telefone || '',
      nif: c.nif || (c.documento || '').replace('NIF: ', ''),
      morada: c.morada_raw || '',
      codigo_postal: c.codigo_postal || '',
      cidade: c.cidade || '',
      notas: c.notas || ''
    })
    setEditing(true)
  }

  const handleSave = async () => {
    if (!project.cliente_id) return
    setSaving(true)
    try {
      const updateData = {
        nome: form.nome,
        tipo: form.tipo,
        empresa: form.empresa || null,
        email: form.email || null,
        telefone: form.telefone || null,
        nif: form.nif || null,
        morada_raw: form.morada || null,
        codigo_postal: form.codigo_postal || null,
        cidade: form.cidade || null,
        notas: form.notas || null
      }
      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', project.cliente_id)
      if (error) throw error

      setProject(prev => ({
        ...prev,
        cliente: {
          ...prev.cliente,
          ...updateData,
          documento: form.nif ? `NIF: ${form.nif}` : prev.cliente?.documento,
          morada: form.morada ? `${form.morada}${form.codigo_postal ? ', ' + form.codigo_postal : ''}${form.cidade ? ' ' + form.cidade : ''}` : prev.cliente?.morada
        }
      }))
      setEditing(false)
    } catch (err) {
      console.error('Erro ao guardar cliente:', err)
      alert('Erro ao guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'white', color: 'var(--brown)' }
  const labelStyle = { fontSize: '12px', color: 'var(--brown-light)', fontWeight: 600, display: 'block', marginBottom: '4px' }
  const readFieldStyle = { padding: '16px', background: 'var(--cream)', borderRadius: '8px' }
  const readLabelStyle = { fontSize: '11px', color: 'var(--brown-light)', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 600 }
  const readValueStyle = { fontSize: '14px', color: 'var(--brown)', margin: 0 }

  return (
    <div className="card">
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div className="flex items-center gap-md">
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCircle size={24} style={{ color: 'var(--brown)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
              {project.cliente?.nome || project.cliente_nome || 'Cliente'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--brown-light)', margin: 0 }}>
              {project.cliente?.codigo || ''} {project.cliente?.tipo ? `· ${project.cliente.tipo}` : ''}
            </p>
          </div>
        </div>
        {!editing ? (
          <button onClick={startEditing} style={{ padding: '8px 16px', background: 'var(--brown)', color: 'var(--off-white)', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit size={14} /> Editar
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: 'var(--accent-olive)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Guardar
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            ['Nome', project.cliente?.nome || project.cliente_nome || '-'],
            ['Tipo', project.cliente?.tipo || 'Particular'],
            ['Email', project.cliente?.email || '-'],
            ['Telefone', project.cliente?.telefone || '-'],
            ['NIF', project.cliente?.documento || '-'],
            ['Morada', project.cliente?.morada || '-']
          ].map(([label, value]) => (
            <div key={label} style={readFieldStyle}>
              <p style={readLabelStyle}>{label}</p>
              <p style={readValueStyle}>{value}</p>
            </div>
          ))}
          {project.cliente?.notas && (
            <div style={{ ...readFieldStyle, gridColumn: '1 / -1' }}>
              <p style={readLabelStyle}>Notas</p>
              <p style={{ ...readValueStyle, whiteSpace: 'pre-wrap' }}>{project.cliente.notas}</p>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Nome *</label>
            <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={fieldStyle}>
              <option value="Particular">Particular</option>
              <option value="Empresa">Empresa</option>
              <option value="Investidor">Investidor</option>
            </select>
          </div>
          {form.tipo !== 'Particular' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Empresa</label>
              <input type="text" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} style={fieldStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Telefone</label>
            <input type="tel" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>NIF</label>
            <input type="text" value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Morada</label>
            <input type="text" value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Código Postal</label>
            <input type="text" value={form.codigo_postal} onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value }))} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Cidade</label>
            <input type="text" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} style={fieldStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notas</label>
            <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
        </div>
      )}
    </div>
  )
}
