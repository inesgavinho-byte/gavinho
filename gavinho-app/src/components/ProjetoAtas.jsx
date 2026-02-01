// =====================================================
// PROJETO ATAS COMPONENT
// Atas de reuniao com editor rich text, print e PDF
// =====================================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, FileText, Edit2, Trash2, Save, X, Calendar, User, Clock,
  Loader2, Eye, Printer, Download, ChevronDown, ChevronUp, Users,
  MapPin, CheckCircle, Bold, Italic, Underline, List,
  ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2,
  CheckSquare, Square, ClipboardList
} from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// Status config
const statusConfig = {
  'rascunho': { label: 'Rascunho', color: 'var(--brown-light)', bg: 'var(--stone)' },
  'pendente_aprovacao': { label: 'Pendente Aprovacao', color: 'var(--warning)', bg: 'rgba(201, 168, 130, 0.15)' },
  'aprovada': { label: 'Aprovada', color: 'var(--success)', bg: 'rgba(122, 158, 122, 0.15)' },
  'arquivada': { label: 'Arquivada', color: 'var(--brown-light)', bg: 'var(--cream)' }
}

// Styled Input Component
const StyledInput = ({ label, required, icon: Icon, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && (
      <label style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--brown)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        {Icon && <Icon size={14} style={{ opacity: 0.7 }} />}
        {label}
        {required && <span style={{ color: 'var(--error)' }}>*</span>}
      </label>
    )}
    <input
      {...props}
      style={{
        padding: '12px 14px',
        border: '1px solid var(--stone)',
        borderRadius: '10px',
        fontSize: '14px',
        color: 'var(--brown)',
        background: 'white',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        width: '100%',
        ...props.style
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'var(--brown)'
        e.target.style.boxShadow = '0 0 0 3px rgba(90, 74, 58, 0.1)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--stone)'
        e.target.style.boxShadow = 'none'
        props.onBlur?.(e)
      }}
    />
  </div>
)

// Styled Select Component
const StyledSelect = ({ label, required, children, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    {label && (
      <label style={{
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--brown)'
      }}>
        {label}
        {required && <span style={{ color: 'var(--error)' }}>*</span>}
      </label>
    )}
    <select
      {...props}
      style={{
        padding: '12px 14px',
        border: '1px solid var(--stone)',
        borderRadius: '10px',
        fontSize: '14px',
        color: 'var(--brown)',
        background: 'white',
        outline: 'none',
        cursor: 'pointer',
        width: '100%',
        ...props.style
      }}
    >
      {children}
    </select>
  </div>
)

// Section Header Component
const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--stone)'
  }}>
    {Icon && (
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'var(--brown)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={18} />
      </div>
    )}
    <div>
      <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '15px' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>{subtitle}</div>}
    </div>
  </div>
)

