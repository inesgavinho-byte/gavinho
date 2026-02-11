import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  FileText, Plus, X, Calendar, Edit2, Trash2, Eye, Download,
  ChevronDown, ChevronRight, Send, Save, Clock, Loader2,
  CheckCircle, AlertCircle, FilePenLine, Image as ImageIcon, FileDown
} from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
         AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'

const TIPOS_RELATORIO = [
  { id: 'semanal', label: 'Semanal' },
  { id: 'quinzenal', label: 'Quinzenal' },
  { id: 'mensal', label: 'Mensal' },
  { id: 'milestone', label: 'Milestone' }
]

const ESTADOS_RELATORIO = {
  rascunho: { label: 'Rascunho', cor: '#6B7280', icon: FilePenLine },
  em_revisao: { label: 'Em Revisão', cor: '#F59E0B', icon: Clock },
  publicado: { label: 'Publicado', cor: '#10B981', icon: CheckCircle }
}

export default function ObraRelatorios({ obra }) {
  const [relatorios, setRelatorios] = useState([])
  const [especialidades, setEspecialidades] = useState([])
  const [fotografias, setFotografias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [editingRelatorio, setEditingRelatorio] = useState(null)
  const [saving, setSaving] = useState(false)

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Form básico
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'semanal',
    data_inicio: '',
    data_fim: ''
  })

  // Form editor completo
  const [editorData, setEditorData] = useState({
    resumo_executivo: '',
    trabalhos_realizados: '',
    trabalhos_proxima_semana: '',
    problemas_identificados: '',
    decisoes_pendentes: '',
    observacoes: '',
    progresso_global: 0,
    progresso_por_especialidade: {},
    fotos_selecionadas: []
  })

  useEffect(() => {
    if (obra?.id) {
      loadData()
    }
  }, [obra?.id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [relatoriosRes, especRes, fotosRes] = await Promise.all([
        supabase
          .from('obra_relatorios')
          .select('*')
          .eq('obra_id', obra.id)
          .order('data_fim', { ascending: false }),
        supabase
          .from('especialidades')
          .select('*')
          .eq('ativo', true)
          .order('ordem'),
        supabase
          .from('obra_fotografias')
          .select('id, url, titulo, data_fotografia')
          .eq('obra_id', obra.id)
          .order('data_fotografia', { ascending: false })
          .limit(50)
      ])

      setRelatorios(relatoriosRes.data || [])
      setEspecialidades(especRes.data || [])
      setFotografias(fotosRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateCodigo = () => {
    const count = relatorios.length + 1
    return `REL-${String(count).padStart(3, '0')}`
  }

  const handleCreate = async () => {
    if (!formData.titulo || !formData.data_inicio || !formData.data_fim) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('obra_relatorios')
        .insert({
          obra_id: obra.id,
          codigo: generateCodigo(),
          titulo: formData.titulo,
          tipo: formData.tipo,
          data_inicio: formData.data_inicio,
          data_fim: formData.data_fim,
          estado: 'rascunho'
        })
        .select()
        .single()

      if (error) throw error

      setShowModal(false)
      setFormData({ titulo: '', tipo: 'semanal', data_inicio: '', data_fim: '' })
      loadData()

      // Abrir editor automaticamente
      handleEdit(data)
    } catch (err) {
      console.error('Erro ao criar:', err)
      alert('Erro ao criar relatório: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (relatorio) => {
    setEditingRelatorio(relatorio)
    setEditorData({
      resumo_executivo: relatorio.resumo_executivo || '',
      trabalhos_realizados: relatorio.trabalhos_realizados || '',
      trabalhos_proxima_semana: relatorio.trabalhos_proxima_semana || '',
      problemas_identificados: relatorio.problemas_identificados || '',
      decisoes_pendentes: relatorio.decisoes_pendentes || '',
      observacoes: relatorio.observacoes || '',
      progresso_global: relatorio.progresso_global || 0,
      progresso_por_especialidade: relatorio.progresso_por_especialidade || {},
      fotos_selecionadas: []
    })
    setShowEditorModal(true)
  }

  const handleSave = async (publish = false) => {
    if (!editingRelatorio) return

    setSaving(true)
    try {
      const updateData = {
        resumo_executivo: editorData.resumo_executivo || null,
        trabalhos_realizados: editorData.trabalhos_realizados || null,
        trabalhos_proxima_semana: editorData.trabalhos_proxima_semana || null,
        problemas_identificados: editorData.problemas_identificados || null,
        decisoes_pendentes: editorData.decisoes_pendentes || null,
        observacoes: editorData.observacoes || null,
        progresso_global: editorData.progresso_global,
        progresso_por_especialidade: editorData.progresso_por_especialidade
      }

      if (publish) {
        updateData.estado = 'publicado'
        updateData.data_publicacao = new Date().toISOString()
      }

      const { error } = await supabase
        .from('obra_relatorios')
        .update(updateData)
        .eq('id', editingRelatorio.id)

      if (error) throw error

      setShowEditorModal(false)
      setEditingRelatorio(null)
      loadData()
    } catch (err) {
      console.error('Erro ao guardar:', err)
      alert('Erro ao guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Exportar DOCX
  const handleExportDocx = async (relatorio) => {
    try {
      const tipoLabel = TIPOS_RELATORIO.find(t => t.id === relatorio.tipo)?.label || relatorio.tipo
      const periodoText = `${formatDate(relatorio.data_inicio)} a ${formatDate(relatorio.data_fim)}`

      const sections = []

      // Header
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: obra?.nome || 'Obra', bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Relatorio ${tipoLabel}`, size: 24, color: '666666' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: relatorio.titulo, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Periodo: ${periodoText}`, size: 20, color: '888888' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      )

      // Progresso Global
      if (relatorio.progresso_global != null) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Progresso Global', bold: true, size: 24 })],
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: `${relatorio.progresso_global}%`, size: 22 })],
            spacing: { after: 200 }
          })
        )
      }

      // Resumo Executivo
      if (relatorio.resumo_executivo) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Resumo Executivo', bold: true, size: 24 })],
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: relatorio.resumo_executivo, size: 22 })],
            spacing: { after: 200 }
          })
        )
      }

      // Trabalhos Realizados
      if (relatorio.trabalhos_realizados) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Trabalhos Realizados', bold: true, size: 24 })],
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: relatorio.trabalhos_realizados, size: 22 })],
            spacing: { after: 200 }
          })
        )
      }

      // Trabalhos Proximos
      if (relatorio.trabalhos_proxima_semana) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Trabalhos Previstos Proximo Periodo', bold: true, size: 24 })],
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: relatorio.trabalhos_proxima_semana, size: 22 })],
            spacing: { after: 200 }
          })
        )
      }

      // Problemas
      if (relatorio.problemas_identificados) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Problemas Identificados', bold: true, size: 24, color: 'CC0000' })],
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: relatorio.problemas_identificados, size: 22 })],
            spacing: { after: 200 }
          })
        )
      }

      // Decisoes Pendentes
      if (relatorio.decisoes_pendentes) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Decisoes Pendentes', bold: true, size: 24, color: 'CC6600' })],
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: relatorio.decisoes_pendentes, size: 22 })],
            spacing: { after: 200 }
          })
        )
      }

      // Observacoes
      if (relatorio.observacoes) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Observacoes', bold: true, size: 24 })],
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: relatorio.observacoes, size: 22 })],
            spacing: { after: 200 }
          })
        )
      }

      // Footer
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `Gerado em ${new Date().toLocaleString('pt-PT')}`, size: 18, color: 'AAAAAA' })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 }
        })
      )

      const doc = new Document({
        sections: [{
          properties: {},
          children: sections
        }]
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, `${relatorio.codigo}_${obra?.codigo || 'obra'}.docx`)
    } catch (err) {
      console.error('Erro ao exportar DOCX:', err)
      alert('Erro ao exportar DOCX')
    }
  }

  // Exportar PDF
  const handleExportPdf = (relatorio) => {
    try {
      const tipoLabel = TIPOS_RELATORIO.find(t => t.id === relatorio.tipo)?.label || relatorio.tipo
      const periodoText = `${formatDate(relatorio.data_inicio)} a ${formatDate(relatorio.data_fim)}`

      const pdf = new jsPDF()
      let y = 20

      // Header
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text(obra?.nome || 'Obra', 105, y, { align: 'center' })
      y += 8

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100)
      pdf.text(`Relatorio ${tipoLabel}`, 105, y, { align: 'center' })
      y += 10

      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(0)
      pdf.text(relatorio.titulo, 105, y, { align: 'center' })
      y += 8

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100)
      pdf.text(`Periodo: ${periodoText}`, 105, y, { align: 'center' })
      y += 15

      // Linha separadora
      pdf.setDrawColor(200)
      pdf.line(20, y, 190, y)
      y += 10

      // Progresso Global
      if (relatorio.progresso_global != null) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(0)
        pdf.text('Progresso Global', 20, y)
        y += 6
        pdf.setFont('helvetica', 'normal')
        pdf.text(`${relatorio.progresso_global}%`, 20, y)
        y += 12
      }

      // Funcao auxiliar para adicionar secao
      const addSection = (title, content, color = [0, 0, 0]) => {
        if (!content) return

        // Verificar se precisa de nova pagina
        if (y > 250) {
          pdf.addPage()
          y = 20
        }

        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(color[0], color[1], color[2])
        pdf.text(title, 20, y)
        y += 6

        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(60)

        const lines = pdf.splitTextToSize(content, 170)
        lines.forEach(line => {
          if (y > 280) {
            pdf.addPage()
            y = 20
          }
          pdf.text(line, 20, y)
          y += 5
        })
        y += 8
      }

      addSection('Resumo Executivo', relatorio.resumo_executivo)
      addSection('Trabalhos Realizados', relatorio.trabalhos_realizados)
      addSection('Trabalhos Previstos Proximo Periodo', relatorio.trabalhos_proxima_semana)
      addSection('Problemas Identificados', relatorio.problemas_identificados, [180, 0, 0])
      addSection('Decisoes Pendentes', relatorio.decisoes_pendentes, [180, 90, 0])
      addSection('Observacoes', relatorio.observacoes)

      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text(`Gerado em ${new Date().toLocaleString('pt-PT')}`, 190, 290, { align: 'right' })

      pdf.save(`${relatorio.codigo}_${obra?.codigo || 'obra'}.pdf`)
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      alert('Erro ao exportar PDF')
    }
  }

  const handleDelete = async (relatorio) => {
    if (!confirm('Tem certeza que deseja apagar este relatorio?')) return

    try {
      const { error } = await supabase
        .from('obra_relatorios')
        .delete()
        .eq('id', relatorio.id)

      if (error) throw error
      loadData()
    } catch (err) {
      console.error('Erro ao apagar:', err)
      alert('Erro ao apagar relatorio')
    }
  }

  const updateEspecialidadeProgresso = (espId, value) => {
    setEditorData(prev => ({
      ...prev,
      progresso_por_especialidade: {
        ...prev.progresso_por_especialidade,
        [espId]: parseInt(value) || 0
      }
    }))
  }

  // Filtrar relatórios
  const relatoriosFiltrados = relatorios.filter(rel => {
    if (filtroTipo && rel.tipo !== filtroTipo) return false
    if (filtroEstado && rel.estado !== filtroEstado) return false
    return true
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatDateRange = (inicio, fim) => {
    const i = new Date(inicio)
    const f = new Date(fim)
    const optsShort = { day: 'numeric', month: 'short' }
    const optsFull = { day: 'numeric', month: 'short', year: 'numeric' }

    if (i.getFullYear() === f.getFullYear()) {
      return `${i.toLocaleDateString('pt-PT', optsShort)} - ${f.toLocaleDateString('pt-PT', optsFull)}`
    }
    return `${i.toLocaleDateString('pt-PT', optsFull)} - ${f.toLocaleDateString('pt-PT', optsFull)}`
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--brown-light)' }}>
        <Loader2 className="spin" size={24} style={{ marginBottom: '8px' }} />
        <p>A carregar relatórios...</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--brown)' }}>
            Relatórios de Obra
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--brown-light)' }}>
            {relatorios.length} {relatorios.length === 1 ? 'relatório' : 'relatórios'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> Novo Relatório
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ padding: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          style={{ fontSize: '13px', minWidth: '140px' }}
        >
          <option value="">Todos os tipos</option>
          {TIPOS_RELATORIO.map(tipo => (
            <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          style={{ fontSize: '13px', minWidth: '140px' }}
        >
          <option value="">Todos os estados</option>
          {Object.entries(ESTADOS_RELATORIO).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {(filtroTipo || filtroEstado) && (
          <button
            onClick={() => { setFiltroTipo(''); setFiltroEstado('') }}
            style={{ fontSize: '12px', color: 'var(--brown-light)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Lista de Relatórios */}
      {relatoriosFiltrados.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ color: 'var(--brown-light)', marginBottom: '8px' }}>Sem relatórios</p>
          <p style={{ fontSize: '13px', color: 'var(--brown-light)' }}>Crie o primeiro relatório para documentar o progresso da obra</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {relatoriosFiltrados.map(relatorio => {
            const estadoConfig = ESTADOS_RELATORIO[relatorio.estado] || ESTADOS_RELATORIO.rascunho
            const EstadoIcon = estadoConfig.icon

            return (
              <div key={relatorio.id} className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    {/* Header do card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brown-light)', fontFamily: 'monospace' }}>
                        {relatorio.codigo}
                      </span>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: `${estadoConfig.cor}20`,
                        color: estadoConfig.cor
                      }}>
                        <EstadoIcon size={12} />
                        {estadoConfig.label}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        background: 'var(--stone)',
                        color: 'var(--brown-light)'
                      }}>
                        {TIPOS_RELATORIO.find(t => t.id === relatorio.tipo)?.label || relatorio.tipo}
                      </span>
                    </div>

                    {/* Título */}
                    <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>
                      {relatorio.titulo}
                    </h4>

                    {/* Período */}
                    <div style={{ fontSize: '13px', color: 'var(--brown-light)', marginBottom: '12px' }}>
                      <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {formatDateRange(relatorio.data_inicio, relatorio.data_fim)}
                    </div>

                    {/* Progresso */}
                    {relatorio.progresso_global != null && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--brown-light)' }}>Progresso</span>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{relatorio.progresso_global}%</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--stone)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${relatorio.progresso_global}%`,
                            height: '100%',
                            background: relatorio.progresso_global >= 80 ? 'var(--success)' : 'var(--warning)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Resumo */}
                    {relatorio.resumo_executivo && (
                      <p style={{
                        fontSize: '13px',
                        color: 'var(--brown-light)',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {relatorio.resumo_executivo}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleExportPdf(relatorio)}
                      title="Exportar PDF"
                    >
                      <FileDown size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleExportDocx(relatorio)}
                      title="Exportar DOCX"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleEdit(relatorio)}
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleDelete(relatorio)}
                      title="Apagar"
                      style={{ color: 'var(--error)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Criação */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Novo Relatório</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Relatório Semanal #12"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                  Tipo
                </label>
                <select
                  value={formData.tipo}
                  onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {TIPOS_RELATORIO.map(tipo => (
                    <option key={tipo.id} value={tipo.id}>{tipo.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Data Início *
                  </label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                    Data Fim *
                  </label>
                  <input
                    type="date"
                    value={formData.data_fim}
                    onChange={e => setFormData({ ...formData, data_fim: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-outline">
                Cancelar
              </button>
              <button onClick={handleCreate} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="spin" size={14} /> : null}
                Criar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editor de Relatório */}
      {showEditorModal && editingRelatorio && (
        <div className="modal-overlay" onClick={() => setShowEditorModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
              <div>
                <h3 style={{ margin: 0 }}>{editingRelatorio.titulo}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--brown-light)' }}>
                  {formatDateRange(editingRelatorio.data_inicio, editingRelatorio.data_fim)}
                </p>
              </div>
              <button onClick={() => setShowEditorModal(false)} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Progresso Global */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Progresso Global
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editorData.progresso_global}
                    onChange={e => setEditorData({ ...editorData, progresso_global: parseInt(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 600, minWidth: '45px', textAlign: 'right' }}>
                    {editorData.progresso_global}%
                  </span>
                </div>
              </div>

              {/* Resumo Executivo */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Resumo Executivo
                </label>
                <textarea
                  value={editorData.resumo_executivo}
                  onChange={e => setEditorData({ ...editorData, resumo_executivo: e.target.value })}
                  placeholder="Breve resumo do período..."
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Trabalhos Realizados */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Trabalhos Realizados
                </label>
                <textarea
                  value={editorData.trabalhos_realizados}
                  onChange={e => setEditorData({ ...editorData, trabalhos_realizados: e.target.value })}
                  placeholder="Descreva os trabalhos executados neste período..."
                  rows={4}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Progresso por Especialidade */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'block' }}>
                  Progresso por Especialidade
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {especialidades.slice(0, 8).map(esp => (
                    <div key={esp.id} style={{ background: 'var(--cream)', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: esp.cor }}>{esp.nome}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>
                          {editorData.progresso_por_especialidade[esp.id] || 0}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editorData.progresso_por_especialidade[esp.id] || 0}
                        onChange={e => updateEspecialidadeProgresso(esp.id, e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Trabalhos Próxima Semana */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Trabalhos Previstos para Próximo Período
                </label>
                <textarea
                  value={editorData.trabalhos_proxima_semana}
                  onChange={e => setEditorData({ ...editorData, trabalhos_proxima_semana: e.target.value })}
                  placeholder="Trabalhos planeados..."
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Problemas */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Problemas Identificados
                </label>
                <textarea
                  value={editorData.problemas_identificados}
                  onChange={e => setEditorData({ ...editorData, problemas_identificados: e.target.value })}
                  placeholder="Problemas ou obstáculos encontrados..."
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Decisões Pendentes */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Decisões Pendentes
                </label>
                <textarea
                  value={editorData.decisoes_pendentes}
                  onChange={e => setEditorData({ ...editorData, decisoes_pendentes: e.target.value })}
                  placeholder="Decisões que aguardam resolução..."
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Observações */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Observações
                </label>
                <textarea
                  value={editorData.observacoes}
                  onChange={e => setEditorData({ ...editorData, observacoes: e.target.value })}
                  placeholder="Outras observações relevantes..."
                  rows={2}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ position: 'sticky', bottom: 0, background: 'white', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowEditorModal(false)} className="btn btn-outline">
                Cancelar
              </button>
              <button onClick={() => handleSave(false)} className="btn btn-outline" disabled={saving}>
                <Save size={14} />
                Guardar Rascunho
              </button>
              <button onClick={() => handleSave(true)} className="btn btn-primary" disabled={saving}>
                {saving ? <Loader2 className="spin" size={14} /> : <Send size={14} />}
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
