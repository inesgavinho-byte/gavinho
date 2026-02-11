// =====================================================
// PROJETO ATAS COMPONENT - Google Docs Style
// Interface simplificada com separadores de documento
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, FileText, Edit2, Trash2, Save, X, Calendar, User, Clock,
  Loader2, Eye, Printer, Download, ChevronDown, ChevronRight, Users,
  MapPin, CheckCircle, Bold, Italic, Underline, List,
  ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2,
  CheckSquare, Square, ClipboardList, MoreVertical, Hash,
  FolderOpen, File, GripVertical
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'

// Status config
const statusConfig = {
  'rascunho': { label: 'Rascunho', color: 'var(--brown-light)', bg: 'var(--stone)' },
  'pendente_aprovacao': { label: 'Pendente Aprovacao', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.15)' },
  'aprovada': { label: 'Aprovada', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  'arquivada': { label: 'Arquivada', color: 'var(--brown-light)', bg: 'var(--cream)' }
}

// Default document sections
const defaultSections = [
  { id: 'diario_bordo', name: 'DIARIO DE BORDO', tipo: 'section', expanded: true },
  { id: 'reunioes_equipa', name: 'REUNIOES EQUIPA', tipo: 'section', expanded: true },
  { id: 'reunioes_cliente', name: 'REUNIOES CLIENTE', tipo: 'section', expanded: true },
  { id: 'reunioes_obra', name: 'REUNIOES OBRA', tipo: 'section', expanded: false },
  { id: 'outras', name: 'OUTRAS', tipo: 'section', expanded: false }
]

// Rich Text Editor Component - Simplified
function SimpleRichEditor({ value, onChange, placeholder, minHeight = '300px' }) {
  const editorRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const execCommand = (command, val = null) => {
    document.execCommand(command, false, val)
    editorRef.current?.focus()
    handleInput()
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertLink = () => {
    const url = prompt('URL do link:')
    if (url) {
      execCommand('createLink', url)
    }
  }

  const ToolbarButton = ({ onClick, title, children, active }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: '6px 8px',
        border: 'none',
        background: active ? 'var(--stone)' : 'transparent',
        borderRadius: '4px',
        cursor: 'pointer',
        color: 'var(--brown)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s'
      }}
      onMouseEnter={(e) => !active && (e.target.style.background = 'rgba(0,0,0,0.05)')}
      onMouseLeave={(e) => !active && (e.target.style.background = 'transparent')}
    >
      {children}
    </button>
  )

  return (
    <div style={{
      border: `1px solid ${isFocused ? 'var(--brown)' : 'transparent'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      background: 'white'
    }}>
      {/* Floating Toolbar - Only show when focused */}
      {isFocused && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '8px 12px',
          background: 'var(--cream)',
          borderBottom: '1px solid var(--stone)'
        }}>
          <ToolbarButton onClick={() => execCommand('bold')} title="Negrito">
            <Bold size={15} />
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('italic')} title="Italico">
            <Italic size={15} />
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('underline')} title="Sublinhado">
            <Underline size={15} />
          </ToolbarButton>
          <div style={{ width: '1px', height: '20px', background: 'var(--stone)', margin: '0 6px' }} />
          <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Lista">
            <List size={15} />
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Lista Numerada">
            <ListOrdered size={15} />
          </ToolbarButton>
          <div style={{ width: '1px', height: '20px', background: 'var(--stone)', margin: '0 6px' }} />
          <select
            onChange={(e) => execCommand('formatBlock', e.target.value)}
            style={{
              padding: '4px 8px',
              border: '1px solid var(--stone)',
              background: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--brown)',
              cursor: 'pointer'
            }}
          >
            <option value="p">Texto</option>
            <option value="h2">Titulo</option>
            <option value="h3">Subtitulo</option>
          </select>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        data-placeholder={placeholder}
        style={{
          minHeight,
          padding: '20px 24px',
          outline: 'none',
          fontSize: '14px',
          lineHeight: '1.8',
          color: 'var(--brown)',
          background: 'white'
        }}
      />
    </div>
  )
}

// Document Separator Item in sidebar with smooth collapse/expand animation
function SeparatorItem({ section, atas, isExpanded, onToggle, onSelectAta, selectedAtaId, onAddAta }) {
  const sectionAtas = atas.filter(a => a.secao === section.id)
  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(0)

  // Calculate content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [sectionAtas.length, isExpanded])

  return (
    <div style={{ marginBottom: '4px' }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          cursor: 'pointer',
          borderRadius: '8px',
          background: isExpanded ? 'rgba(90, 74, 58, 0.08)' : 'transparent',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => !isExpanded && (e.currentTarget.style.background = 'rgba(90, 74, 58, 0.05)')}
        onMouseLeave={(e) => !isExpanded && (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{
          transition: 'transform 0.2s ease-out',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ChevronRight size={14} style={{ color: 'var(--brown-light)' }} />
        </div>
        <Hash size={14} style={{ color: 'var(--brown)' }} />
        <span style={{
          flex: 1,
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--brown)',
          letterSpacing: '0.3px'
        }}>
          {section.name}
        </span>
        <span style={{
          fontSize: '11px',
          color: 'var(--brown-light)',
          background: 'var(--cream)',
          padding: '2px 6px',
          borderRadius: '10px'
        }}>
          {sectionAtas.length}
        </span>
      </div>

      {/* Animated collapsible content */}
      <div style={{
        overflow: 'hidden',
        transition: 'max-height 0.25s ease-out, opacity 0.2s ease-out',
        maxHeight: isExpanded ? `${contentHeight + 20}px` : '0px',
        opacity: isExpanded ? 1 : 0
      }}>
        <div ref={contentRef} style={{ paddingLeft: '20px' }}>
          {sectionAtas.map(ata => (
            <div
              key={ata.id}
              onClick={() => onSelectAta(ata)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                borderRadius: '6px',
                marginBottom: '2px',
                background: selectedAtaId === ata.id ? 'var(--brown)' : 'transparent',
                color: selectedAtaId === ata.id ? 'white' : 'var(--brown)',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => selectedAtaId !== ata.id && (e.currentTarget.style.background = 'rgba(90, 74, 58, 0.05)')}
              onMouseLeave={(e) => selectedAtaId !== ata.id && (e.currentTarget.style.background = 'transparent')}
            >
              <File size={13} style={{ opacity: 0.7 }} />
              <span style={{
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {ata.titulo || `Ata #${ata.numero_ata}`}
              </span>
            </div>
          ))}

          {/* Add new ata to this section */}
          <div
            onClick={() => onAddAta(section.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '6px',
              color: 'var(--brown-light)',
              fontSize: '12px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(90, 74, 58, 0.05)'
              e.currentTarget.style.color = 'var(--brown)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--brown-light)'
            }}
          >
            <Plus size={13} />
            <span>Nova ata</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Document Header Component
function DocumentHeader({ ata, projeto, onUpdate, onSave, saving, isNew }) {
  return (
    <div style={{
      textAlign: 'center',
      paddingBottom: '20px',
      marginBottom: '24px',
      borderBottom: '2px solid var(--brown)'
    }}>
      {/* Project Info */}
      <div style={{
        fontSize: '11px',
        color: 'var(--brown-light)',
        letterSpacing: '1px',
        marginBottom: '8px',
        textTransform: 'uppercase'
      }}>
        {projeto.codigo} | {projeto.nome}
      </div>

      {/* Main Title - Editable */}
      <input
        type="text"
        value={ata.titulo || ''}
        onChange={(e) => onUpdate({ titulo: e.target.value })}
        placeholder="Titulo da Ata"
        style={{
          width: '100%',
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--brown)',
          textAlign: 'center',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          padding: '8px 0'
        }}
      />

      {/* Meta Info Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        marginTop: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} style={{ color: 'var(--brown-light)' }} />
          <input
            type="date"
            value={ata.data_reuniao || ''}
            onChange={(e) => onUpdate({ data_reuniao: e.target.value })}
            style={{
              fontSize: '13px',
              color: 'var(--brown)',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={14} style={{ color: 'var(--brown-light)' }} />
          <input
            type="text"
            value={ata.local || ''}
            onChange={(e) => onUpdate({ local: e.target.value })}
            placeholder="Local"
            style={{
              fontSize: '13px',
              color: 'var(--brown)',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '120px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} style={{ color: 'var(--brown-light)' }} />
          <input
            type="time"
            value={ata.hora_inicio || ''}
            onChange={(e) => onUpdate({ hora_inicio: e.target.value })}
            style={{
              fontSize: '13px',
              color: 'var(--brown)',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '70px'
            }}
          />
          <span style={{ color: 'var(--brown-light)' }}>-</span>
          <input
            type="time"
            value={ata.hora_fim || ''}
            onChange={(e) => onUpdate({ hora_fim: e.target.value })}
            style={{
              fontSize: '13px',
              color: 'var(--brown)',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '70px'
            }}
          />
        </div>
      </div>
    </div>
  )
}

// Document Section Component
function DocumentSection({ title, icon: Icon, children, color = 'var(--brown)' }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
        paddingBottom: '6px',
        borderBottom: `2px solid ${color}`
      }}>
        {Icon && <Icon size={18} style={{ color }} />}
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 700,
          color,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

// Participantes inline editor
function ParticipantesInline({ participantes, onChange }) {
  const [inputValue, setInputValue] = useState('')

  const addParticipante = () => {
    if (inputValue.trim()) {
      // Parse "Nome - Cargo (Entidade)" format
      const match = inputValue.match(/^([^-]+)(?:\s*-\s*([^(]+))?(?:\s*\(([^)]+)\))?$/)
      if (match) {
        const newP = {
          nome: match[1].trim(),
          cargo: match[2]?.trim() || '',
          entidade: match[3]?.trim() || ''
        }
        onChange([...participantes, newP])
        setInputValue('')
      }
    }
  }

  const removeParticipante = (index) => {
    onChange(participantes.filter((_, i) => i !== index))
  }

  return (
    <div>
      {participantes.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {participantes.map((p, idx) => (
            <div
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'var(--cream)',
                borderRadius: '20px',
                fontSize: '13px'
              }}
            >
              <span style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--brown)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600
              }}>
                {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </span>
              <span style={{ color: 'var(--brown)' }}>
                {p.nome}
                {p.cargo && <span style={{ color: 'var(--brown-light)' }}> - {p.cargo}</span>}
              </span>
              <button
                onClick={() => removeParticipante(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  opacity: 0.5
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addParticipante()}
          placeholder="Nome - Cargo (Entidade) e pressione Enter"
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px dashed var(--stone)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--brown)',
            outline: 'none',
            background: 'transparent'
          }}
        />
      </div>
    </div>
  )
}

// Acoes inline editor
function AcoesInline({ acoes, onChange }) {
  const [inputValue, setInputValue] = useState('')

  const addAcao = () => {
    if (inputValue.trim()) {
      onChange([...acoes, {
        descricao: inputValue.trim(),
        responsavel: '',
        prazo: '',
        concluida: false
      }])
      setInputValue('')
    }
  }

  const toggleConcluida = (index) => {
    const updated = [...acoes]
    updated[index].concluida = !updated[index].concluida
    onChange(updated)
  }

  const updateAcao = (index, field, value) => {
    const updated = [...acoes]
    updated[index][field] = value
    onChange(updated)
  }

  const removeAcao = (index) => {
    onChange(acoes.filter((_, i) => i !== index))
  }

  return (
    <div>
      {acoes.map((acao, idx) => (
        <div
          key={idx}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px',
            background: acao.concluida ? 'rgba(122, 158, 122, 0.1)' : 'var(--cream)',
            borderRadius: '8px',
            marginBottom: '8px'
          }}
        >
          <button
            onClick={() => toggleConcluida(idx)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginTop: '2px'
            }}
          >
            {acao.concluida ? (
              <CheckSquare size={18} color="var(--success)" />
            ) : (
              <Square size={18} color="var(--brown-light)" />
            )}
          </button>

          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={acao.descricao}
              onChange={(e) => updateAcao(idx, 'descricao', e.target.value)}
              style={{
                width: '100%',
                fontSize: '14px',
                color: 'var(--brown)',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                textDecoration: acao.concluida ? 'line-through' : 'none',
                opacity: acao.concluida ? 0.6 : 1
              }}
            />
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={12} style={{ color: 'var(--brown-light)' }} />
                <input
                  type="text"
                  value={acao.responsavel}
                  onChange={(e) => updateAcao(idx, 'responsavel', e.target.value)}
                  placeholder="Responsavel"
                  style={{
                    fontSize: '12px',
                    color: 'var(--brown-light)',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} style={{ color: 'var(--brown-light)' }} />
                <input
                  type="date"
                  value={acao.prazo}
                  onChange={(e) => updateAcao(idx, 'prazo', e.target.value)}
                  style={{
                    fontSize: '12px',
                    color: 'var(--brown-light)',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent'
                  }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => removeAcao(idx)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              opacity: 0.5
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addAcao()}
          placeholder="+ Adicionar acao e pressione Enter"
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px dashed var(--stone)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--brown)',
            outline: 'none',
            background: 'transparent'
          }}
        />
      </div>
    </div>
  )
}

// Print/PDF Preview Component (kept from original)
function AtaPreview({ ata, projeto, onClose }) {
  const printRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  const handlePrint = () => {
    const printContent = printRef.current
    const printWindow = window.open('', '_blank')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ata ${ata.numero_ata} - ${projeto.nome}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Georgia', serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #5a4a3a; }
            .title { font-size: 20px; margin-top: 10px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-item { font-size: 14px; }
            .meta-label { font-weight: bold; color: #666; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
            .content { font-size: 14px; line-height: 1.8; }
            .participants { list-style: none; }
            .participants li { padding: 5px 0; border-bottom: 1px dotted #ddd; }
            .actions { margin-top: 10px; }
            .action { padding: 8px; background: #f5f5f5; margin-bottom: 5px; border-radius: 4px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
            .signature { text-align: center; }
            .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const element = printRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`Ata_${ata.numero_ata}_${projeto.codigo || projeto.nome}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      toast.error('Erro', 'Erro ao exportar PDF')
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Actions Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--stone)',
          background: 'var(--cream)'
        }}>
          <span style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '15px' }}>
            Pre-visualizacao
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'white',
                border: '1px solid var(--stone)',
                borderRadius: '10px',
                cursor: 'pointer',
                color: 'var(--brown)',
                fontWeight: 500,
                fontSize: '13px'
              }}
            >
              <Printer size={16} />
              Imprimir
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'var(--brown)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                color: 'white',
                fontWeight: 500,
                fontSize: '13px',
                opacity: exporting ? 0.7 : 1
              }}
            >
              {exporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              PDF
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '10px 12px',
                background: 'white',
                border: '1px solid var(--stone)',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex'
              }}
            >
              <X size={16} color="var(--brown-light)" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f0f0f0' }}>
          <div ref={printRef} style={{
            background: 'white',
            padding: '48px',
            maxWidth: '800px',
            margin: '0 auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5a4a3a' }}>
                {projeto.cliente || 'GAVINHO ARQUITECTOS'}
              </div>
              <div style={{ fontSize: '20px', marginTop: '10px' }}>
                ATA DE REUNIAO N.º {ata.numero_ata}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                {projeto.nome}
              </div>
            </div>

            {/* Meta Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', fontSize: '14px' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#666' }}>Data</div>
                <div>{formatDate(ata.data_reuniao)}</div>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#666' }}>Local</div>
                <div>{ata.local || '-'}</div>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#666' }}>Hora Inicio</div>
                <div>{ata.hora_inicio || '-'}</div>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', color: '#666' }}>Hora Fim</div>
                <div>{ata.hora_fim || '-'}</div>
              </div>
            </div>

            {/* Participantes */}
            {ata.participantes?.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Participantes
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {ata.participantes.map((p, idx) => (
                    <li key={idx} style={{ padding: '5px 0', borderBottom: '1px dotted #ddd' }}>
                      <strong>{p.nome}</strong>
                      {p.cargo && ` - ${p.cargo}`}
                      {p.entidade && ` (${p.entidade})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conteudo */}
            {ata.conteudo && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Desenvolvimento
                </div>
                <div
                  style={{ fontSize: '14px', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: ata.conteudo }}
                />
              </div>
            )}

            {/* Acoes */}
            {ata.acoes?.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Acoes a Realizar
                </div>
                {ata.acoes.map((a, idx) => (
                  <div key={idx} style={{ padding: '8px', background: '#f5f5f5', marginBottom: '5px', borderRadius: '4px' }}>
                    <div>{a.descricao}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      {a.responsavel && `Responsavel: ${a.responsavel}`}
                      {a.prazo && ` | Prazo: ${a.prazo}`}
                      {a.concluida && ' | Concluida'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Assinaturas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '60px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '10px' }}>
                  Elaborado por
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '10px' }}>
                  Aprovado por
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// LocalStorage key for expanded sections
const STORAGE_KEY_PREFIX = 'gavinho_atas_expanded_'

// Main Component
export default function ProjetoAtas({ projeto }) {
  const [atas, setAtas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedAta, setSelectedAta] = useState(null)
  const [previewAta, setPreviewAta] = useState(null)
  const [sections, setSections] = useState(defaultSections)
  const toast = useToast()
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null })

  // Initialize expanded sections from localStorage or use defaults
  const [expandedSections, setExpandedSections] = useState(() => {
    if (typeof window !== 'undefined' && projeto?.id) {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projeto.id}`)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return ['diario_bordo', 'reunioes_equipa', 'reunioes_cliente']
        }
      }
    }
    return ['diario_bordo', 'reunioes_equipa', 'reunioes_cliente']
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Auto-save timer ref
  const autoSaveTimer = useRef(null)

  useEffect(() => {
    if (projeto?.id) {
      loadAtas()
      // Load expanded sections from localStorage when project changes
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projeto.id}`)
      if (stored) {
        try {
          setExpandedSections(JSON.parse(stored))
        } catch {
          // Keep default if parse fails
        }
      }
    }
  }, [projeto?.id])

  // Save expanded sections to localStorage whenever they change
  useEffect(() => {
    if (projeto?.id && typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${projeto.id}`, JSON.stringify(expandedSections))
    }
  }, [expandedSections, projeto?.id])

  // Auto-save when ata changes
  useEffect(() => {
    if (selectedAta && hasChanges) {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
      autoSaveTimer.current = setTimeout(() => {
        handleSave()
      }, 2000) // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
      }
    }
  }, [selectedAta, hasChanges])

  const loadAtas = async () => {
    try {
      const { data, error } = await supabase
        .from('projeto_atas')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('data_reuniao', { ascending: false })

      if (error) throw error

      // Add default section if not set
      const atasWithSection = (data || []).map(ata => ({
        ...ata,
        secao: ata.secao || 'diario_bordo'
      }))

      setAtas(atasWithSection)
    } catch (err) {
      console.error('Erro ao carregar atas:', err)
    } finally {
      setLoading(false)
    }
  }

  const createNewAta = (sectionId = 'diario_bordo') => {
    const newAta = {
      id: 'new_' + Date.now(),
      isNew: true,
      titulo: '',
      data_reuniao: new Date().toISOString().split('T')[0],
      local: '',
      hora_inicio: '',
      hora_fim: '',
      participantes: [],
      conteudo: '',
      acoes: [],
      secao: sectionId,
      status: 'rascunho'
    }
    setSelectedAta(newAta)
    setHasChanges(true)
  }

  const updateSelectedAta = (updates) => {
    setSelectedAta(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!selectedAta) return
    if (!selectedAta.titulo?.trim() || !selectedAta.data_reuniao) {
      toast.warning('Aviso', 'Preencha o titulo e a data da reuniao')
      return
    }

    setSaving(true)
    try {
      const payload = {
        projeto_id: projeto.id,
        fase: projeto.fase_atual,
        titulo: selectedAta.titulo,
        data_reuniao: selectedAta.data_reuniao,
        local: selectedAta.local,
        hora_inicio: selectedAta.hora_inicio,
        hora_fim: selectedAta.hora_fim,
        participantes: selectedAta.participantes,
        conteudo: selectedAta.conteudo,
        acoes: selectedAta.acoes,
        secao: selectedAta.secao,
        status: selectedAta.status || 'rascunho'
      }

      if (selectedAta.isNew) {
        const { data, error } = await supabase
          .from('projeto_atas')
          .insert([payload])
          .select()
          .single()

        if (error) throw error

        setSelectedAta({ ...data, isNew: false })
        setAtas(prev => [data, ...prev])
      } else {
        const { error } = await supabase
          .from('projeto_atas')
          .update(payload)
          .eq('id', selectedAta.id)

        if (error) throw error

        setAtas(prev => prev.map(a => a.id === selectedAta.id ? { ...a, ...payload } : a))
      }

      setHasChanges(false)
    } catch (err) {
      console.error('Erro ao guardar ata:', err)
      toast.error('Erro', 'Erro ao guardar ata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAta || selectedAta.isNew) {
      setSelectedAta(null)
      return
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Ata',
      message: 'Tem certeza que deseja eliminar esta ata?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('projeto_atas')
            .delete()
            .eq('id', selectedAta.id)

          if (error) throw error

          setAtas(prev => prev.filter(a => a.id !== selectedAta.id))
          setSelectedAta(null)
        } catch (err) {
          console.error('Erro ao eliminar ata:', err)
          toast.error('Erro', 'Erro ao eliminar ata')
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const toggleSection = (sectionId) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 180px)',
      minHeight: '500px',
      background: 'var(--cream)',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      {/* Left Sidebar - Document Separators */}
      <div style={{
        width: '280px',
        borderRight: '1px solid var(--stone)',
        background: 'white',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--stone)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                fontSize: '11px',
                color: 'var(--brown-light)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Separadores do
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--brown)'
              }}>
                documento
              </div>
            </div>
            <button
              onClick={() => createNewAta()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--stone)',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brown)'
              }}
              title="Nova Ata"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Sections List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px'
        }}>
          {sections.map(section => (
            <SeparatorItem
              key={section.id}
              section={section}
              atas={atas}
              isExpanded={expandedSections.includes(section.id)}
              onToggle={() => toggleSection(section.id)}
              onSelectAta={(ata) => setSelectedAta(ata)}
              selectedAtaId={selectedAta?.id}
              onAddAta={(sectionId) => createNewAta(sectionId)}
            />
          ))}
        </div>

        {/* Sidebar Footer - Stats */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--stone)',
          background: 'var(--cream)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--brown-light)'
          }}>
            <span>Total: {atas.length} atas</span>
            <span>{atas.filter(a => a.status === 'rascunho').length} rascunhos</span>
          </div>
        </div>
      </div>

      {/* Main Content - Document Editor */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f5f5'
      }}>
        {selectedAta ? (
          <>
            {/* Document Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              background: 'white',
              borderBottom: '1px solid var(--stone)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setSelectedAta(null)}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--cream)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--brown)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <X size={14} />
                  Fechar
                </button>

                {hasChanges && (
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--brown-light)',
                    fontStyle: 'italic'
                  }}>
                    {saving ? 'A guardar...' : 'Alteracoes por guardar'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Section Selector */}
                <select
                  value={selectedAta.secao || 'diario_bordo'}
                  onChange={(e) => updateSelectedAta({ secao: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: 'var(--brown)',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {/* Status */}
                <select
                  value={selectedAta.status || 'rascunho'}
                  onChange={(e) => updateSelectedAta({ status: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--stone)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: statusConfig[selectedAta.status || 'rascunho']?.color,
                    background: statusConfig[selectedAta.status || 'rascunho']?.bg,
                    cursor: 'pointer'
                  }}
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="pendente_aprovacao">Pendente</option>
                  <option value="aprovada">Aprovada</option>
                  <option value="arquivada">Arquivada</option>
                </select>

                <button
                  onClick={() => setPreviewAta(selectedAta)}
                  style={{
                    padding: '8px 14px',
                    background: 'white',
                    border: '1px solid var(--stone)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--brown)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={14} />
                  Preview
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--brown)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  Guardar
                </button>

                <button
                  onClick={handleDelete}
                  style={{
                    padding: '8px',
                    background: 'rgba(199, 83, 83, 0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--error)',
                    display: 'flex'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px 32px'
            }}>
              <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                background: 'white',
                borderRadius: '4px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                padding: '32px 48px',
                minHeight: '600px'
              }}>
                {/* Document Header */}
                <DocumentHeader
                  ata={selectedAta}
                  projeto={projeto}
                  onUpdate={updateSelectedAta}
                  onSave={handleSave}
                  saving={saving}
                  isNew={selectedAta.isNew}
                />

                {/* Participantes Section */}
                <DocumentSection title="Participantes" icon={Users} color="#5a4a3a">
                  <ParticipantesInline
                    participantes={selectedAta.participantes || []}
                    onChange={(p) => updateSelectedAta({ participantes: p })}
                  />
                </DocumentSection>

                {/* Conteudo / Desenvolvimento */}
                <DocumentSection title="Desenvolvimento" icon={FileText} color="#4a6741">
                  <SimpleRichEditor
                    value={selectedAta.conteudo || ''}
                    onChange={(html) => updateSelectedAta({ conteudo: html })}
                    placeholder="Descreva o desenvolvimento da reuniao..."
                    minHeight="200px"
                  />
                </DocumentSection>

                {/* Acoes */}
                <DocumentSection title="Acoes a Realizar" icon={CheckSquare} color="#8b6914">
                  <AcoesInline
                    acoes={selectedAta.acoes || []}
                    onChange={(a) => updateSelectedAta({ acoes: a })}
                  />
                </DocumentSection>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '24px',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
            }}>
              <FileText size={48} style={{ color: 'var(--brown-light)', opacity: 0.4 }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{
                color: 'var(--brown)',
                fontWeight: 500,
                fontSize: '16px',
                marginBottom: '8px'
              }}>
                Selecione ou crie uma ata
              </p>
              <p style={{
                color: 'var(--brown-light)',
                fontSize: '14px'
              }}>
                Use os separadores a esquerda para navegar
              </p>
            </div>
            <button
              onClick={() => createNewAta()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 24px',
                background: 'var(--brown)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px',
                marginTop: '8px'
              }}
            >
              <Plus size={18} />
              Nova Ata
            </button>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewAta && (
        <AtaPreview
          ata={previewAta}
          projeto={projeto}
          onClose={() => setPreviewAta(null)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type || 'danger'}
        confirmText="Confirmar"
      />
    </div>
  )
}
