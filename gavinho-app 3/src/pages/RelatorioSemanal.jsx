import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, Calendar, Download, FileText, Users, Clock, Sun, Cloud, 
  CloudRain, Wind, AlertTriangle, Camera, ChevronLeft, ChevronRight,
  Eye, Loader2, Building2, FileDown
} from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
         Header, AlignmentType, BorderStyle, WidthType, ShadingType } from 'docx'
import { saveAs } from 'file-saver'

// Helper to get week dates
const getWeekDates = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(d.setDate(diff))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: monday, end: sunday }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDateShort = (date) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

const getWeatherIcon = (meteo) => {
  switch(meteo) {
    case 'Bom': return <Sun size={14} style={{ color: '#d4a853' }} />
    case 'Nublado': return <Cloud size={14} style={{ color: '#9ca3af' }} />
    case 'Chuva': return <CloudRain size={14} style={{ color: '#6b7280' }} />
    case 'Vento': return <Wind size={14} style={{ color: '#9ca3af' }} />
    default: return <Sun size={14} />
  }
}

export default function RelatorioSemanal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const reportRef = useRef(null)
  
  const [obra, setObra] = useState(null)
  const [diarios, setDiarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState(getWeekDates(new Date()))
  const [reportType, setReportType] = useState('cliente') // 'cliente' or 'interno'
  
  useEffect(() => {
    fetchObra()
  }, [id])
  
  useEffect(() => {
    if (obra) fetchDiarios()
  }, [obra, selectedWeek])
  
  const fetchObra = async () => {
    try {
      const { data } = await supabase
        .from('obras')
        .select('*')
        .eq('codigo', id)
        .single()
      setObra(data)
    } catch (err) {
      console.error('Erro:', err)
    }
  }
  
  const fetchDiarios = async () => {
    if (!obra) return
    setLoading(true)
    try {
      const startStr = selectedWeek.start.toISOString().split('T')[0]
      const endStr = selectedWeek.end.toISOString().split('T')[0]
      
      const { data } = await supabase
        .from('obra_diario')
        .select('*')
        .eq('obra_id', obra.id)
        .gte('data', startStr)
        .lte('data', endStr)
        .order('data', { ascending: true })
      
      setDiarios(data || [])
    } catch (err) {
      console.error('Erro:', err)
    }
    setLoading(false)
  }
  
  const changeWeek = (delta) => {
    const newStart = new Date(selectedWeek.start)
    newStart.setDate(newStart.getDate() + (delta * 7))
    setSelectedWeek(getWeekDates(newStart))
  }
  
  // Calculate totals
  const totals = diarios.reduce((acc, d) => ({
    trabalhadores: acc.trabalhadores + (d.trabalhadores_gavinho || 0) + (d.trabalhadores_subempreiteiros || 0),
    horas: acc.horas + (d.horas_trabalhadas || 0),
    fotos: acc.fotos + (d.fotos?.length || 0),
    problemas: acc.problemas + (d.problemas ? 1 : 0)
  }), { trabalhadores: 0, horas: 0, fotos: 0, problemas: 0 })
  
  // Get all photos from the week
  const allPhotos = diarios.flatMap(d => (d.fotos || []).map(f => ({ ...f, data: d.data })))

  // GAVINHO Brand Colors
  const COLORS = {
    olive: '8B8670',
    blush: 'ADAA96', 
    cream: 'F2F0E7',
    brown: '5D5348'
  }

  // Format dates
  const formatDatePT = (dateStr) => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const d = new Date(dateStr)
    return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`
  }

  const formatDateEN = (dateStr) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']
    const d = new Date(dateStr)
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }

  // Create table cell helper
  const createCell = (content, options = {}) => {
    const { bold = false, shading = null, alignment = AlignmentType.LEFT, width = null } = options
    const borders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.blush },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.blush },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.blush },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.blush }
    }

    const children = Array.isArray(content) ? content : [
      new Paragraph({
        alignment,
        children: [new TextRun({ text: content, bold, size: 22 })]
      })
    ]

    const cellOptions = { borders, children }
    if (shading) cellOptions.shading = { fill: shading, type: ShadingType.CLEAR }
    if (width) cellOptions.width = { size: width, type: WidthType.DXA }

    return new TableCell(cellOptions)
  }
  
  // Generate Word document
  const generateReport = async () => {
    setGenerating(true)
    
    try {
      const reportDate = new Date().toISOString().split('T')[0]
      const reportRef = `${obra.codigo}-REL-${reportDate.replace(/-/g, '').slice(2)}`
      const isClientVersion = reportType === 'cliente'
      
      const children = []

      // ============= HEADER =============
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ 
            text: 'RELATÓRIO DE ACOMPANHAMENTO DE OBRA', 
            bold: true, 
            size: 28,
            color: COLORS.olive
          })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ 
            text: `WORK PROGRESS REPORT ${reportDate.replace(/-/g, '')}`, 
            size: 22,
            color: COLORS.brown
          })]
        }),
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.blush } },
          spacing: { after: 400 }
        })
      )

      // ============= PROJECT IDENTIFICATION =============
      children.push(
        new Paragraph({
          spacing: { before: 200, after: 200 },
          children: [new TextRun({ 
            text: 'IDENTIFICAÇÃO | PROJECT IDENTIFICATION', 
            bold: true, 
            size: 24,
            color: COLORS.olive
          })]
        }),
        new Table({
          columnWidths: [2500, 6860],
          rows: [
            new TableRow({ children: [
              createCell('Obra | Project', { bold: true, shading: COLORS.cream, width: 2500 }),
              createCell(`${obra.codigo} – ${obra.nome}`, { width: 6860 })
            ]}),
            new TableRow({ children: [
              createCell('Localização | Location', { bold: true, shading: COLORS.cream, width: 2500 }),
              createCell(obra.localizacao || '-', { width: 6860 })
            ]}),
            new TableRow({ children: [
              createCell('Período | Period', { bold: true, shading: COLORS.cream, width: 2500 }),
              createCell(`${formatDate(selectedWeek.start)} a ${formatDate(selectedWeek.end)}`, { width: 6860 })
            ]}),
            new TableRow({ children: [
              createCell('Data Relatório | Report Date', { bold: true, shading: COLORS.cream, width: 2500 }),
              createCell(`${formatDatePT(reportDate)} | ${formatDateEN(reportDate)}`, { width: 6860 })
            ]})
          ]
        })
      )

      // ============= EXECUTIVE SUMMARY =============
      const summaryPT = diarios.map(d => d.resumo).filter(Boolean).join(' ')
      
      if (summaryPT) {
        children.push(
          new Paragraph({ spacing: { before: 400 } }),
          new Table({
            columnWidths: [9360],
            rows: [
              new TableRow({ children: [
                createCell('RESUMO EXECUTIVO | EXECUTIVE SUMMARY', { 
                  bold: true, 
                  shading: COLORS.cream, 
                  alignment: AlignmentType.CENTER,
                  width: 9360
                })
              ]}),
              new TableRow({ children: [
                createCell([
                  new Paragraph({
                    spacing: { before: 100, after: 100 },
                    children: [new TextRun({ text: summaryPT, italics: true, size: 22 })]
                  })
                ], { width: 9360 })
              ]})
            ]
          })
        )
      }

      // ============= COMPLETED WORKS =============
      children.push(
        new Paragraph({ spacing: { before: 400 } }),
        new Table({
          columnWidths: [9360],
          rows: [
            new TableRow({ children: [
              createCell('TRABALHOS EXECUTADOS | COMPLETED WORKS', { 
                bold: true, 
                shading: COLORS.cream, 
                alignment: AlignmentType.CENTER,
                width: 9360
              })
            ]})
          ]
        })
      )

      // Add each day's work
      diarios.forEach((d, idx) => {
        if (d.trabalhos_realizados) {
          children.push(
            new Paragraph({
              spacing: { before: 300, after: 100 },
              children: [new TextRun({ 
                text: `${idx + 1}. ${formatDatePT(d.data)} | ${formatDateEN(d.data)}`,
                bold: true,
                size: 24,
                color: COLORS.olive
              })]
            })
          )

          const workItems = d.trabalhos_realizados.split('\n').filter(Boolean)
          workItems.forEach(item => {
            children.push(
              new Paragraph({
                spacing: { before: 50 },
                indent: { left: 360 },
                children: [
                  new TextRun({ text: '• ', size: 22 }),
                  new TextRun({ text: item.trim(), size: 22 })
                ]
              })
            )
          })
        }
      })

      // ============= PROBLEMS (Internal version only) =============
      if (!isClientVersion) {
        const problems = diarios.filter(d => d.problemas)
        if (problems.length > 0) {
          children.push(
            new Paragraph({ spacing: { before: 400 } }),
            new Table({
              columnWidths: [9360],
              rows: [
                new TableRow({ children: [
                  createCell('OBSERVAÇÕES IMPORTANTES | IMPORTANT REMARKS', { 
                    bold: true, 
                    shading: COLORS.cream, 
                    alignment: AlignmentType.CENTER,
                    width: 9360
                  })
                ]})
              ]
            })
          )

          problems.forEach(p => {
            children.push(
              new Paragraph({
                spacing: { before: 200 },
                shading: { fill: 'FFF0F0', type: ShadingType.CLEAR },
                border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'CC8888' } },
                indent: { left: 200 },
                children: [
                  new TextRun({ text: `${formatDate(p.data)}: `, bold: true, size: 22 }),
                  new TextRun({ text: p.problemas, size: 22 })
                ]
              })
            )
          })
        }
      }

      // ============= NEXT STEPS (Internal version only) =============
      if (!isClientVersion) {
        const nextSteps = diarios.filter(d => d.trabalhos_previstos_amanha).slice(-1)[0]
        if (nextSteps) {
          children.push(
            new Paragraph({ spacing: { before: 400 } }),
            new Table({
              columnWidths: [9360],
              rows: [
                new TableRow({ children: [
                  createCell('PRÓXIMOS PASSOS | NEXT STEPS', { 
                    bold: true, 
                    shading: COLORS.cream, 
                    alignment: AlignmentType.CENTER,
                    width: 9360
                  })
                ]})
              ]
            }),
            new Paragraph({
              spacing: { before: 200, after: 200 },
              children: [new TextRun({ text: nextSteps.trabalhos_previstos_amanha, size: 22 })]
            })
          )
        }
      }

      // ============= FOOTER =============
      children.push(
        new Paragraph({ spacing: { before: 600 } }),
        new Table({
          columnWidths: [9360],
          rows: [
            new TableRow({ children: [
              createCell([
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'Elaborado por | Prepared by:', size: 20, color: COLORS.brown })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'GAVINHO BUILD | Direção de Obra', bold: true, size: 22 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `Referência | Reference: ${reportRef}`, size: 20, color: COLORS.brown })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `Data | Date: ${formatDatePT(reportDate)} | ${formatDateEN(reportDate)}`, size: 20, color: COLORS.brown })]
                })
              ], { shading: COLORS.cream, width: 9360 })
            ]})
          ]
        })
      )

      // Create document
      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: 'Arial', size: 22 }
            }
          }
        },
        sections: [{
          properties: {
            page: {
              margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
            }
          },
          headers: {
            default: new Header({
              children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: 'GAVINHO', size: 24, color: COLORS.olive })]
              })]
            })
          },
          children
        }]
      })

      // Generate and download
      const buffer = await Packer.toBlob(doc)
      const fileName = `${obra.codigo}_Relatorio_${reportDate}_${isClientVersion ? 'Cliente' : 'Interno'}.docx`
      saveAs(buffer, fileName)
      
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      alert('Erro ao gerar relatório. Tente novamente.')
    }
    
    setGenerating(false)
  }
  
  if (!obra) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
      </div>
    )
  }
  
  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(`/obras/${id}`)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'none', 
            border: 'none', 
            color: 'var(--brown-light)', 
            cursor: 'pointer',
            marginBottom: '16px',
            fontSize: '14px'
          }}
        >
          <ArrowLeft size={16} /> Voltar à Obra
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '4px' }}>Relatório Semanal</h1>
            <p style={{ color: 'var(--brown-light)' }}>{obra.nome} • {obra.codigo}</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={generateReport}
              disabled={generating || diarios.length === 0}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {generating ? <Loader2 size={16} className="spin" /> : <FileDown size={16} />}
              {generating ? 'A gerar...' : 'Exportar Word'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Week selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => changeWeek(-1)} className="btn btn-ghost btn-icon">
              <ChevronLeft size={20} />
            </button>
            <div style={{ textAlign: 'center', minWidth: '200px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>
                Semana de {formatDate(selectedWeek.start)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--brown-light)' }}>
                até {formatDate(selectedWeek.end)}
              </div>
            </div>
            <button onClick={() => changeWeek(1)} className="btn btn-ghost btn-icon">
              <ChevronRight size={20} />
            </button>
          </div>
          
          {/* Report type toggle */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--cream)', padding: '4px', borderRadius: '10px' }}>
            <button 
              onClick={() => setReportType('cliente')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: reportType === 'cliente' ? 'var(--white)' : 'transparent',
                boxShadow: reportType === 'cliente' ? 'var(--shadow-sm)' : 'none',
                fontWeight: reportType === 'cliente' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              <Eye size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Versão Cliente
            </button>
            <button 
              onClick={() => setReportType('interno')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: reportType === 'interno' ? 'var(--white)' : 'transparent',
                boxShadow: reportType === 'interno' ? 'var(--shadow-sm)' : 'none',
                fontWeight: reportType === 'interno' ? 600 : 400,
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              <Building2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Versão Interna
            </button>
          </div>
        </div>
      </div>
      
      {/* Report Preview */}
      {loading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--brown-light)' }} />
        </div>
      ) : diarios.length === 0 ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Calendar size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ color: 'var(--brown-light)' }}>Sem registos nesta semana</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '32px', background: 'white' }} ref={reportRef}>
          {/* Report Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', paddingBottom: '16px', borderBottom: '2px solid var(--blush)' }}>
            <div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 600, color: 'var(--olive)', letterSpacing: '2px', marginBottom: '8px' }}>
                GAVINHO
              </div>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', fontWeight: 600, color: 'var(--olive)' }}>
                Relatório Semanal de Obra
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--brown-light)', marginTop: '4px' }}>
                {obra.nome}
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--brown-light)' }}>
              <div style={{ fontWeight: 600 }}>{obra.codigo}</div>
              <div>{formatDate(selectedWeek.start)} a {formatDate(selectedWeek.end)}</div>
              {obra.localizacao && <div>{obra.localizacao}</div>}
            </div>
          </div>
          
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--olive)' }}>{diarios.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Dias de Trabalho</div>
            </div>
            <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--olive)' }}>{totals.horas}h</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Horas Trabalhadas</div>
            </div>
            {reportType === 'interno' && (
              <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--olive)' }}>{totals.trabalhadores}</div>
                <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Homem-Dia</div>
              </div>
            )}
            <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--olive)' }}>{totals.fotos}</div>
              <div style={{ fontSize: '11px', color: 'var(--brown-light)', textTransform: 'uppercase' }}>Fotografias</div>
            </div>
            {reportType === 'interno' && totals.problemas > 0 && (
              <div style={{ padding: '20px', background: 'rgba(184, 138, 138, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--error)' }}>{totals.problemas}</div>
                <div style={{ fontSize: '11px', color: 'var(--error)', textTransform: 'uppercase' }}>Ocorrências</div>
              </div>
            )}
          </div>
          
          {/* Daily Reports */}
          <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--olive)', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--blush)' }}>
            Resumo Diário
          </h2>
          
          {diarios.map((d, idx) => (
            <div key={d.id} style={{ 
              marginBottom: '20px', 
              padding: '20px', 
              background: 'var(--cream)',
              borderRadius: '12px',
              borderLeft: '4px solid var(--blush)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>
                  {formatDateShort(d.data)}
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--brown-light)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {getWeatherIcon(d.condicoes_meteo)} {d.condicoes_meteo}
                  </span>
                  {reportType === 'interno' && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} /> {(d.trabalhadores_gavinho || 0) + (d.trabalhadores_subempreiteiros || 0)}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {d.horas_trabalhadas || 8}h
                  </span>
                </div>
              </div>
              
              {d.resumo && (
                <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>{d.resumo}</p>
              )}
              
              {d.trabalhos_realizados && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--brown-light)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Trabalhos Realizados
                  </div>
                  <div style={{ fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {d.trabalhos_realizados}
                  </div>
                </div>
              )}
              
              {/* Problems - only in internal version */}
              {reportType === 'interno' && d.problemas && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '12px', 
                  background: 'rgba(184, 138, 138, 0.1)', 
                  borderRadius: '8px',
                  borderLeft: '3px solid var(--error)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--error)', marginBottom: '4px' }}>
                    <AlertTriangle size={12} /> PROBLEMAS / INCIDENTES
                  </div>
                  <div style={{ fontSize: '13px' }}>{d.problemas}</div>
                </div>
              )}
              
              {/* Photos */}
              {d.fotos && d.fotos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {d.fotos.slice(0, reportType === 'cliente' ? 4 : 8).map((foto, fIdx) => (
                    <img 
                      key={fIdx} 
                      src={foto.url} 
                      alt={foto.nome}
                      style={{ 
                        width: '100%', 
                        aspectRatio: '4/3',
                        objectFit: 'cover', 
                        borderRadius: '8px'
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Next Week Preview - only in internal version */}
          {reportType === 'interno' && diarios.some(d => d.trabalhos_previstos_amanha) && (
            <>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', fontWeight: 600, color: 'var(--olive)', marginTop: '32px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--blush)' }}>
                Previsão Próxima Semana
              </h2>
              <div style={{ padding: '20px', background: 'var(--cream)', borderRadius: '12px' }}>
                {diarios.filter(d => d.trabalhos_previstos_amanha).slice(-1).map(d => (
                  <div key={d.id} style={{ fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {d.trabalhos_previstos_amanha}
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Footer */}
          <div style={{ 
            marginTop: '32px', 
            paddingTop: '16px', 
            borderTop: '1px solid var(--stone)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--brown-light)'
          }}>
            <div>GAVINHO Group • Design & Build</div>
            <div>Relatório gerado em {formatDate(new Date())}</div>
          </div>
        </div>
      )}
    </div>
  )
}
