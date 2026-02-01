// =====================================================
// PROJETO ATAS COMPONENT
// Atas de reuniao com editor rich text, print e PDF
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, FileText, Edit2, Trash2, Save, X, Calendar, User, Clock,
  Loader2, Eye, Printer, Download, ChevronDown, ChevronUp, Users,
  MapPin, CheckCircle, AlertCircle, Bold, Italic, Underline, List,
  ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2, Image,
  MoreVertical, Copy, Archive, Send, CheckSquare, Square
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

// Rich Text Editor Component
function RichTextEditor({ value, onChange, placeholder }) {
  const editorRef = useRef(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value)
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

  return (
    <div style={{
      border: `1px solid ${isFocused ? 'var(--brown)' : 'var(--stone)'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      transition: 'border-color 0.2s'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 12px',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--stone)',
        flexWrap: 'wrap'
      }}>
        <button type="button" onClick={() => execCommand('bold')} title="Negrito" style={toolbarBtnStyle}>
          <Bold size={16} />
        </button>
        <button type="button" onClick={() => execCommand('italic')} title="Italico" style={toolbarBtnStyle}>
          <Italic size={16} />
        </button>
        <button type="button" onClick={() => execCommand('underline')} title="Sublinhado" style={toolbarBtnStyle}>
          <Underline size={16} />
        </button>
        <div style={{ width: '1px', background: 'var(--stone)', margin: '0 4px' }} />
        <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Lista" style={toolbarBtnStyle}>
          <List size={16} />
        </button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} title="Lista Numerada" style={toolbarBtnStyle}>
          <ListOrdered size={16} />
        </button>
        <div style={{ width: '1px', background: 'var(--stone)', margin: '0 4px' }} />
        <button type="button" onClick={() => execCommand('justifyLeft')} title="Alinhar Esquerda" style={toolbarBtnStyle}>
          <AlignLeft size={16} />
        </button>
        <button type="button" onClick={() => execCommand('justifyCenter')} title="Centrar" style={toolbarBtnStyle}>
          <AlignCenter size={16} />
        </button>
        <button type="button" onClick={() => execCommand('justifyRight')} title="Alinhar Direita" style={toolbarBtnStyle}>
          <AlignRight size={16} />
        </button>
        <div style={{ width: '1px', background: 'var(--stone)', margin: '0 4px' }} />
        <button type="button" onClick={insertLink} title="Inserir Link" style={toolbarBtnStyle}>
          <Link2 size={16} />
        </button>
        <div style={{ width: '1px', background: 'var(--stone)', margin: '0 4px' }} />
        <select
          onChange={(e) => execCommand('formatBlock', e.target.value)}
          style={{
            padding: '4px 8px',
            border: 'none',
            background: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--brown)',
            cursor: 'pointer'
          }}
        >
          <option value="p">Normal</option>
          <option value="h1">Titulo 1</option>
          <option value="h2">Titulo 2</option>
          <option value="h3">Titulo 3</option>
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
          minHeight: '200px',
          padding: '16px',
          outline: 'none',
          fontSize: '14px',
          lineHeight: '1.6',
          color: 'var(--brown)',
          background: 'white'
        }}
      />
    </div>
  )
}

const toolbarBtnStyle = {
  padding: '6px',
  border: 'none',
  background: 'white',
  borderRadius: '4px',
  cursor: 'pointer',
  color: 'var(--brown)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s'
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
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        {participantes.map((p, idx) => (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'var(--cream)',
            borderRadius: '20px',
            fontSize: '13px'
          }}>
            <User size={14} />
            <span style={{ fontWeight: 500 }}>{p.nome}</span>
            {p.cargo && <span style={{ color: 'var(--brown-light)' }}>({p.cargo})</span>}
            <button
              type="button"
              onClick={() => removeParticipante(idx)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} color="var(--error)" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            background: 'transparent',
            border: '1px dashed var(--stone)',
            borderRadius: '20px',
            fontSize: '13px',
            color: 'var(--brown-light)',
            cursor: 'pointer'
          }}
        >
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {showAdd && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px',
          background: 'var(--cream)',
          borderRadius: '8px',
          marginTop: '8px'
        }}>
          <input
            type="text"
            placeholder="Nome"
            value={newParticipante.nome}
            onChange={(e) => setNewParticipante({ ...newParticipante, nome: e.target.value })}
            style={{ flex: 2 }}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Cargo"
            value={newParticipante.cargo}
            onChange={(e) => setNewParticipante({ ...newParticipante, cargo: e.target.value })}
            style={{ flex: 1 }}
            className="form-input"
          />
          <input
            type="text"
            placeholder="Entidade"
            value={newParticipante.entidade}
            onChange={(e) => setNewParticipante({ ...newParticipante, entidade: e.target.value })}
            style={{ flex: 1 }}
            className="form-input"
          />
          <button type="button" onClick={addParticipante} className="btn btn-primary" style={{ padding: '8px 16px' }}>
            <Plus size={14} />
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <X size={14} />
          </button>
        </div>
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
    <div>
      {acoes.map((acao, idx) => (
        <div key={idx} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px',
          background: acao.concluida ? 'rgba(122, 158, 122, 0.1)' : 'var(--cream)',
          borderRadius: '8px',
          marginBottom: '8px'
        }}>
          <button
            type="button"
            onClick={() => toggleConcluida(idx)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}
          >
            {acao.concluida ? (
              <CheckSquare size={18} color="var(--success)" />
            ) : (
              <Square size={18} color="var(--brown-light)" />
            )}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: 500,
              color: 'var(--brown)',
              textDecoration: acao.concluida ? 'line-through' : 'none'
            }}>
              {acao.descricao}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '4px' }}>
              {acao.responsavel && <span>Responsavel: {acao.responsavel}</span>}
              {acao.responsavel && acao.prazo && <span> • </span>}
              {acao.prazo && <span>Prazo: {acao.prazo}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeAcao(idx)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <Trash2 size={14} color="var(--error)" />
          </button>
        </div>
      ))}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: '8px',
        padding: '12px',
        background: 'var(--cream)',
        borderRadius: '8px'
      }}>
        <input
          type="text"
          placeholder="Descricao da acao..."
          value={newAcao.descricao}
          onChange={(e) => setNewAcao({ ...newAcao, descricao: e.target.value })}
          className="form-input"
          onKeyDown={(e) => e.key === 'Enter' && addAcao()}
        />
        <input
          type="text"
          placeholder="Responsavel"
          value={newAcao.responsavel}
          onChange={(e) => setNewAcao({ ...newAcao, responsavel: e.target.value })}
          className="form-input"
          style={{ width: '150px' }}
        />
        <input
          type="date"
          value={newAcao.prazo}
          onChange={(e) => setNewAcao({ ...newAcao, prazo: e.target.value })}
          className="form-input"
        />
        <button type="button" onClick={addAcao} className="btn btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={14} />
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
        borderRadius: '12px',
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
          <span style={{ fontWeight: 600, color: 'var(--brown)' }}>
            Pre-visualizacao da Ata
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrint} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
              <Printer size={16} style={{ marginRight: '6px' }} />
              Imprimir
            </button>
            <button
              onClick={handleExportPDF}
              className="btn btn-primary"
              style={{ padding: '8px 16px' }}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 size={16} className="spin" style={{ marginRight: '6px' }} />
              ) : (
                <Download size={16} style={{ marginRight: '6px' }} />
              )}
              Guardar PDF
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f5f5f5' }}>
          <div ref={printRef} style={{
            background: 'white',
            padding: '40px',
            maxWidth: '800px',
            margin: '0 auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {/* Header */}
            <div className="header" style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
              <div className="logo" style={{ fontSize: '24px', fontWeight: 'bold', color: '#5a4a3a' }}>
                {projeto.cliente || 'GAVINHO ARQUITECTOS'}
              </div>
              <div className="title" style={{ fontSize: '20px', marginTop: '10px' }}>
                ATA DE REUNIAO N.º {ata.numero_ata}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                {projeto.nome}
              </div>
            </div>

            {/* Meta Info */}
            <div className="meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', fontSize: '14px' }}>
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
              <div className="section" style={{ marginBottom: '25px' }}>
                <div className="section-title" style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Participantes
                </div>
                <ul className="participants" style={{ listStyle: 'none' }}>
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
              <div className="section" style={{ marginBottom: '25px' }}>
                <div className="section-title" style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
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
              <div className="section" style={{ marginBottom: '25px' }}>
                <div className="section-title" style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Desenvolvimento
                </div>
                <div
                  className="content"
                  style={{ fontSize: '14px', lineHeight: '1.8' }}
                  dangerouslySetInnerHTML={{ __html: ata.conteudo }}
                />
              </div>
            )}

            {/* Decisoes */}
            {ata.decisoes?.length > 0 && (
              <div className="section" style={{ marginBottom: '25px' }}>
                <div className="section-title" style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
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
              <div className="section" style={{ marginBottom: '25px' }}>
                <div className="section-title" style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
                  Acoes a Realizar
                </div>
                <div className="actions" style={{ marginTop: '10px' }}>
                  {ata.acoes.map((a, idx) => (
                    <div key={idx} className="action" style={{ padding: '8px', background: '#f5f5f5', marginBottom: '5px', borderRadius: '4px' }}>
                      <div>{a.descricao}</div>
                      <div className="action-status" style={{ color: '#666', fontSize: '12px' }}>
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
              <div className="section" style={{ marginBottom: '25px' }}>
                <div className="section-title" style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #ddd', paddingBottom: '5px', marginBottom: '10px' }}>
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
            <div className="signatures" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '60px' }}>
              <div className="signature" style={{ textAlign: 'center' }}>
                <div className="signature-line" style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '10px' }}>
                  Elaborado por
                </div>
              </div>
              <div className="signature" style={{ textAlign: 'center' }}>
                <div className="signature-line" style={{ borderTop: '1px solid #333', marginTop: '60px', paddingTop: '10px' }}>
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
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '13px', color: 'var(--brown-light)' }}>
          Atas de reuniao deste projeto ({atas.length})
        </span>
        <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={openNewModal}>
          <Plus size={16} style={{ marginRight: '8px' }} />
          Nova Ata
        </button>
      </div>

      {/* Lista de Atas */}
      {atas.length === 0 ? (
        <div style={{
          padding: '48px',
          background: 'var(--cream)',
          borderRadius: '12px',
          textAlign: 'center',
          color: 'var(--brown-light)'
        }}>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>Nenhuma ata registada para este projeto.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>
            Clique em "Nova Ata" para criar a primeira ata de reuniao.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {atas.map((ata) => (
            <div
              key={ata.id}
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: expandedAta === ata.id ? '1px solid var(--brown)' : '1px solid var(--stone)'
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  background: expandedAta === ata.id ? 'var(--cream)' : 'white'
                }}
                onClick={() => setExpandedAta(expandedAta === ata.id ? null : ata.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--brown)',
                    color: 'white',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}>
                    #{ata.numero_ata}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--brown)' }}>{ata.titulo}</div>
                    <div style={{ fontSize: '12px', color: 'var(--brown-light)', display: 'flex', gap: '12px', marginTop: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> {formatDate(ata.data_reuniao)}
                      </span>
                      {ata.local && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {ata.local}
                        </span>
                      )}
                      {ata.participantes?.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} /> {ata.participantes.length} participantes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: statusConfig[ata.status]?.bg || 'var(--stone)',
                    color: statusConfig[ata.status]?.color || 'var(--brown-light)'
                  }}>
                    {statusConfig[ata.status]?.label || ata.status}
                  </span>
                  {expandedAta === ata.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
                          position: 'relative'
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
                          padding: '8px',
                          background: 'var(--cream)',
                          borderRadius: '6px',
                          marginBottom: '4px'
                        }}>
                          {a.descricao}
                          {a.prazo && <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>Prazo: {a.prazo}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--stone)' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', flex: 1 }}
                      onClick={(e) => { e.stopPropagation(); setPreviewAta(ata) }}
                    >
                      <Eye size={14} style={{ marginRight: '6px' }} />
                      Visualizar / Imprimir
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', flex: 1 }}
                      onClick={(e) => { e.stopPropagation(); openEditModal(ata) }}
                    >
                      <Edit2 size={14} style={{ marginRight: '6px' }} />
                      Editar
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', color: 'var(--error)' }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(ata) }}
                    >
                      <Trash2 size={14} />
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
          background: 'rgba(0,0,0,0.5)',
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
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--stone)'
            }}>
              <h3 style={{ margin: 0, color: 'var(--brown)' }}>
                {editingAta ? 'Editar Ata' : 'Nova Ata de Reuniao'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
              >
                <X size={20} color="var(--brown-light)" />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
              {/* Info Basica */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px', color: 'var(--brown)', fontSize: '14px' }}>
                  Informacoes da Reuniao
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Titulo *</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Ex: Reuniao de Coordenacao de Projeto"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Data da Reuniao *</label>
                    <input
                      type="date"
                      value={formData.data_reuniao}
                      onChange={(e) => setFormData({ ...formData, data_reuniao: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Local</label>
                    <input
                      type="text"
                      value={formData.local}
                      onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                      placeholder="Ex: Escritorio, Teams, Obra..."
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Hora Inicio</label>
                    <input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Hora Fim</label>
                    <input
                      type="time"
                      value={formData.hora_fim}
                      onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Participantes */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px', color: 'var(--brown)', fontSize: '14px' }}>
                  <Users size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Participantes
                </h4>
                <ParticipantesEditor
                  participantes={formData.participantes}
                  onChange={(p) => setFormData({ ...formData, participantes: p })}
                />
              </div>

              {/* Ordem do Dia */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px', color: 'var(--brown)', fontSize: '14px' }}>
                  Ordem do Dia
                </h4>
                {formData.ordem_dia.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--cream)',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontWeight: 500, color: 'var(--brown-light)' }}>{idx + 1}.</span>
                    <span style={{ flex: 1 }}>{item}</span>
                    <button
                      type="button"
                      onClick={() => removeOrdemDia(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={14} color="var(--error)" />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newOrdemDia}
                    onChange={(e) => setNewOrdemDia(e.target.value)}
                    placeholder="Adicionar ponto a ordem do dia..."
                    className="form-input"
                    onKeyDown={(e) => e.key === 'Enter' && addOrdemDia()}
                  />
                  <button type="button" onClick={addOrdemDia} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Conteudo / Desenvolvimento */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px', color: 'var(--brown)', fontSize: '14px' }}>
                  Desenvolvimento da Reuniao
                </h4>
                <RichTextEditor
                  value={formData.conteudo}
                  onChange={(html) => setFormData({ ...formData, conteudo: html })}
                  placeholder="Descreva o desenvolvimento da reuniao, discussoes, pontos abordados..."
                />
              </div>

              {/* Decisoes */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px', color: 'var(--brown)', fontSize: '14px' }}>
                  Decisoes Tomadas
                </h4>
                {formData.decisoes.map((d, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'rgba(122, 158, 122, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}>
                    <CheckCircle size={14} color="var(--success)" />
                    <span style={{ flex: 1 }}>{typeof d === 'string' ? d : d.texto}</span>
                    <button
                      type="button"
                      onClick={() => removeDecisao(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={14} color="var(--error)" />
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newDecisao}
                    onChange={(e) => setNewDecisao(e.target.value)}
                    placeholder="Adicionar decisao..."
                    className="form-input"
                    onKeyDown={(e) => e.key === 'Enter' && addDecisao()}
                  />
                  <button type="button" onClick={addDecisao} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Acoes */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px', color: 'var(--brown)', fontSize: '14px' }}>
                  Acoes a Realizar
                </h4>
                <AcoesEditor
                  acoes={formData.acoes}
                  onChange={(a) => setFormData({ ...formData, acoes: a })}
                />
              </div>

              {/* Proxima Reuniao */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 16px', color: 'var(--brown)', fontSize: '14px' }}>
                  Proxima Reuniao
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="form-label">Data</label>
                    <input
                      type="date"
                      value={formData.proxima_reuniao}
                      onChange={(e) => setFormData({ ...formData, proxima_reuniao: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Local</label>
                    <input
                      type="text"
                      value={formData.proxima_reuniao_local}
                      onChange={(e) => setFormData({ ...formData, proxima_reuniao_local: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Hora</label>
                    <input
                      type="time"
                      value={formData.proxima_reuniao_hora}
                      onChange={(e) => setFormData({ ...formData, proxima_reuniao_hora: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="form-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-input"
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="pendente_aprovacao">Pendente Aprovacao</option>
                  <option value="aprovada">Aprovada</option>
                  <option value="arquivada">Arquivada</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '16px 24px',
              borderTop: '1px solid var(--stone)',
              background: 'var(--cream)'
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="spin" style={{ marginRight: '8px' }} />
                    A guardar...
                  </>
                ) : (
                  <>
                    <Save size={16} style={{ marginRight: '8px' }} />
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