// Rich Text Editor Component
function RichTextEditor({ value, onChange, placeholder }) {
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
        padding: '8px',
        border: 'none',
        background: active ? 'var(--stone)' : 'transparent',
        borderRadius: '6px',
        cursor: 'pointer',
        color: 'var(--brown)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s'
      }}
      onMouseEnter={(e) => !active && (e.target.style.background = 'var(--cream)')}
      onMouseLeave={(e) => !active && (e.target.style.background = 'transparent')}
    >
      {children}
    </button>
  )

  const Divider = () => (
    <div style={{ width: '1px', height: '24px', background: 'var(--stone)', margin: '0 4px' }} />
  )

  return (
    <div style={{
      border: `2px solid ${isFocused ? 'var(--brown)' : 'var(--stone)'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      boxShadow: isFocused ? '0 0 0 3px rgba(90, 74, 58, 0.1)' : 'none'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '8px 12px',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--stone)',
        flexWrap: 'wrap'
      }}>
        <ToolbarButton onClick={() => execCommand('bold')} title="Negrito (Ctrl+B)">
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} title="Italico (Ctrl+I)">
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} title="Sublinhado (Ctrl+U)">
          <Underline size={16} />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Lista">
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Lista Numerada">
          <ListOrdered size={16} />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Alinhar Esquerda">
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Centrar">
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyRight')} title="Alinhar Direita">
          <AlignRight size={16} />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={insertLink} title="Inserir Link">
          <Link2 size={16} />
        </ToolbarButton>
        <Divider />
        <select
          onChange={(e) => execCommand('formatBlock', e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid var(--stone)',
            background: 'white',
            borderRadius: '6px',
            fontSize: '13px',
            color: 'var(--brown)',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="p">Normal</option>
          <option value="h2">Titulo</option>
          <option value="h3">Subtitulo</option>
        </select>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        style={{
          minHeight: '180px',
          padding: '16px',
          outline: 'none',
          fontSize: '14px',
          lineHeight: '1.7',
          color: 'var(--brown)',
          background: 'white'
        }}
      />
    </div>
  )
}

// Participantes Editor
function ParticipantesEditor({ participantes, onChange }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newParticipante, setNewParticipante] = useState({ nome: '', cargo: '', entidade: '' })

  const addParticipante = () => {
    if (newParticipante.nome.trim()) {
      onChange([...participantes, { ...newParticipante }])
      setNewParticipante({ nome: '', cargo: '', entidade: '' })
      setShowAdd(false)
    }
  }

  const removeParticipante = (index) => {
    onChange(participantes.filter((_, i) => i !== index))
  }

  return (
    <div style={{
      background: 'var(--cream)',
      borderRadius: '12px',
      padding: '16px'
    }}>
      {participantes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {participantes.map((p, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              background: 'white',
              borderRadius: '24px',
              fontSize: '13px',
              border: '1px solid var(--stone)'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--brown)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600
              }}>
                {p.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--brown)' }}>{p.nome}</div>
                {(p.cargo || p.entidade) && (
                  <div style={{ fontSize: '11px', color: 'var(--brown-light)' }}>
                    {[p.cargo, p.entidade].filter(Boolean).join(' • ')}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeParticipante(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  marginLeft: '4px',
                  borderRadius: '4px',
                  display: 'flex'
                }}
              >
                <X size={14} color="var(--brown-light)" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr auto auto',
          gap: '8px',
          alignItems: 'end'
        }}>
          <StyledInput
            type="text"
            placeholder="Nome do participante"
            value={newParticipante.nome}
            onChange={(e) => setNewParticipante({ ...newParticipante, nome: e.target.value })}
            autoFocus
          />
          <StyledInput
            type="text"
            placeholder="Cargo"
            value={newParticipante.cargo}
            onChange={(e) => setNewParticipante({ ...newParticipante, cargo: e.target.value })}
          />
          <StyledInput
            type="text"
            placeholder="Entidade"
            value={newParticipante.entidade}
            onChange={(e) => setNewParticipante({ ...newParticipante, entidade: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && addParticipante()}
          />
          <button
            type="button"
            onClick={addParticipante}
            style={{
              padding: '12px 16px',
              background: 'var(--brown)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
              fontSize: '13px'
            }}
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            style={{
              padding: '12px 14px',
              background: 'white',
              color: 'var(--brown-light)',
              border: '1px solid var(--stone)',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex'
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'white',
            border: '2px dashed var(--stone)',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--brown-light)',
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'center',
            fontWeight: 500,
            transition: 'border-color 0.2s, color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = 'var(--brown)'
            e.target.style.color = 'var(--brown)'
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = 'var(--stone)'
            e.target.style.color = 'var(--brown-light)'
          }}
        >
          <Plus size={16} />
          Adicionar Participante
        </button>
      )}
    </div>
  )
}

// Acoes Editor
function AcoesEditor({ acoes, onChange }) {
  const [newAcao, setNewAcao] = useState({ descricao: '', responsavel: '', prazo: '', concluida: false })

  const addAcao = () => {
    if (newAcao.descricao.trim()) {
      onChange([...acoes, { ...newAcao }])
      setNewAcao({ descricao: '', responsavel: '', prazo: '', concluida: false })
    }
  }

  const removeAcao = (index) => {
    onChange(acoes.filter((_, i) => i !== index))
  }

  const toggleConcluida = (index) => {
    const updated = [...acoes]
    updated[index].concluida = !updated[index].concluida
    onChange(updated)
  }

  return (
    <div style={{
      background: 'var(--cream)',
      borderRadius: '12px',
      padding: '16px'
    }}>
      {acoes.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {acoes.map((acao, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px',
              background: acao.concluida ? 'rgba(122, 158, 122, 0.15)' : 'white',
              borderRadius: '10px',
              marginBottom: '8px',
              border: '1px solid var(--stone)'
            }}>
              <button
                type="button"
                onClick={() => toggleConcluida(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}
              >
                {acao.concluida ? (
                  <CheckSquare size={20} color="var(--success)" />
                ) : (
                  <Square size={20} color="var(--brown-light)" />
                )}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 500,
                  color: 'var(--brown)',
                  textDecoration: acao.concluida ? 'line-through' : 'none',
                  opacity: acao.concluida ? 0.7 : 1
                }}>
                  {acao.descricao}
                </div>
                {(acao.responsavel || acao.prazo) && (
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '12px',
                    color: 'var(--brown-light)',
                    marginTop: '6px'
                  }}>
                    {acao.responsavel && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> {acao.responsavel}
                      </span>
                    )}
                    {acao.prazo && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {acao.prazo}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAcao(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px'
                }}
              >
                <Trash2 size={14} color="var(--error)" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 140px 130px auto',
        gap: '8px',
        alignItems: 'end'
      }}>
        <StyledInput
          type="text"
          placeholder="Descricao da acao..."
          value={newAcao.descricao}
          onChange={(e) => setNewAcao({ ...newAcao, descricao: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && addAcao()}
        />
        <StyledInput
          type="text"
          placeholder="Responsavel"
          value={newAcao.responsavel}
          onChange={(e) => setNewAcao({ ...newAcao, responsavel: e.target.value })}
        />
        <StyledInput
          type="date"
          value={newAcao.prazo}
          onChange={(e) => setNewAcao({ ...newAcao, prazo: e.target.value })}
        />
        <button
          type="button"
          onClick={addAcao}
          style={{
            padding: '12px 16px',
            background: 'var(--brown)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

// Print/PDF Preview Component
function AtaPreview({ ata, projeto, onClose }) {
  const printRef = useRef(null)
  const [exporting, setExporting] = useState(false)

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
            .action-status { color: #666; font-size: 12px; }
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
      alert('Erro ao exportar PDF')
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
            Pre-visualizacao da Ata
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
              {exporting ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Download size={16} />
              )}
              Guardar PDF
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
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            borderRadius: '4px'
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

            {/* Ordem do Dia */}
            {ata.ordem_dia?.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Ordem do Dia
                </div>
                <ol style={{ paddingLeft: '20px' }}>
                  {ata.ordem_dia.map((item, idx) => (
                    <li key={idx} style={{ padding: '5px 0' }}>{item}</li>
                  ))}
                </ol>
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

            {/* Decisoes */}
            {ata.decisoes?.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Decisoes
                </div>
                <ul style={{ paddingLeft: '20px' }}>
                  {ata.decisoes.map((d, idx) => (
                    <li key={idx} style={{ padding: '5px 0' }}>
                      {typeof d === 'string' ? d : d.texto}
                      {d.responsavel && <em> (Responsavel: {d.responsavel})</em>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Acoes */}
            {ata.acoes?.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Acoes a Realizar
                </div>
                <div style={{ marginTop: '10px' }}>
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
              </div>
            )}

            {/* Proxima Reuniao */}
            {ata.proxima_reuniao && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Proxima Reuniao
                </div>
                <p>
                  <strong>Data:</strong> {formatDate(ata.proxima_reuniao)}
                  {ata.proxima_reuniao_local && <> | <strong>Local:</strong> {ata.proxima_reuniao_local}</>}
                  {ata.proxima_reuniao_hora && <> | <strong>Hora:</strong> {ata.proxima_reuniao_hora}</>}
                </p>
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

// Main Component
export default function ProjetoAtas({ projeto }) {
  const [atas, setAtas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAta, setEditingAta] = useState(null)
  const [previewAta, setPreviewAta] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedAta, setExpandedAta] = useState(null)

  const [formData, setFormData] = useState({
    titulo: '',
    data_reuniao: new Date().toISOString().split('T')[0],
    local: '',
    hora_inicio: '',
    hora_fim: '',
    participantes: [],
    ordem_dia: [],
    conteudo: '',
    decisoes: [],
    acoes: [],
    proxima_reuniao: '',
    proxima_reuniao_local: '',
    proxima_reuniao_hora: '',
    status: 'rascunho'
  })

  const [newOrdemDia, setNewOrdemDia] = useState('')
  const [newDecisao, setNewDecisao] = useState('')

  useEffect(() => {
    if (projeto?.id) {
      loadAtas()
    }
  }, [projeto?.id])

  const loadAtas = async () => {
    try {
      const { data, error } = await supabase
        .from('projeto_atas')
        .select('*')
        .eq('projeto_id', projeto.id)
        .order('data_reuniao', { ascending: false })

      if (error) throw error
      setAtas(data || [])
    } catch (err) {
      console.error('Erro ao carregar atas:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      titulo: '',
      data_reuniao: new Date().toISOString().split('T')[0],
      local: '',
      hora_inicio: '',
      hora_fim: '',
      participantes: [],
      ordem_dia: [],
      conteudo: '',
      decisoes: [],
      acoes: [],
      proxima_reuniao: '',
      proxima_reuniao_local: '',
      proxima_reuniao_hora: '',
      status: 'rascunho'
    })
    setNewOrdemDia('')
    setNewDecisao('')
  }

  const openNewModal = () => {
    resetForm()
    setEditingAta(null)
    setShowModal(true)
  }

  const openEditModal = (ata) => {
    setFormData({
      titulo: ata.titulo || '',
      data_reuniao: ata.data_reuniao || '',
      local: ata.local || '',
      hora_inicio: ata.hora_inicio || '',
      hora_fim: ata.hora_fim || '',
      participantes: ata.participantes || [],
      ordem_dia: ata.ordem_dia || [],
      conteudo: ata.conteudo || '',
      decisoes: ata.decisoes || [],
      acoes: ata.acoes || [],
      proxima_reuniao: ata.proxima_reuniao || '',
      proxima_reuniao_local: ata.proxima_reuniao_local || '',
      proxima_reuniao_hora: ata.proxima_reuniao_hora || '',
      status: ata.status || 'rascunho'
    })
    setEditingAta(ata)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.titulo.trim() || !formData.data_reuniao) {
      alert('Preencha o titulo e a data da reuniao')
      return
    }

    setSaving(true)
    try {
      const payload = {
        projeto_id: projeto.id,
        fase: projeto.fase_atual,
        ...formData
      }

      if (editingAta) {
        const { error } = await supabase
          .from('projeto_atas')
          .update(payload)
          .eq('id', editingAta.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projeto_atas')
          .insert([payload])

        if (error) throw error
      }

      await loadAtas()
      setShowModal(false)
      resetForm()
    } catch (err) {
      console.error('Erro ao guardar ata:', err)
      alert('Erro ao guardar ata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ata) => {
    if (!confirm('Tem certeza que deseja eliminar esta ata?')) return

    try {
      const { error } = await supabase
        .from('projeto_atas')
        .delete()
        .eq('id', ata.id)

      if (error) throw error
      await loadAtas()
    } catch (err) {
      console.error('Erro ao eliminar ata:', err)
      alert('Erro ao eliminar ata')
    }
  }

  const addOrdemDia = () => {
    if (newOrdemDia.trim()) {
      setFormData({ ...formData, ordem_dia: [...formData.ordem_dia, newOrdemDia.trim()] })
      setNewOrdemDia('')
    }
  }

  const removeOrdemDia = (index) => {
    setFormData({ ...formData, ordem_dia: formData.ordem_dia.filter((_, i) => i !== index) })
  }

  const addDecisao = () => {
    if (newDecisao.trim()) {
      setFormData({ ...formData, decisoes: [...formData.decisoes, { texto: newDecisao.trim() }] })
      setNewDecisao('')
    }
  }

  const removeDecisao = (index) => {
    setFormData({ ...formData, decisoes: formData.decisoes.filter((_, i) => i !== index) })
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-PT')
  }

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
            Atas de reuniao deste projeto
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--brown)' }}>
            {atas.length} {atas.length === 1 ? 'Ata' : 'Atas'}
          </div>
        </div>
        <button
          onClick={openNewModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: 'var(--brown)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px'
          }}
        >
          <Plus size={18} />
          Nova Ata
        </button>
      </div>

      {/* Lista de Atas */}
      {atas.length === 0 ? (
        <div style={{
          padding: '64px',
          background: 'var(--cream)',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'white',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={40} style={{ color: 'var(--brown-light)', opacity: 0.5 }} />
          </div>
          <p style={{ color: 'var(--brown)', fontWeight: 500, fontSize: '16px', marginBottom: '8px' }}>
            Nenhuma ata registada
          </p>
          <p style={{ color: 'var(--brown-light)', fontSize: '14px' }}>
            Clique em "Nova Ata" para criar a primeira ata de reuniao.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {atas.map((ata) => (
            <div
              key={ata.id}
              style={{
                background: 'white',
                borderRadius: '14px',
                overflow: 'hidden',
                border: expandedAta === ata.id ? '2px solid var(--brown)' : '1px solid var(--stone)',
                transition: 'border-color 0.2s'
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  background: expandedAta === ata.id ? 'var(--cream)' : 'white'
                }}
                onClick={() => setExpandedAta(expandedAta === ata.id ? null : ata.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'var(--brown)',
                    color: 'white',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px'
                  }}>
                    #{ata.numero_ata}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--brown)', fontSize: '15px' }}>{ata.titulo}</div>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      fontSize: '13px',
                      color: 'var(--brown-light)',
                      marginTop: '4px'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={13} /> {formatDate(ata.data_reuniao)}
                      </span>
                      {ata.local && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} /> {ata.local}
                        </span>
                      )}
                      {ata.participantes?.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Users size={13} /> {ata.participantes.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: statusConfig[ata.status]?.bg || 'var(--stone)',
                    color: statusConfig[ata.status]?.color || 'var(--brown-light)'
                  }}>
                    {statusConfig[ata.status]?.label || ata.status}
                  </span>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {expandedAta === ata.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedAta === ata.id && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--stone)' }}>
                  {/* Preview do conteudo */}
                  {ata.conteudo && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px' }}>
                        Conteudo
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          color: 'var(--brown-light)',
                          maxHeight: '100px',
                          overflow: 'hidden',
                          position: 'relative',
                          background: 'var(--cream)',
                          padding: '12px',
                          borderRadius: '8px'
                        }}
                        dangerouslySetInnerHTML={{ __html: ata.conteudo }}
                      />
                    </div>
                  )}

                  {/* Acoes pendentes */}
                  {ata.acoes?.filter(a => !a.concluida).length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown)', marginBottom: '8px' }}>
                        Acoes Pendentes ({ata.acoes.filter(a => !a.concluida).length})
                      </div>
                      {ata.acoes.filter(a => !a.concluida).slice(0, 3).map((a, idx) => (
                        <div key={idx} style={{
                          fontSize: '13px',
                          padding: '10px 12px',
                          background: 'var(--cream)',
                          borderRadius: '8px',
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>{a.descricao}</span>
                          {a.prazo && (
                            <span style={{
                              fontSize: '11px',
                              padding: '4px 8px',
                              background: 'rgba(201, 168, 130, 0.2)',
                              color: 'var(--warning)',
                              borderRadius: '4px',
                              fontWeight: 500
                            }}>
                              {a.prazo}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--stone)'
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewAta(ata) }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        background: 'var(--cream)',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: 'var(--brown)',
                        fontWeight: 500,
                        fontSize: '13px'
                      }}
                    >
                      <Eye size={16} />
                      Visualizar / Imprimir
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(ata) }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        background: 'var(--cream)',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: 'var(--brown)',
                        fontWeight: 500,
                        fontSize: '13px'
                      }}
                    >
                      <Edit2 size={16} />
                      Editar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ata) }}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(199, 83, 83, 0.1)',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        color: 'var(--error)'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edicao */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 28px',
              borderBottom: '1px solid var(--stone)',
              background: 'var(--cream)'
            }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--brown)', fontSize: '18px', fontWeight: 600 }}>
                  {editingAta ? 'Editar Ata' : 'Nova Ata de Reuniao'}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--brown-light)', fontSize: '13px' }}>
                  Preencha os dados da reuniao
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'white',
                  border: '1px solid var(--stone)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  padding: '10px',
                  display: 'flex'
                }}
              >
                <X size={18} color="var(--brown-light)" />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
              {/* Info Basica */}
              <div style={{
                background: 'var(--cream)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <SectionHeader
                  icon={Calendar}
                  title="Informacoes da Reuniao"
                  subtitle="Data, local e horario"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  <StyledInput
                    label="Titulo"
                    required
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Ex: Reuniao de Coordenacao de Projeto"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <StyledInput
                      label="Data da Reuniao"
                      required
                      icon={Calendar}
                      type="date"
                      value={formData.data_reuniao}
                      onChange={(e) => setFormData({ ...formData, data_reuniao: e.target.value })}
                    />
                    <StyledInput
                      label="Local"
                      icon={MapPin}
                      type="text"
                      value={formData.local}
                      onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                      placeholder="Ex: Escritorio, Teams, Obra..."
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <StyledInput
                      label="Hora Inicio"
                      icon={Clock}
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    />
                    <StyledInput
                      label="Hora Fim"
                      icon={Clock}
                      type="time"
                      value={formData.hora_fim}
                      onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Participantes */}
              <div style={{ marginBottom: '24px' }}>
                <SectionHeader
                  icon={Users}
                  title="Participantes"
                  subtitle="Pessoas presentes na reuniao"
                />
                <ParticipantesEditor
                  participantes={formData.participantes}
                  onChange={(p) => setFormData({ ...formData, participantes: p })}
                />
              </div>

              {/* Ordem do Dia */}
              <div style={{ marginBottom: '24px' }}>
                <SectionHeader
                  icon={ClipboardList}
                  title="Ordem do Dia"
                  subtitle="Pontos a abordar na reuniao"
                />
                <div style={{
                  background: 'var(--cream)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  {formData.ordem_dia.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {formData.ordem_dia.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          background: 'white',
                          borderRadius: '10px',
                          marginBottom: '8px',
                          border: '1px solid var(--stone)'
                        }}>
                          <span style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: 'var(--brown)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 600
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ flex: 1, color: 'var(--brown)' }}>{item}</span>
                          <button
                            type="button"
                            onClick={() => removeOrdemDia(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <X size={16} color="var(--brown-light)" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <StyledInput
                        type="text"
                        value={newOrdemDia}
                        onChange={(e) => setNewOrdemDia(e.target.value)}
                        placeholder="Adicionar ponto a ordem do dia..."
                        onKeyDown={(e) => e.key === 'Enter' && addOrdemDia()}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addOrdemDia}
                      style={{
                        padding: '12px 18px',
                        background: 'var(--brown)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Conteudo / Desenvolvimento */}
              <div style={{ marginBottom: '24px' }}>
                <SectionHeader
                  icon={FileText}
                  title="Desenvolvimento da Reuniao"
                  subtitle="Descricao detalhada dos assuntos abordados"
                />
                <RichTextEditor
                  value={formData.conteudo}
                  onChange={(html) => setFormData({ ...formData, conteudo: html })}
                  placeholder="Descreva o desenvolvimento da reuniao, discussoes, pontos abordados..."
                />
              </div>

              {/* Decisoes */}
              <div style={{ marginBottom: '24px' }}>
                <SectionHeader
                  icon={CheckCircle}
                  title="Decisoes Tomadas"
                  subtitle="Decisoes acordadas durante a reuniao"
                />
                <div style={{
                  background: 'rgba(122, 158, 122, 0.1)',
                  borderRadius: '12px',
                  padding: '16px'
                }}>
                  {formData.decisoes.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {formData.decisoes.map((d, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px 14px',
                          background: 'white',
                          borderRadius: '10px',
                          marginBottom: '8px',
                          border: '1px solid rgba(122, 158, 122, 0.3)'
                        }}>
                          <CheckCircle size={18} color="var(--success)" />
                          <span style={{ flex: 1, color: 'var(--brown)' }}>
                            {typeof d === 'string' ? d : d.texto}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDecisao(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <X size={16} color="var(--brown-light)" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <StyledInput
                        type="text"
                        value={newDecisao}
                        onChange={(e) => setNewDecisao(e.target.value)}
                        placeholder="Adicionar decisao..."
                        onKeyDown={(e) => e.key === 'Enter' && addDecisao()}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addDecisao}
                      style={{
                        padding: '12px 18px',
                        background: 'var(--success)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Acoes */}
              <div style={{ marginBottom: '24px' }}>
                <SectionHeader
                  icon={CheckSquare}
                  title="Acoes a Realizar"
                  subtitle="Tarefas com responsavel e prazo"
                />
                <AcoesEditor
                  acoes={formData.acoes}
                  onChange={(a) => setFormData({ ...formData, acoes: a })}
                />
              </div>

              {/* Proxima Reuniao */}
              <div style={{
                background: 'var(--cream)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <SectionHeader
                  icon={Calendar}
                  title="Proxima Reuniao"
                  subtitle="Agendar proxima reuniao (opcional)"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <StyledInput
                    label="Data"
                    type="date"
                    value={formData.proxima_reuniao}
                    onChange={(e) => setFormData({ ...formData, proxima_reuniao: e.target.value })}
                  />
                  <StyledInput
                    label="Local"
                    type="text"
                    value={formData.proxima_reuniao_local}
                    onChange={(e) => setFormData({ ...formData, proxima_reuniao_local: e.target.value })}
                    placeholder="Local da reuniao"
                  />
                  <StyledInput
                    label="Hora"
                    type="time"
                    value={formData.proxima_reuniao_hora}
                    onChange={(e) => setFormData({ ...formData, proxima_reuniao_hora: e.target.value })}
                  />
                </div>
              </div>

              {/* Status */}
              <StyledSelect
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="rascunho">Rascunho</option>
                <option value="pendente_aprovacao">Pendente Aprovacao</option>
                <option value="aprovada">Aprovada</option>
                <option value="arquivada">Arquivada</option>
              </StyledSelect>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '20px 28px',
              borderTop: '1px solid var(--stone)',
              background: 'var(--cream)'
            }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  border: '1px solid var(--stone)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: 'var(--brown)',
                  fontWeight: 500,
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: 'var(--brown)',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '14px',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    A guardar...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {editingAta ? 'Guardar Alteracoes' : 'Criar Ata'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewAta && (
        <AtaPreview
          ata={previewAta}
          projeto={projeto}
          onClose={() => setPreviewAta(null)}
        />
      )}
    </div>
  )
}
