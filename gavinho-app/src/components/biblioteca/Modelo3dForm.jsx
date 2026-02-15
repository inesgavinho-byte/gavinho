import { Image, Tag, Box, Square, Upload, Check } from 'lucide-react'
import { FORMATOS_3D } from './constants'

export default function Modelo3dForm({
  form, setForm, getCategoriasByTipo,
  editingItem, uploadingFile, tempFileUrl, tempMiniaturaUrl,
  handleFileUpload
}) {
  return (
    <>
      {/* Section: Ficheiros */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--info) 0%, #5a7a9a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Box size={16} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Ficheiros</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
          {/* Ficheiro 3D */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
              Ficheiro 3D
            </label>
            <div style={{
              border: (tempFileUrl || editingItem?.ficheiro_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
              borderRadius: '12px', padding: '20px', textAlign: 'center',
              background: (tempFileUrl || editingItem?.ficheiro_url) ? 'rgba(122, 158, 122, 0.08)' : 'var(--cream)',
              position: 'relative', minHeight: '100px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease'
            }}>
              <input
                type="file" accept=".obj,.fbx,.skp,.3ds,.blend,.glb,.gltf,.zip,.rar"
                onChange={e => handleFileUpload(e)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                disabled={uploadingFile}
              />
              {(tempFileUrl || editingItem?.ficheiro_url) ? (
                <>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px', background: 'var(--success)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Box size={22} style={{ color: 'white' }} />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success)' }}>✓ Ficheiro carregado</div>
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Clica para substituir</div>
                </>
              ) : (
                <>
                  <Box size={28} style={{ color: 'var(--brown-light)' }} />
                  <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                    {uploadingFile ? 'A carregar...' : 'Upload ficheiro 3D'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--stone-dark)' }}>
                    .obj, .fbx, .skp, .blend, .glb, .zip, .rar
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Miniatura */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
              Miniatura / Preview
            </label>
            <div style={{
              border: (tempMiniaturaUrl || editingItem?.miniatura_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
              borderRadius: '12px', overflow: 'hidden',
              background: (tempMiniaturaUrl || editingItem?.miniatura_url)
                ? `url(${tempMiniaturaUrl || editingItem?.miniatura_url}) center/cover`
                : 'linear-gradient(135deg, var(--cream) 0%, var(--off-white) 100%)',
              position: 'relative', minHeight: '100px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <input
                type="file" accept="image/*"
                onChange={e => handleFileUpload(e, 'miniatura')}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', zIndex: 2 }}
                disabled={uploadingFile}
              />
              {(tempMiniaturaUrl || editingItem?.miniatura_url) && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}>
                  <span style={{ fontSize: '11px', color: 'white', fontWeight: 500 }}>✓ Imagem carregada</span>
                </div>
              )}
              {!(tempMiniaturaUrl || editingItem?.miniatura_url) && (
                <div style={{ textAlign: 'center', padding: '16px' }}>
                  <Image size={24} style={{ color: 'var(--brown-light)', marginBottom: '6px' }} />
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>Upload imagem</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Identificação */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Tag size={16} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Identificação</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
              Nome *
            </label>
            <input
              type="text" value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: WALL LIGHT - Capsule"
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', transition: 'border-color 0.2s', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--stone)'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
              Categoria
            </label>
            <select
              value={form.categoria_id}
              onChange={e => setForm({ ...form, categoria_id: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'white', cursor: 'pointer' }}
            >
              <option value="">Selecionar categoria...</option>
              {getCategoriasByTipo('modelo3d').map(cat => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
              Formato
            </label>
            <select
              value={form.formato}
              onChange={e => setForm({ ...form, formato: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'white', cursor: 'pointer' }}
            >
              <option value="">Selecionar...</option>
              {FORMATOS_3D.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
              Fornecedor
            </label>
            <input
              type="text" value={form.fornecedor}
              onChange={e => setForm({ ...form, fornecedor: e.target.value })}
              placeholder="Ex: Mooijane"
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown)' }}>
              Preço (€)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', fontSize: '14px', fontWeight: 500 }}>€</span>
              <input
                type="number" step="0.01" value={form.preco}
                onChange={e => setForm({ ...form, preco: e.target.value })}
                placeholder="0.00"
                style={{ width: '100%', padding: '12px 14px 12px 32px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Dimensões */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--success) 0%, #5a8a5a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Square size={16} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Dimensões</span>
          <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>(em centímetros)</span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px',
          padding: '16px', background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--stone)'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Largura (cm)
            </label>
            <input
              type="number" step="0.1" value={form.largura_cm}
              onChange={e => setForm({ ...form, largura_cm: e.target.value })}
              placeholder="L"
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'white', textAlign: 'center', fontWeight: 500 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Altura (cm)
            </label>
            <input
              type="number" step="0.1" value={form.altura_cm}
              onChange={e => setForm({ ...form, altura_cm: e.target.value })}
              placeholder="A"
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'white', textAlign: 'center', fontWeight: 500 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Profund. (cm)
            </label>
            <input
              type="number" step="0.1" value={form.profundidade_cm}
              onChange={e => setForm({ ...form, profundidade_cm: e.target.value })}
              placeholder="P"
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'white', textAlign: 'center', fontWeight: 500 }}
            />
          </div>
        </div>
      </div>

      {/* Section: Descrição */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)' }}>
          Descrição / Link <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>(opcional)</span>
        </label>
        <textarea
          value={form.descricao}
          onChange={e => setForm({ ...form, descricao: e.target.value })}
          rows={2} placeholder="Link do produto, notas ou descrição..."
          style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', resize: 'vertical', minHeight: '60px' }}
        />
      </div>
    </>
  )
}
