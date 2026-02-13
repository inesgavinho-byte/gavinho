import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './ui/Toast'
import ConfirmModal from './ui/ConfirmModal'
import {
  Plus, Upload, X, ChevronLeft, ChevronRight, Trash2, Edit, Loader2,
  FileText, Eye, Pencil, MapPin, Camera, ZoomIn, ZoomOut,
  Save, Undo2, Download, Layers, ChevronDown, Image as ImageIcon
} from 'lucide-react'

// =====================================================
// Drawing Canvas Overlay - Freehand annotations on PDF
// =====================================================
function DrawingCanvas({ width, height, annotations, onSave, isDrawing, color, lineWidth, onStrokeEnd }) {
  const canvasRef = useRef(null)
  const [paths, setPaths] = useState([])
  const [currentPath, setCurrentPath] = useState(null)
  const [isDown, setIsDown] = useState(false)

  // Redraw all existing annotations + current stroke
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)

    // Draw saved annotations
    if (annotations) {
      annotations.forEach(ann => {
        if (ann.tipo === 'desenho' && ann.dados?.paths) {
          ann.dados.paths.forEach(p => drawPath(ctx, p))
        }
      })
    }

    // Draw current session paths
    paths.forEach(p => drawPath(ctx, p))

    // Draw current active stroke
    if (currentPath && currentPath.points.length > 1) {
      drawPath(ctx, currentPath)
    }
  }, [annotations, paths, currentPath, width, height])

  const drawPath = (ctx, path) => {
    if (!path.points || path.points.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = path.color || '#EF4444'
    ctx.lineWidth = path.width || 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.85
    ctx.moveTo(path.points[0].x, path.points[0].y)
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const handleStart = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    setIsDown(true)
    const pos = getPos(e)
    setCurrentPath({ points: [pos], color, width: lineWidth })
  }

  const handleMove = (e) => {
    if (!isDown || !isDrawing || !currentPath) return
    e.preventDefault()
    const pos = getPos(e)
    setCurrentPath(prev => ({
      ...prev,
      points: [...prev.points, pos]
    }))
  }

  const handleEnd = (e) => {
    if (!isDown || !currentPath) return
    e.preventDefault()
    setIsDown(false)
    if (currentPath.points.length > 1) {
      setPaths(prev => [...prev, currentPath])
      onStrokeEnd?.([...paths, currentPath])
    }
    setCurrentPath(null)
  }

  // Expose save and undo methods
  useEffect(() => {
    if (onSave) {
      onSave.current = {
        getPaths: () => paths,
        clearPaths: () => setPaths([]),
        undo: () => {
          setPaths(prev => prev.slice(0, -1))
          onStrokeEnd?.(paths.slice(0, -1))
        },
        hasPaths: () => paths.length > 0
      }
    }
  }, [paths, onSave])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: isDrawing ? 'crosshair' : 'default',
        touchAction: isDrawing ? 'none' : 'auto',
        pointerEvents: isDrawing ? 'auto' : 'none',
        zIndex: 2
      }}
    />
  )
}

// =====================================================
// Photo Pin Component - Expandable photo balloon
// =====================================================
function PhotoPin({ pin, onClick, onDelete, isEditing }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${pin.pos_x}%`,
        top: `${pin.pos_y}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: expanded ? 100 : 10,
        cursor: 'pointer'
      }}
    >
      {/* Expanded photo balloon */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '240px',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={e => e.stopPropagation()}
        >
          <img
            src={pin.foto_url}
            alt={pin.titulo || 'Foto'}
            style={{ width: '100%', height: '160px', objectFit: 'cover' }}
          />
          <div style={{ padding: '8px 12px' }}>
            {pin.titulo && (
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, color: 'var(--brown)' }}>
                {pin.titulo}
              </p>
            )}
            {pin.descricao && (
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--brown-light)' }}>
                {pin.descricao}
              </p>
            )}
            {isEditing && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete?.(pin) }}
                style={{
                  marginTop: '6px', padding: '4px 8px', background: '#fee2e2',
                  color: '#dc2626', border: 'none', borderRadius: '4px',
                  fontSize: '11px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '4px'
                }}
              >
                <Trash2 size={10} /> Eliminar
              </button>
            )}
          </div>
          {/* Arrow pointing down */}
          <div style={{
            position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%)',
            width: '12px', height: '12px', background: '#fff',
            transform: 'translateX(-50%) rotate(45deg)',
            boxShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }} />
        </div>
      )}

      {/* Pin marker */}
      <div
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg)',
          background: pin.cor || 'var(--verde)',
          border: '2px solid #fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Camera size={12} style={{ color: '#fff', transform: 'rotate(45deg)' }} />
      </div>
    </div>
  )
}

