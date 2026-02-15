import { Upload } from 'lucide-react'

export default function InspiracaoForm({
  form, setForm, getCategoriasByTipo, projetos,
  editingItem, setEditingItem, uploadingFile, tempFileUrl, setTempFileUrl,
  handleFileUpload
}) {
  return (
    <>
      {/* Upload Imagem */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
          Imagem *
        </label>
        <div style={{
          border: (tempFileUrl || editingItem?.imagem_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
          borderRadius: '12px', padding: '16px', background: 'var(--cream)',
          display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', minHeight: '90px'
        }}>
          <input
            type="file" accept="image/*"
            onChange={e => handleFileUpload(e)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            disabled={uploadingFile}
          />
          {(tempFileUrl || editingItem?.imagem_url) ? (
            <>
              <img src={tempFileUrl || editingItem?.imagem_url} alt="Preview" style={{ width: '100px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--stone)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: '13px', marginBottom: '4px' }}>✓ Imagem carregada</div>
                <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Clica para substituir</div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setTempFileUrl(''); if (editingItem) setEditingItem({ ...editingItem, imagem_url: '' }) }}
                style={{ background: 'var(--stone)', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '11px' }}
              >
                Remover
              </button>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px' }}>
              <Upload size={28} style={{ color: 'var(--brown-light)' }} />
              <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
                {uploadingFile ? 'A carregar...' : 'Clica ou arrasta para fazer upload'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--stone-dark)' }}>PNG, JPG, WEBP até 10MB</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Nome / Título</label>
          <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }} placeholder="Ex: Sala minimalista" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Categoria / Divisão</label>
          <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
            <option value="">Selecionar...</option>
            {getCategoriasByTipo('inspiracao').map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Fonte</label>
          <input type="text" value={form.fonte} onChange={e => setForm({ ...form, fonte: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }} placeholder="Ex: Pinterest, ArchDaily" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Link Original</label>
          <input type="url" value={form.link_original} onChange={e => setForm({ ...form, link_original: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px' }} placeholder="https://..." />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Projeto Relacionado</label>
        <select value={form.projeto_id} onChange={e => setForm({ ...form, projeto_id: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
          <option value="">Nenhum</option>
          {projetos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>Descrição / Notas <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(opcional)</span></label>
        <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} rows={2} placeholder="Notas sobre a imagem..." />
      </div>
    </>
  )
}
