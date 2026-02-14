import { lazy, Suspense } from 'react'
import {
  Plus, Image, Edit, Trash2, Pencil, CheckCircle,
  ChevronDown, ChevronUp, ImagePlus
} from 'lucide-react'
import SubTabNav from '../SubTabNav'
import Moleskine from '../../Moleskine'
import { RenderModal, ImageLightbox } from '../modals'
import { useArchvizRenders } from '../../../hooks/useArchvizRenders'
import styles from '../../../pages/ProjetoDetalhe.module.css'

const MoleskineDigital = lazy(() => import('../../MoleskineDigital'))

const LazyFallback = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.loadingInner}>
      <div className={styles.spinner}></div>
      <p className={styles.loadingText}>A carregar...</p>
    </div>
  </div>
)

const archvizSections = [
  { id: 'processo', label: 'Imagens Processo', icon: ImagePlus },
  { id: 'finais', label: 'Imagens Finais', icon: CheckCircle },
  { id: 'moleskine', label: 'Moleskine', icon: Pencil }
]

export function ProjetoArchviz({ project, user, activeArchvizSection, onSectionChange }) {
  const {
    renders,
    showRenderModal, setShowRenderModal,
    editingRender,
    renderForm, setRenderForm,
    lightboxImage, lightboxImages, lightboxIndex,
    collapsedCompartimentos,
    moleskineRender, setMoleskineRender,
    isDragging,
    projetoCompartimentos,
    draggedImage,
    rendersByCompartimento,
    imagensFinais,
    openAddRenderModal,
    openEditRenderModal,
    handleRenderCompartimentoChange,
    handleSaveRender,
    handleDeleteRender,
    toggleFinalImage,
    handleRenderImageUpload,
    handleRenderDragOver,
    handleRenderDragLeave,
    handleRenderDrop,
    openLightbox,
    navigateLightbox,
    closeLightbox,
    toggleCompartimentoCollapse,
    toggleAllCompartimentos,
    handleFinalImageDragStart,
    handleFinalImageDragOver,
    handleFinalImageDrop,
    handleFinalImageDragEnd,
    getNextVersion,
    refreshAnnotations
  } = useArchvizRenders(project?.id, user?.id, user?.email)

  return (
    <div>
      <SubTabNav sections={archvizSections} activeSection={activeArchvizSection} onSectionChange={onSectionChange} />

      {/* Imagens Processo */}
      {activeArchvizSection === 'processo' && (
        <div className="card">
          <div className={styles.archvizHeader}>
            <div>
              <h3 className={styles.archvizTitle}>Visualizações 3D & Renders</h3>
              <p className={styles.archvizSubtitle}>
                {renders.length} render{renders.length !== 1 ? 's' : ''} · {imagensFinais.length} {imagensFinais.length !== 1 ? 'imagens finais' : 'imagem final'}
              </p>
            </div>
            <div className={styles.archvizActions}>
              {Object.keys(rendersByCompartimento).length > 1 && (
                <>
                  <button onClick={() => toggleAllCompartimentos(true)} className={styles.collapseBtn} title="Colapsar todos">
                    <ChevronUp size={14} />
                    Colapsar
                  </button>
                  <button onClick={() => toggleAllCompartimentos(false)} className={styles.collapseBtn} title="Expandir todos">
                    <ChevronDown size={14} />
                    Expandir
                  </button>
                </>
              )}
              <button onClick={() => openAddRenderModal()} className="btn btn-primary" style={{ padding: '10px 16px' }}>
                <Plus size={16} style={{ marginRight: '8px' }} />
                Adicionar Render
              </button>
            </div>
          </div>

          {/* Renders por Compartimento e Vista */}
          {Object.keys(rendersByCompartimento).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {Object.entries(rendersByCompartimento).map(([compartimento, compartimentoRenders]) => {
                const rendersByVista = compartimentoRenders.reduce((acc, render) => {
                  const vista = render.vista || 'Vista Principal'
                  if (!acc[vista]) acc[vista] = []
                  acc[vista].push(render)
                  return acc
                }, {})

                const totalVersoes = compartimentoRenders.length
                const totalVistas = Object.keys(rendersByVista).length
                const isCollapsed = collapsedCompartimentos[compartimento]

                return (
                  <div key={compartimento} style={{
                    background: 'var(--white)',
                    border: '1px solid var(--stone)',
                    borderRadius: '12px',
                    padding: isCollapsed ? '12px 16px' : '16px',
                    transition: 'padding 0.2s ease'
                  }}>
                    {/* Cabeçalho do Compartimento */}
                    <div
                      className="flex items-center justify-between"
                      style={{ marginBottom: isCollapsed ? 0 : '16px', cursor: 'pointer' }}
                      onClick={() => toggleCompartimentoCollapse(compartimento)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCompartimentoCollapse(compartimento) }}
                          style={{
                            background: 'transparent', border: 'none', padding: '4px',
                            cursor: 'pointer', color: 'var(--brown-light)',
                            display: 'flex', alignItems: 'center',
                            transition: 'transform 0.2s ease',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
                          }}
                        >
                          <ChevronDown size={18} />
                        </button>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brown)', margin: 0 }}>
                          {compartimento}
                          <span style={{ fontWeight: 400, color: 'var(--brown-light)', marginLeft: '8px', fontSize: '13px' }}>
                            ({totalVistas} {totalVistas !== 1 ? 'vistas' : 'vista'} • {totalVersoes} {totalVersoes !== 1 ? 'versões' : 'versão'})
                          </span>
                        </h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isCollapsed && compartimentoRenders.filter(r => r.imagem_url).slice(0, 4).map((render, idx) => (
                          <div
                            key={render.id}
                            style={{
                              width: '32px', height: '32px', borderRadius: '4px',
                              background: `url(${render.imagem_url}) center/cover`,
                              border: render.is_final ? '2px solid var(--success)' : '1px solid var(--stone)',
                              marginLeft: idx > 0 ? '-8px' : 0
                            }}
                            onClick={(e) => { e.stopPropagation(); openLightbox(render, compartimentoRenders) }}
                          />
                        ))}
                        <button
                          onClick={(e) => { e.stopPropagation(); openAddRenderModal(compartimento) }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Plus size={14} style={{ marginRight: '6px' }} />
                          Nova Vista
                        </button>
                      </div>
                    </div>

                    {/* Vistas */}
                    {!isCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {Object.entries(rendersByVista).map(([vista, vistaRenders]) => (
                          <div key={vista} style={{ background: 'var(--cream)', borderRadius: '8px', padding: '12px' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
                                {vista}
                                <span style={{ fontWeight: 400, color: 'var(--brown-light)', marginLeft: '6px' }}>
                                  ({vistaRenders.length} {vistaRenders.length !== 1 ? 'versões' : 'versão'})
                                </span>
                              </span>
                              <button
                                onClick={() => openAddRenderModal(compartimento, vista)}
                                style={{
                                  padding: '4px 8px', background: 'transparent', color: 'var(--brown)',
                                  border: '1px solid var(--stone)', borderRadius: '4px',
                                  fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                              >
                                <Plus size={12} /> Versão
                              </button>
                            </div>

                            <div className="masonry-grid">
                              {vistaRenders
                                .sort((a, b) => (b.versao || 0) - (a.versao || 0))
                                .map((render) => (
                                  <div
                                    key={render.id}
                                    className={`masonry-card ${render.is_final ? 'is-final' : ''}`}
                                    style={{ cursor: render.imagem_url ? 'pointer' : 'default' }}
                                    onClick={() => openLightbox(render, compartimentoRenders)}
                                  >
                                    {render.imagem_url ? (
                                      <img src={render.imagem_url} alt={`${render.compartimento} - v${render.versao}`} className="masonry-card-image" />
                                    ) : (
                                      <div className="masonry-placeholder"><Image size={24} /></div>
                                    )}

                                    <div className="masonry-badge dark">v{render.versao}</div>

                                    {render.is_final && (
                                      <div className="masonry-badge success" style={{ left: 'auto', right: '50px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle size={10} /> FINAL
                                      </div>
                                    )}

                                    <div className="masonry-card-actions">
                                      <button onClick={(e) => { e.stopPropagation(); setMoleskineRender(render) }} className="masonry-action-btn" title="Moleskine">
                                        <Pencil size={14} />
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); openEditRenderModal(render) }} className="masonry-action-btn" title="Editar">
                                        <Edit size={14} />
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteRender(render) }} className="masonry-action-btn danger" title="Eliminar">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>

                                    <div className="masonry-card-info">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="masonry-card-info-subtitle">{render.vista || 'Vista Principal'}</span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleFinalImage(render) }}
                                          className={`masonry-action-btn ${render.is_final ? '' : 'success'}`}
                                          style={{
                                            padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 500,
                                            background: render.is_final ? 'var(--error)' : 'var(--success)', color: 'white'
                                          }}
                                        >
                                          {render.is_final ? 'Remover' : 'Final'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '48px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
              <Image size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <h4 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Galeria Archviz Vazia</h4>
              <p style={{ color: 'var(--brown-light)', fontSize: '13px', marginBottom: '16px' }}>
                Adicione renders e visualizações 3D organizados por compartimento.
              </p>
              <button onClick={() => openAddRenderModal()} className="btn btn-secondary">
                <Plus size={16} style={{ marginRight: '8px' }} />
                Adicionar Primeiro Render
              </button>
            </div>
          )}
        </div>
      )}

      {/* Imagens Finais */}
      {activeArchvizSection === 'finais' && (
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brown)' }}>Imagens Finais do Projeto</h3>
              <p style={{ fontSize: '13px', color: 'var(--brown-light)', marginTop: '4px' }}>Imagens aprovadas para entrega ao cliente</p>
            </div>
            <span style={{
              padding: '8px 16px', background: 'var(--success)', color: 'white',
              borderRadius: '20px', fontSize: '13px', fontWeight: 600
            }}>
              {imagensFinais.length} {imagensFinais.length !== 1 ? 'imagens' : 'imagem'}
            </span>
          </div>

          {imagensFinais.length > 0 ? (
            <div className="masonry-grid">
              {imagensFinais.map((render) => (
                <div
                  key={render.id}
                  className={`masonry-card ${draggedImage?.id === render.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleFinalImageDragStart(e, render)}
                  onDragOver={handleFinalImageDragOver}
                  onDrop={(e) => handleFinalImageDrop(e, render)}
                  onDragEnd={handleFinalImageDragEnd}
                  style={{
                    cursor: 'grab',
                    opacity: draggedImage?.id === render.id ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                  onClick={() => render.imagem_url && openLightbox(render, imagensFinais)}
                >
                  {render.imagem_url ? (
                    <img src={render.imagem_url} alt={render.compartimento} style={{ width: '100%', height: 'auto', display: 'block' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', background: 'var(--cream)' }}>
                      <Image size={32} style={{ color: 'var(--brown-light)', opacity: 0.4 }} />
                    </div>
                  )}
                  <div className="masonry-card-info">
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{render.compartimento}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>Versão {render.versao}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '48px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
              <CheckCircle size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <h4 style={{ color: 'var(--brown)', marginBottom: '8px' }}>Nenhuma Imagem Final</h4>
              <p style={{ color: 'var(--brown-light)', fontSize: '13px' }}>
                Vá a "Imagens Processo" e marque as imagens que devem aparecer nas entregas ao cliente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Moleskine Digital */}
      {activeArchvizSection === 'moleskine' && (
        <Suspense fallback={<LazyFallback />}>
          <MoleskineDigital
            projectId={project?.id}
            projectName={project?.nome}
            onClose={() => onSectionChange('processo')}
          />
        </Suspense>
      )}

      {/* Modals */}
      <RenderModal
        isOpen={showRenderModal}
        onClose={() => setShowRenderModal(false)}
        onSave={handleSaveRender}
        renderForm={renderForm}
        setRenderForm={setRenderForm}
        editingRender={editingRender}
        isDragging={isDragging}
        getNextVersion={getNextVersion}
        onCompartimentoChange={handleRenderCompartimentoChange}
        onDragOver={handleRenderDragOver}
        onDragLeave={handleRenderDragLeave}
        onDrop={handleRenderDrop}
        onImageUpload={handleRenderImageUpload}
        projetoCompartimentos={projetoCompartimentos}
      />

      <ImageLightbox
        image={lightboxImage}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
        onEditRender={(img) => { openEditRenderModal(img); closeLightbox() }}
        onOpenMoleskine={(img) => { setMoleskineRender(img); closeLightbox() }}
      />

      {/* Moleskine annotation overlay */}
      {moleskineRender && (
        <Moleskine
          projectId={project?.id}
          renderId={moleskineRender.id}
          renderImageUrl={moleskineRender.imagem_url}
          renderName={`${moleskineRender.compartimento} v${moleskineRender.versao}`}
          onClose={() => setMoleskineRender(null)}
          onSave={refreshAnnotations}
        />
      )}
    </div>
  )
}

export { archvizSections }
export default ProjetoArchviz