// =====================================================
// Main Component: Desenhos em Uso Obra
// =====================================================
export default function DesenhosObra({ projeto, userId, userName }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const pinPhotoInputRef = useRef(null)
  const canvasMethodsRef = useRef(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false })

  // Data
  const [desenhos, setDesenhos] = useState([])
  const [loading, setLoading] = useState(true)

  // Selected drawing viewer
  const [selectedDesenho, setSelectedDesenho] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [pins, setPins] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Drawing mode
  const [mode, setMode] = useState('view') // 'view', 'draw', 'pin'
  const [drawColor, setDrawColor] = useState('#EF4444')
  const [drawWidth, setDrawWidth] = useState(3)
  const [zoom, setZoom] = useState(100)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [showAddDesenho, setShowAddDesenho] = useState(false)
  const [desenhoForm, setDesenhoForm] = useState({
    nome: '', descricao: '', tipo: 'planta', especialidade: 'Arquitetura', versao: 'v1'
  })

  // Pin creation
  const [pendingPinPos, setPendingPinPos] = useState(null) // { x, y } waiting for photo
  const [pinForm, setPinForm] = useState({ titulo: '', descricao: '' })

  // Image dimensions for canvas
  const [imgDimensions, setImgDimensions] = useState({ width: 800, height: 600 })
  const viewerRef = useRef(null)

  useEffect(() => {
    if (projeto?.id) loadDesenhos()
  }, [projeto?.id])

  const loadDesenhos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projeto_desenhos_obra')
        .select('*')
        .eq('projeto_id', projeto.id)
        .eq('estado', 'em_uso')
        .order('especialidade')
        .order('nome')

      if (error) throw error
      setDesenhos(data || [])
    } catch (err) {
      console.error('Erro ao carregar desenhos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAnnotationsAndPins = async (desenhoId, page = 1) => {
    try {
      const [{ data: annData }, { data: pinData }] = await Promise.all([
        supabase
          .from('projeto_desenho_anotacoes')
          .select('*')
          .eq('desenho_id', desenhoId)
          .eq('pagina', page)
          .order('created_at'),
        supabase
          .from('projeto_desenho_pins')
          .select('*')
          .eq('desenho_id', desenhoId)
          .eq('pagina', page)
          .order('created_at')
      ])
      setAnnotations(annData || [])
      setPins(pinData || [])
    } catch (err) {
      console.error('Erro ao carregar anotações:', err)
    }
  }

  const handleSelectDesenho = (desenho) => {
    setSelectedDesenho(desenho)
    setCurrentPage(1)
    setMode('view')
    setZoom(100)
    loadAnnotationsAndPins(desenho.id, 1)
  }

  const handleUploadDesenho = async (file) => {
    if (!file || !desenhoForm.nome.trim()) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `projetos/${projeto.id}/desenhos-obra/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('projeto-files')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('projeto-files')
        .getPublicUrl(path)

      const { data, error } = await supabase
        .from('projeto_desenhos_obra')
        .insert({
          projeto_id: projeto.id,
          nome: desenhoForm.nome.trim(),
          descricao: desenhoForm.descricao.trim() || null,
          url: publicUrl,
          file_path: path,
          filename: file.name,
          tipo: desenhoForm.tipo,
          especialidade: desenhoForm.especialidade,
          versao: desenhoForm.versao,
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error
      setDesenhos(prev => [...prev, data])
      setDesenhoForm({ nome: '', descricao: '', tipo: 'planta', especialidade: 'Arquitetura', versao: 'v1' })
      setShowAddDesenho(false)
      toast.success('Desenho adicionado')
    } catch (err) {
      toast.error('Erro', err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDesenho = (desenho) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Desenho',
      message: `Eliminar "${desenho.nome}" e todas as anotações?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          if (desenho.file_path) await supabase.storage.from('projeto-files').remove([desenho.file_path])
          await supabase.from('projeto_desenhos_obra').delete().eq('id', desenho.id)
          setDesenhos(prev => prev.filter(d => d.id !== desenho.id))
          if (selectedDesenho?.id === desenho.id) {
            setSelectedDesenho(null)
            setAnnotations([])
            setPins([])
          }
        } catch (err) {
          toast.error('Erro', err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  // Save freehand drawing annotations
  const handleSaveAnnotation = async () => {
    const methods = canvasMethodsRef.current
    if (!methods?.hasPaths() || !selectedDesenho) return

    try {
      const { data, error } = await supabase
        .from('projeto_desenho_anotacoes')
        .insert({
          desenho_id: selectedDesenho.id,
          pagina: currentPage,
          tipo: 'desenho',
          dados: { paths: methods.getPaths() },
          cor: drawColor,
          created_by: userId,
          created_by_name: userName
        })
        .select()
        .single()

      if (error) throw error
      setAnnotations(prev => [...prev, data])
      methods.clearPaths()
      toast.success('Anotação guardada')
    } catch (err) {
      toast.error('Erro ao guardar', err.message)
    }
  }

  // Handle clicking on drawing area to place a pin
  const handleViewerClick = (e) => {
    if (mode !== 'pin' || !selectedDesenho) return
    const rect = viewerRef.current?.getBoundingClientRect()
    if (!rect) return

    const posX = ((e.clientX - rect.left) / rect.width) * 100
    const posY = ((e.clientY - rect.top) / rect.height) * 100

    setPendingPinPos({ x: posX, y: posY })
  }

  // Upload photo for pin
  const handlePinPhotoUpload = async (file) => {
    if (!file || !pendingPinPos || !selectedDesenho) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `projetos/${projeto.id}/desenhos-obra/pins/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('projeto-files')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('projeto-files')
        .getPublicUrl(path)

      const { data, error } = await supabase
        .from('projeto_desenho_pins')
        .insert({
          desenho_id: selectedDesenho.id,
          pos_x: pendingPinPos.x,
          pos_y: pendingPinPos.y,
          pagina: currentPage,
          foto_url: publicUrl,
          foto_path: path,
          titulo: pinForm.titulo.trim() || null,
          descricao: pinForm.descricao.trim() || null,
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error
      setPins(prev => [...prev, data])
      setPendingPinPos(null)
      setPinForm({ titulo: '', descricao: '' })
      toast.success('Pin adicionado')
    } catch (err) {
      toast.error('Erro', err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePin = (pin) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Pin',
      message: 'Eliminar este pin e a foto associada?',
      type: 'danger',
      onConfirm: async () => {
        try {
          if (pin.foto_path) await supabase.storage.from('projeto-files').remove([pin.foto_path])
          await supabase.from('projeto_desenho_pins').delete().eq('id', pin.id)
          setPins(prev => prev.filter(p => p.id !== pin.id))
        } catch (err) {
          toast.error('Erro', err.message)
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const especialidades = ['Arquitetura', 'Estruturas', 'Elétrico', 'AVAC', 'Hidráulica', 'Paisagismo', 'Interiores']
  const tipos = [
    { value: 'planta', label: 'Planta' },
    { value: 'corte', label: 'Corte' },
    { value: 'alcado', label: 'Alçado' },
    { value: 'detalhe', label: 'Detalhe' },
    { value: 'mapa_quantidades', label: 'Mapa Quantidades' }
  ]

  const drawColors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#000000']

  // Group drawings by especialidade
  const desenhosByEsp = desenhos.reduce((acc, d) => {
    const esp = d.especialidade || 'Outros'
    if (!acc[esp]) acc[esp] = []
    acc[esp].push(d)
    return acc
  }, {})

  const isPDF = selectedDesenho?.filename?.toLowerCase().endsWith('.pdf')

  if (loading) {
    return (
      <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--verde)', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--brown-light)', margin: 0 }}>A carregar desenhos...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', color: 'var(--brown)', fontFamily: 'Cormorant Garamond, serif', fontSize: '18px' }}>
              Desenhos em Uso Obra
            </h3>
            <p style={{ margin: 0, color: 'var(--brown-light)', fontSize: '13px' }}>
              {desenhos.length} desenho{desenhos.length !== 1 ? 's' : ''} activos
            </p>
          </div>
          <button
            onClick={() => setShowAddDesenho(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', background: 'var(--verde)', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Adicionar Desenho
          </button>
        </div>
      </div>

      {/* Add Drawing Form */}
      {showAddDesenho && (
        <div className="card" style={{ padding: '20px', marginBottom: '16px', border: '2px solid var(--verde)' }}>
          <h4 style={{ margin: '0 0 16px', color: 'var(--brown)' }}>Novo Desenho</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Nome *</label>
              <input
                value={desenhoForm.nome}
                onChange={e => setDesenhoForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Planta Piso 0 - Arquitetura"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                  borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Especialidade</label>
              <select
                value={desenhoForm.especialidade}
                onChange={e => setDesenhoForm(prev => ({ ...prev, especialidade: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                  borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)'
                }}
              >
                {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Tipo</label>
                <select
                  value={desenhoForm.tipo}
                  onChange={e => setDesenhoForm(prev => ({ ...prev, tipo: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                    borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)'
                  }}
                >
                  {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ width: '80px' }}>
                <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Versão</label>
                <input
                  value={desenhoForm.versao}
                  onChange={e => setDesenhoForm(prev => ({ ...prev, versao: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                    borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)'
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--brown-light)', marginBottom: '4px', display: 'block' }}>Descrição</label>
            <textarea
              value={desenhoForm.descricao}
              onChange={e => setDesenhoForm(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Notas sobre o desenho..."
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid var(--stone)',
                borderRadius: '8px', fontSize: '13px', background: 'var(--off-white)', resize: 'vertical'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAddDesenho(false)}
              style={{
                padding: '8px 16px', background: 'transparent', color: 'var(--brown-light)',
                border: '1px solid var(--stone)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!desenhoForm.nome.trim() || uploading}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', background: 'var(--verde)', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', opacity: !desenhoForm.nome.trim() ? 0.5 : 1
              }}
            >
              {uploading ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
              Selecionar Ficheiro (PDF/Imagem)
            </button>
          </div>
        </div>
      )}

      {/* Two-panel layout: List + Viewer */}
      <div style={{ display: 'flex', gap: '16px', minHeight: '600px' }}>
        {/* Left: Drawing list */}
        <div style={{ width: selectedDesenho ? '280px' : '100%', flexShrink: 0, transition: 'width 0.3s' }}>
          {desenhos.length === 0 ? (
            <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
              <Layers size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Sem desenhos</h3>
              <p style={{ color: 'var(--brown-light)', margin: '0 0 16px', fontSize: '13px' }}>
                Adicione desenhos de projeto entregues para execução da obra
              </p>
              <button
                onClick={() => setShowAddDesenho(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 20px', background: 'var(--verde)', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                <Plus size={16} /> Primeiro Desenho
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(desenhosByEsp).map(([esp, espDesenhos]) => (
                <div key={esp}>
                  <div style={{
                    padding: '8px 12px', fontSize: '11px', fontWeight: 600,
                    color: 'var(--brown-light)', textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>
                    {esp}
                  </div>
                  {espDesenhos.map(d => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDesenho(d)}
                      style={{
                        padding: '12px 16px',
                        background: selectedDesenho?.id === d.id ? 'var(--verde)' : 'var(--white)',
                        color: selectedDesenho?.id === d.id ? '#fff' : 'var(--brown)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: selectedDesenho?.id === d.id ? 'none' : '1px solid var(--stone)',
                        marginBottom: '4px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} style={{ opacity: 0.7 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.nome}
                          </div>
                          <div style={{ fontSize: '11px', opacity: 0.7 }}>
                            {d.tipo} • {d.versao}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteDesenho(d) }}
                          style={{
                            padding: '4px', background: 'transparent', border: 'none',
                            opacity: 0.5, cursor: 'pointer', display: 'flex',
                            color: selectedDesenho?.id === d.id ? '#fff' : 'var(--brown-light)'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Drawing Viewer with annotations */}
        {selectedDesenho && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div className="card" style={{
              padding: '8px 16px', marginBottom: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Mode buttons */}
                <button
                  onClick={() => setMode('view')}
                  style={{
                    padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px',
                    background: mode === 'view' ? 'var(--brown)' : 'transparent',
                    color: mode === 'view' ? '#fff' : 'var(--brown)',
                    border: mode === 'view' ? 'none' : '1px solid var(--stone)',
                    borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  <Eye size={14} /> Ver
                </button>
                <button
                  onClick={() => setMode('draw')}
                  style={{
                    padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px',
                    background: mode === 'draw' ? 'var(--brown)' : 'transparent',
                    color: mode === 'draw' ? '#fff' : 'var(--brown)',
                    border: mode === 'draw' ? 'none' : '1px solid var(--stone)',
                    borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  <Pencil size={14} /> Desenhar
                </button>
                <button
                  onClick={() => setMode('pin')}
                  style={{
                    padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px',
                    background: mode === 'pin' ? 'var(--brown)' : 'transparent',
                    color: mode === 'pin' ? '#fff' : 'var(--brown)',
                    border: mode === 'pin' ? 'none' : '1px solid var(--stone)',
                    borderRadius: '6px', fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  <MapPin size={14} /> Pin Foto
                </button>
              </div>

              {/* Draw mode controls */}
              {mode === 'draw' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {drawColors.map(c => (
                    <button
                      key={c}
                      onClick={() => setDrawColor(c)}
                      style={{
                        width: '22px', height: '22px', borderRadius: '50%',
                        background: c, border: drawColor === c ? '3px solid var(--brown)' : '2px solid var(--stone)',
                        cursor: 'pointer', padding: 0
                      }}
                    />
                  ))}
                  <select
                    value={drawWidth}
                    onChange={e => setDrawWidth(Number(e.target.value))}
                    style={{
                      padding: '4px 8px', border: '1px solid var(--stone)',
                      borderRadius: '4px', fontSize: '11px', background: 'var(--off-white)'
                    }}
                  >
                    <option value={2}>Fino</option>
                    <option value={3}>Médio</option>
                    <option value={5}>Grosso</option>
                    <option value={8}>Extra</option>
                  </select>
                  <button
                    onClick={() => canvasMethodsRef.current?.undo()}
                    style={{
                      padding: '4px 8px', background: 'transparent', border: '1px solid var(--stone)',
                      borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', color: 'var(--brown)'
                    }}
                  >
                    <Undo2 size={12} /> Desfazer
                  </button>
                  <button
                    onClick={handleSaveAnnotation}
                    style={{
                      padding: '4px 12px', background: 'var(--verde)', color: '#fff',
                      border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600
                    }}
                  >
                    <Save size={12} /> Guardar
                  </button>
                </div>
              )}

              {/* Zoom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setZoom(z => Math.max(50, z - 25))}
                  style={{ padding: '4px', background: 'transparent', border: '1px solid var(--stone)', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                >
                  <ZoomOut size={14} />
                </button>
                <span style={{ fontSize: '11px', color: 'var(--brown-light)', minWidth: '40px', textAlign: 'center' }}>{zoom}%</span>
                <button
                  onClick={() => setZoom(z => Math.min(200, z + 25))}
                  style={{ padding: '4px', background: 'transparent', border: '1px solid var(--stone)', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = selectedDesenho.url
                    a.download = selectedDesenho.filename || selectedDesenho.nome
                    a.click()
                  }}
                  style={{ padding: '4px', background: 'transparent', border: '1px solid var(--stone)', borderRadius: '4px', cursor: 'pointer', display: 'flex', marginLeft: '4px' }}
                  title="Download"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

            {/* Drawing Viewer Area */}
            <div className="card" style={{
              flex: 1, padding: '16px', overflow: 'auto', position: 'relative',
              background: '#f5f5f5'
            }}>
              {mode === 'pin' && !pendingPinPos && (
                <div style={{
                  position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
                  padding: '8px 16px', background: 'var(--brown)', color: '#fff',
                  borderRadius: '20px', fontSize: '12px', zIndex: 20, whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  Clique na planta para posicionar o pin
                </div>
              )}

              <div
                ref={viewerRef}
                onClick={handleViewerClick}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top left',
                  cursor: mode === 'pin' ? 'crosshair' : mode === 'draw' ? 'crosshair' : 'default'
                }}
              >
                {isPDF ? (
                  <iframe
                    src={`${selectedDesenho.url}#toolbar=0`}
                    style={{
                      width: '100%',
                      minWidth: '800px',
                      height: '80vh',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                    title={selectedDesenho.nome}
                  />
                ) : (
                  <img
                    src={selectedDesenho.url}
                    alt={selectedDesenho.nome}
                    onLoad={(e) => setImgDimensions({ width: e.target.naturalWidth, height: e.target.naturalHeight })}
                    style={{ maxWidth: '100%', display: 'block', borderRadius: '4px' }}
                  />
                )}

                {/* Drawing canvas overlay (for image files) */}
                {!isPDF && mode === 'draw' && (
                  <DrawingCanvas
                    width={imgDimensions.width}
                    height={imgDimensions.height}
                    annotations={annotations}
                    isDrawing={mode === 'draw'}
                    color={drawColor}
                    lineWidth={drawWidth}
                    onSave={canvasMethodsRef}
                    onStrokeEnd={() => {}}
                  />
                )}

                {/* Existing annotation strokes (when not in draw mode) */}
                {!isPDF && mode !== 'draw' && annotations.length > 0 && (
                  <canvas
                    ref={el => {
                      if (!el) return
                      const ctx = el.getContext('2d')
                      ctx.clearRect(0, 0, imgDimensions.width, imgDimensions.height)
                      annotations.forEach(ann => {
                        if (ann.tipo === 'desenho' && ann.dados?.paths) {
                          ann.dados.paths.forEach(p => {
                            if (!p.points || p.points.length < 2) return
                            ctx.beginPath()
                            ctx.strokeStyle = p.color || '#EF4444'
                            ctx.lineWidth = p.width || 3
                            ctx.lineCap = 'round'
                            ctx.lineJoin = 'round'
                            ctx.globalAlpha = 0.85
                            ctx.moveTo(p.points[0].x, p.points[0].y)
                            for (let i = 1; i < p.points.length; i++) {
                              ctx.lineTo(p.points[i].x, p.points[i].y)
                            }
                            ctx.stroke()
                            ctx.globalAlpha = 1
                          })
                        }
                      })
                    }}
                    width={imgDimensions.width}
                    height={imgDimensions.height}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '100%', height: '100%',
                      pointerEvents: 'none', zIndex: 1
                    }}
                  />
                )}

                {/* Photo Pins */}
                {pins.map(pin => (
                  <PhotoPin
                    key={pin.id}
                    pin={pin}
                    isEditing={mode === 'pin'}
                    onDelete={handleDeletePin}
                  />
                ))}
              </div>

              {/* Pin creation form */}
              {pendingPinPos && (
                <div style={{
                  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  background: '#fff', borderRadius: '12px', padding: '20px', width: '320px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.3)', zIndex: 10000
                }}>
                  <h4 style={{ margin: '0 0 12px', color: 'var(--brown)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} style={{ color: 'var(--verde)' }} /> Novo Pin com Foto
                  </h4>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'block', marginBottom: '4px' }}>Título</label>
                    <input
                      value={pinForm.titulo}
                      onChange={e => setPinForm(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Fissura parede sala"
                      style={{
                        width: '100%', padding: '8px 12px', border: '1px solid var(--stone)',
                        borderRadius: '6px', fontSize: '13px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'block', marginBottom: '4px' }}>Descrição</label>
                    <textarea
                      value={pinForm.descricao}
                      onChange={e => setPinForm(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Observações..."
                      rows={2}
                      style={{
                        width: '100%', padding: '8px 12px', border: '1px solid var(--stone)',
                        borderRadius: '6px', fontSize: '13px', resize: 'vertical'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setPendingPinPos(null); setPinForm({ titulo: '', descricao: '' }) }}
                      style={{
                        padding: '8px 14px', background: 'transparent', border: '1px solid var(--stone)',
                        borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--brown-light)'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => pinPhotoInputRef.current?.click()}
                      style={{
                        padding: '8px 14px', background: 'var(--verde)', color: '#fff',
                        border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Camera size={14} /> Selecionar Foto
                    </button>
                  </div>
                </div>
              )}
              {/* Backdrop for pin form */}
              {pendingPinPos && (
                <div
                  onClick={() => { setPendingPinPos(null); setPinForm({ titulo: '', descricao: '' }) }}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999 }}
                />
              )}
            </div>

            {/* Annotations count */}
            <div style={{
              padding: '8px 16px', fontSize: '11px', color: 'var(--brown-light)',
              display: 'flex', justifyContent: 'space-between'
            }}>
              <span>{annotations.length} anotação{annotations.length !== 1 ? 'ões' : ''} • {pins.length} pin{pins.length !== 1 ? 's' : ''}</span>
              <span>{selectedDesenho.especialidade} • {selectedDesenho.tipo} • {selectedDesenho.versao}</span>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.[0]) handleUploadDesenho(e.target.files[0])
          e.target.value = ''
        }}
      />
      <input
        ref={pinPhotoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.[0]) handlePinPhotoUpload(e.target.files[0])
          e.target.value = ''
        }}
      />

      {uploading && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', padding: '12px 20px',
          background: 'var(--brown)', color: '#fff', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <Loader2 size={16} className="spin" /> A carregar...
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
