import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { COMPARTIMENTOS } from '../constants/projectConstants'
import { SplitSquareHorizontal, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import styles from './FotoComparador.module.css'

const getThumbnailUrl = (url, width = 400) => {
  if (url && url.includes('supabase.co/storage/v1/object/')) {
    const transformUrl = url.replace('/storage/v1/object/', '/storage/v1/render/image/')
    const separator = transformUrl.includes('?') ? '&' : '?'
    return `${transformUrl}${separator}width=${width}&quality=75`
  }
  return url
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export default function FotoComparador({ projeto }) {
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [compartimento, setCompartimento] = useState('')
  const [dataBefore, setDataBefore] = useState('')
  const [dataAfter, setDataAfter] = useState('')

  // Selected photos for comparison
  const [fotoBefore, setFotoBefore] = useState(null)
  const [fotoAfter, setFotoAfter] = useState(null)

  // Slider
  const [sliderPos, setSliderPos] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const comparatorRef = useRef(null)
  const beforeImgRef = useRef(null)

  // Fetch all photos for this project with visit dates
  useEffect(() => {
    const fetchFotos = async () => {
      if (!projeto?.id) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('projeto_acompanhamento_fotos')
          .select('*, projeto_acompanhamento_visitas!inner(data_visita, titulo)')
          .eq('projeto_id', projeto.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setFotos(data || [])
      } catch (err) {
        console.error('Erro ao carregar fotos:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFotos()
  }, [projeto?.id])

  // Derive available compartimentos (those that have photos)
  const availableCompartimentos = [...new Set(
    fotos.filter(f => f.compartimento).map(f => f.compartimento)
  )].sort()

  // Derive available dates based on selected compartimento
  const filteredFotos = compartimento
    ? fotos.filter(f => f.compartimento === compartimento)
    : fotos

  const availableDates = [...new Set(
    filteredFotos.map(f => f.projeto_acompanhamento_visitas?.data_visita).filter(Boolean)
  )].sort()

  // Photos for "before" date
  const beforePhotos = filteredFotos.filter(
    f => f.projeto_acompanhamento_visitas?.data_visita === dataBefore
  )

  // Photos for "after" date
  const afterPhotos = filteredFotos.filter(
    f => f.projeto_acompanhamento_visitas?.data_visita === dataAfter
  )

  // Auto-select dates when compartimento changes
  useEffect(() => {
    setDataBefore('')
    setDataAfter('')
    setFotoBefore(null)
    setFotoAfter(null)
  }, [compartimento])

  // Reset photo selection when dates change
  useEffect(() => {
    setFotoBefore(null)
  }, [dataBefore])

  useEffect(() => {
    setFotoAfter(null)
  }, [dataAfter])

  // ---- Slider drag logic ----

  const getSliderPosition = useCallback((clientX) => {
    if (!comparatorRef.current) return 50
    const rect = comparatorRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    return Math.max(0, Math.min(100, (x / rect.width) * 100))
  }, [])

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    setSliderPos(getSliderPosition(clientX))
  }, [getSliderPosition])

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    setSliderPos(getSliderPosition(clientX))
  }, [isDragging, getSliderPosition])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove)
      window.addEventListener('mouseup', handlePointerUp)
      window.addEventListener('touchmove', handlePointerMove, { passive: false })
      window.addEventListener('touchend', handlePointerUp)
      return () => {
        window.removeEventListener('mousemove', handlePointerMove)
        window.removeEventListener('mouseup', handlePointerUp)
        window.removeEventListener('touchmove', handlePointerMove)
        window.removeEventListener('touchend', handlePointerUp)
      }
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  // Set before image width to match container
  useEffect(() => {
    if (beforeImgRef.current && comparatorRef.current) {
      beforeImgRef.current.style.width = comparatorRef.current.offsetWidth + 'px'
    }
  }, [fotoBefore, fotoAfter])

  const handleResize = useCallback(() => {
    if (beforeImgRef.current && comparatorRef.current) {
      beforeImgRef.current.style.width = comparatorRef.current.offsetWidth + 'px'
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // ---- Render ----

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.noPhotos}>A carregar fotografias...</div>
      </div>
    )
  }

  const hasCompartimentos = availableCompartimentos.length > 0
  const bothSelected = fotoBefore && fotoAfter

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Comparador de Fotografias</h3>
        <p className={styles.subtitle}>
          Compare o progresso de obra selecionando fotos de datas diferentes na mesma divisão
        </p>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Compartimento</span>
          <select
            className={styles.filterSelect}
            value={compartimento}
            onChange={e => setCompartimento(e.target.value)}
          >
            <option value="">
              {hasCompartimentos ? 'Todos os compartimentos' : 'Sem compartimentos atribuídos'}
            </option>
            {hasCompartimentos
              ? availableCompartimentos.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))
              : COMPARTIMENTOS.map(c => (
                  <option key={c} value={c} disabled>{c}</option>
                ))
            }
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Data — Antes</span>
          <select
            className={styles.filterSelect}
            value={dataBefore}
            onChange={e => setDataBefore(e.target.value)}
          >
            <option value="">Selecionar data</option>
            {availableDates
              .filter(d => !dataAfter || d < dataAfter)
              .map(d => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))
            }
          </select>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Data — Depois</span>
          <select
            className={styles.filterSelect}
            value={dataAfter}
            onChange={e => setDataAfter(e.target.value)}
          >
            <option value="">Selecionar data</option>
            {availableDates
              .filter(d => !dataBefore || d > dataBefore)
              .map(d => (
                <option key={d} value={d}>{formatDate(d)}</option>
              ))
            }
          </select>
        </div>
      </div>

      {/* Photo selection */}
      {(dataBefore || dataAfter) && (
        <div className={styles.selectionArea}>
          {/* Before column */}
          <div className={styles.selectionColumnBefore}>
            <p className={`${styles.columnTitle} ${styles.columnTitleBefore}`}>
              <ChevronLeft size={14} />
              Antes — {dataBefore ? formatDate(dataBefore) : 'Selecione data'}
            </p>
            {dataBefore ? (
              beforePhotos.length > 0 ? (
                <div className={styles.thumbGrid}>
                  {beforePhotos.map(foto => (
                    <div
                      key={foto.id}
                      className={fotoBefore?.id === foto.id ? styles.thumbSelected : styles.thumb}
                      onClick={() => setFotoBefore(foto)}
                    >
                      <img
                        src={getThumbnailUrl(foto.url)}
                        alt={foto.titulo || 'Foto'}
                        className={styles.thumbImg}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noPhotos}>
                  Sem fotos nesta data{compartimento ? ` para ${compartimento}` : ''}
                </div>
              )
            ) : (
              <div className={styles.noPhotos}>Selecione a data "Antes"</div>
            )}
          </div>

          {/* After column */}
          <div className={styles.selectionColumnAfter}>
            <p className={`${styles.columnTitle} ${styles.columnTitleAfter}`}>
              <ChevronRight size={14} />
              Depois — {dataAfter ? formatDate(dataAfter) : 'Selecione data'}
            </p>
            {dataAfter ? (
              afterPhotos.length > 0 ? (
                <div className={styles.thumbGrid}>
                  {afterPhotos.map(foto => (
                    <div
                      key={foto.id}
                      className={fotoAfter?.id === foto.id ? styles.thumbSelected : styles.thumb}
                      onClick={() => setFotoAfter(foto)}
                    >
                      <img
                        src={getThumbnailUrl(foto.url)}
                        alt={foto.titulo || 'Foto'}
                        className={styles.thumbImg}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noPhotos}>
                  Sem fotos nesta data{compartimento ? ` para ${compartimento}` : ''}
                </div>
              )
            ) : (
              <div className={styles.noPhotos}>Selecione a data "Depois"</div>
            )}
          </div>
        </div>
      )}

      {/* Comparator slider */}
      {bothSelected ? (
        <div className={styles.comparatorWrapper}>
          <div
            ref={comparatorRef}
            className={styles.comparator}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
          >
            {/* After image (full background) */}
            <img
              src={fotoAfter.url}
              alt="Depois"
              className={styles.comparatorImgAfter}
              draggable={false}
              onLoad={handleResize}
            />

            {/* Before image (clipped) */}
            <div
              className={styles.comparatorBefore}
              style={{ width: `${sliderPos}%` }}
            >
              <img
                ref={beforeImgRef}
                src={fotoBefore.url}
                alt="Antes"
                className={styles.comparatorImgBefore}
                draggable={false}
              />
            </div>

            {/* Handle */}
            <div className={styles.handle} style={{ left: `${sliderPos}%` }}>
              <div className={styles.handleCircle}>
                <SplitSquareHorizontal size={18} />
              </div>
            </div>

            {/* Labels */}
            <div className={styles.labelBefore}>Antes</div>
            <div className={styles.labelAfter}>Depois</div>
          </div>
        </div>
      ) : (
        !dataBefore && !dataAfter && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <ImageIcon size={48} />
            </div>
            <p className={styles.emptyTitle}>Selecione datas para comparar</p>
            <p className={styles.emptyText}>
              {fotos.length === 0
                ? 'Ainda não existem fotos de acompanhamento. Adicione fotos no separador "Fotografias".'
                : 'Escolha um compartimento e duas datas diferentes para ver a evolução da obra.'
              }
            </p>
          </div>
        )
      )}
    </div>
  )
}
