import { Image, Tag, Filter, Upload, Check } from 'lucide-react'

export default function MaterialForm({
  form, setForm, categorias, projetos, getCategoriasByTipo,
  editingItem, uploadingFile, tempFileUrl, tempFichaTecnicaUrl,
  handleFileUpload
}) {
  return (
    <>
      {/* Secção: Imagem/Textura */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Image size={14} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Textura / Imagem</span>
        </div>

        <div style={{
          border: (tempFileUrl || editingItem?.textura_url) ? '2px solid var(--success)' : '2px dashed var(--stone)',
          borderRadius: '16px', overflow: 'hidden',
          background: (tempFileUrl || editingItem?.textura_url) ? `url(${tempFileUrl || editingItem?.textura_url}) center/cover` : 'linear-gradient(135deg, var(--cream) 0%, var(--off-white) 100%)',
          minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease'
        }}>
          {(tempFileUrl || editingItem?.textura_url) && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.1) 100%)',
              borderRadius: '14px'
            }} />
          )}
          <input
            type="file" accept="image/*"
            onChange={e => handleFileUpload(e)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            disabled={uploadingFile}
          />
          {(tempFileUrl || editingItem?.textura_url) ? (
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                <Check size={24} style={{ color: 'var(--success)' }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                Imagem carregada
              </span>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                Clica para substituir
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <Upload size={24} style={{ color: 'var(--brown-light)' }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--brown)', display: 'block', marginBottom: '6px' }}>
                {uploadingFile ? 'A carregar...' : 'Clica ou arrasta para fazer upload'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>PNG, JPG ou WEBP até 10MB</span>
            </div>
          )}
        </div>
      </div>

      {/* Secção: Identificação */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--info) 0%, #5a7a9a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Tag size={14} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Identificação</span>
        </div>

        <div style={{ background: 'var(--off-white)', padding: '20px', borderRadius: '14px', border: '1px solid var(--stone)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Nome do Material *
              </label>
              <input
                type="text" value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Mármore Carrara"
                style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Categoria
              </label>
              <select
                value={form.categoria_id}
                onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', cursor: 'pointer', boxSizing: 'border-box' }}
              >
                <option value="">Selecionar...</option>
                {getCategoriasByTipo('materiais').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Fornecedor
              </label>
              <input
                type="text" value={form.fornecedor}
                onChange={e => setForm({ ...form, fornecedor: e.target.value })}
                placeholder="Ex: AtlasPlan"
                style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Referência
              </label>
              <input
                type="text" value={form.referencia}
                onChange={e => setForm({ ...form, referencia: e.target.value })}
                placeholder="Código de referência"
                style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Secção: Características */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--success) 0%, #5a8a5a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Filter size={14} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brown)' }}>Características</span>
        </div>

        <div style={{ background: 'var(--off-white)', padding: '20px', borderRadius: '14px', border: '1px solid var(--stone)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Preço/m²
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--brown-light)', fontSize: '14px', fontWeight: 500 }}>€</span>
                <input
                  type="number" step="0.01" value={form.preco_m2}
                  onChange={e => setForm({ ...form, preco_m2: e.target.value })}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px 14px 12px 32px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Cor
              </label>
              <input
                type="text" value={form.cor}
                onChange={e => setForm({ ...form, cor: e.target.value })}
                placeholder="Ex: Branco"
                style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Acabamento
              </label>
              <input
                type="text" value={form.acabamento}
                onChange={e => setForm({ ...form, acabamento: e.target.value })}
                placeholder="Ex: Polido"
                style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              Descrição
            </label>
            <textarea
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              rows={2} placeholder="Notas ou descrição do material..."
              style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', resize: 'vertical', minHeight: '70px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* Secção: Documentação */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'var(--off-white)', borderRadius: '14px',
          border: '1px solid var(--stone)', position: 'relative'
        }}>
          <input
            type="file" accept=".pdf"
            onChange={e => handleFileUpload(e, 'ficha_tecnica')}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            disabled={uploadingFile}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: (tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url) ? 'var(--success)' : 'var(--stone)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {(tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url) ? (
                <Check size={20} style={{ color: 'white' }} />
              ) : (
                <Upload size={18} style={{ color: 'var(--brown-light)' }} />
              )}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>Ficha Técnica (PDF)</div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                {(tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url)
                  ? 'Ficheiro carregado'
                  : uploadingFile ? 'A carregar...' : 'Clica para fazer upload'}
              </div>
            </div>
          </div>
          {(tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url) && (
            <a
              href={tempFichaTecnicaUrl || editingItem?.ficha_tecnica_url}
              target="_blank" rel="noopener noreferrer"
              style={{
                padding: '8px 14px', background: 'var(--white)', borderRadius: '8px',
                fontSize: '12px', fontWeight: 500, color: 'var(--brown)', textDecoration: 'none',
                border: '1px solid var(--stone)', position: 'relative', zIndex: 1
              }}
              onClick={e => e.stopPropagation()}
            >
              Ver PDF
            </a>
          )}
        </div>
      </div>

      {/* Secção: Vincular a Projeto */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brown)' }}>Vincular a Projeto</span>
          <span style={{ fontSize: '11px', color: 'var(--brown-light)' }}>(opcional)</span>
        </div>
        <select
          value={form.projeto_id}
          onChange={e => setForm({ ...form, projeto_id: e.target.value })}
          style={{ width: '100%', padding: '12px 14px', border: '2px solid var(--stone)', borderRadius: '10px', fontSize: '14px', background: 'var(--white)', cursor: 'pointer', boxSizing: 'border-box' }}
        >
          <option value="">Nenhum projeto selecionado</option>
          {projetos.map(proj => (
            <option key={proj.id} value={proj.id}>{proj.codigo} - {proj.nome}</option>
          ))}
        </select>
      </div>
    </>
  )
}
