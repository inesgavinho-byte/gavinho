// =====================================================
// EXPORT CONVERSATION UTILITY
// Export chat messages to PDF, JSON, or DOCX formats
// =====================================================

import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { formatDateTime } from './formatters'

/**
 * Export formats supported
 */
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  JSON: 'json',
  DOCX: 'docx',
  TXT: 'txt'
}

/**
 * Format message for plain text export
 */
const formatMessagePlainText = (message) => {
  const author = message.autor?.nome || 'Utilizador'
  const date = formatDateTime(message.created_at)
  const content = message.conteudo || ''

  let text = `[${date}] ${author}:\n${content}`

  // Add reactions if any
  if (message.reactions && Object.keys(message.reactions).length > 0) {
    const reactionsText = Object.entries(message.reactions)
      .map(([emoji, count]) => `${emoji} ${count}`)
      .join(' ')
    text += `\nReações: ${reactionsText}`
  }

  // Add attachments if any
  if (message.anexos && message.anexos.length > 0) {
    const attachmentsText = message.anexos.map(a => a.name || a.nome).join(', ')
    text += `\nAnexos: ${attachmentsText}`
  }

  return text
}

/**
 * Filter messages by date range
 */
const filterMessagesByDate = (messages, dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) return messages

  return messages.filter(msg => {
    const msgDate = new Date(msg.created_at)

    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      if (msgDate < from) return false
    }

    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      if (msgDate > to) return false
    }

    return true
  })
}

/**
 * Export to JSON format
 */
export const exportToJSON = (messages, channelInfo, options = {}) => {
  const { dateFrom, dateTo } = options
  const filteredMessages = filterMessagesByDate(messages, dateFrom, dateTo)

  const exportData = {
    exportDate: new Date().toISOString(),
    channel: {
      id: channelInfo.id,
      code: channelInfo.codigo,
      name: channelInfo.nome,
      team: channelInfo.equipa
    },
    filters: {
      dateFrom: dateFrom || null,
      dateTo: dateTo || null
    },
    messageCount: filteredMessages.length,
    messages: filteredMessages.map(msg => ({
      id: msg.id,
      content: msg.conteudo,
      author: {
        id: msg.autor_id || msg.autor?.id,
        name: msg.autor?.nome,
        avatar: msg.autor?.avatar
      },
      createdAt: msg.created_at,
      reactions: msg.reactions || {},
      attachments: msg.anexos || [],
      threadCount: msg.thread_count || 0,
      isPinned: msg.is_pinned || false
    }))
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const filename = `${channelInfo.codigo || 'chat'}_export_${formatFilenameDate()}.json`
  saveAs(blob, filename)

  return { success: true, filename, messageCount: filteredMessages.length }
}

/**
 * Export to plain text format
 */
export const exportToTXT = (messages, channelInfo, options = {}) => {
  const { dateFrom, dateTo } = options
  const filteredMessages = filterMessagesByDate(messages, dateFrom, dateTo)

  let content = `EXPORTAÇÃO DE CONVERSA\n`
  content += `${'='.repeat(50)}\n\n`
  content += `Canal: ${channelInfo.codigo} - ${channelInfo.nome}\n`
  content += `Data de exportação: ${formatDateTime(new Date().toISOString())}\n`
  content += `Total de mensagens: ${filteredMessages.length}\n`

  if (dateFrom || dateTo) {
    content += `Período: ${dateFrom || 'início'} até ${dateTo || 'agora'}\n`
  }

  content += `\n${'='.repeat(50)}\n\n`

  // Sort by date ascending
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )

  sortedMessages.forEach((msg, index) => {
    content += formatMessagePlainText(msg)
    if (index < sortedMessages.length - 1) {
      content += `\n${'-'.repeat(30)}\n`
    }
  })

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const filename = `${channelInfo.codigo || 'chat'}_export_${formatFilenameDate()}.txt`
  saveAs(blob, filename)

  return { success: true, filename, messageCount: filteredMessages.length }
}

/**
 * Export to PDF format
 */
export const exportToPDF = (messages, channelInfo, options = {}) => {
  const { dateFrom, dateTo, includeMetadata = true } = options
  const filteredMessages = filterMessagesByDate(messages, dateFrom, dateTo)

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const lineHeight = 7
  let yPosition = margin

  // Helper to add new page if needed
  const checkPageBreak = (requiredHeight = lineHeight) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Helper to wrap text
  const wrapText = (text, maxWidth) => {
    return doc.splitTextToSize(text, maxWidth)
  }

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Exportação de Conversa', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += lineHeight * 2

  // Channel info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Canal: ${channelInfo.codigo} - ${channelInfo.nome}`, margin, yPosition)
  yPosition += lineHeight

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Exportado em: ${formatDateTime(new Date().toISOString())}`, margin, yPosition)
  yPosition += lineHeight

  doc.text(`Total de mensagens: ${filteredMessages.length}`, margin, yPosition)
  yPosition += lineHeight

  if (dateFrom || dateTo) {
    doc.text(`Período: ${dateFrom || 'início'} até ${dateTo || 'agora'}`, margin, yPosition)
    yPosition += lineHeight
  }

  // Separator line
  yPosition += 5
  doc.setDrawColor(200)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += lineHeight * 1.5

  // Reset text color
  doc.setTextColor(0)

  // Sort messages by date ascending
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )

  // Messages
  sortedMessages.forEach((msg) => {
    const author = msg.autor?.nome || 'Utilizador'
    const date = formatDateTime(msg.created_at)
    const content = msg.conteudo || ''

    // Check for page break before header
    checkPageBreak(lineHeight * 2)

    // Author and date header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(author, margin, yPosition)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(date, pageWidth - margin, yPosition, { align: 'right' })
    doc.setTextColor(0)
    yPosition += lineHeight

    // Message content
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const wrappedContent = wrapText(content, pageWidth - margin * 2)
    wrappedContent.forEach((line) => {
      checkPageBreak()
      doc.text(line, margin, yPosition)
      yPosition += lineHeight * 0.85
    })

    // Reactions
    if (includeMetadata && msg.reactions && Object.keys(msg.reactions).length > 0) {
      const reactionsText = Object.entries(msg.reactions)
        .map(([emoji, count]) => `${emoji} ${count}`)
        .join('  ')

      checkPageBreak()
      doc.setFontSize(9)
      doc.setTextColor(80)
      doc.text(`Reações: ${reactionsText}`, margin, yPosition)
      doc.setTextColor(0)
      yPosition += lineHeight
    }

    // Attachments
    if (includeMetadata && msg.anexos && msg.anexos.length > 0) {
      checkPageBreak()
      doc.setFontSize(9)
      doc.setTextColor(80)
      const attachmentNames = msg.anexos.map(a => a.name || a.nome).join(', ')
      doc.text(`Anexos: ${attachmentNames}`, margin, yPosition)
      doc.setTextColor(0)
      yPosition += lineHeight
    }

    // Separator between messages
    yPosition += 3
    doc.setDrawColor(230)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += lineHeight
  })

  // Footer with page numbers
  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  const filename = `${channelInfo.codigo || 'chat'}_export_${formatFilenameDate()}.pdf`
  doc.save(filename)

  return { success: true, filename, messageCount: filteredMessages.length }
}

/**
 * Export to DOCX format
 */
export const exportToDOCX = async (messages, channelInfo, options = {}) => {
  const { dateFrom, dateTo, includeMetadata = true } = options
  const filteredMessages = filterMessagesByDate(messages, dateFrom, dateTo)

  // Sort messages by date ascending
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )

  const children = [
    // Title
    new Paragraph({
      text: 'Exportação de Conversa',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    }),

    // Channel info
    new Paragraph({
      children: [
        new TextRun({ text: 'Canal: ', bold: true }),
        new TextRun(`${channelInfo.codigo} - ${channelInfo.nome}`)
      ],
      spacing: { after: 100 }
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Exportado em: ', color: '666666' }),
        new TextRun({ text: formatDateTime(new Date().toISOString()), color: '666666' })
      ],
      spacing: { after: 100 }
    }),

    new Paragraph({
      children: [
        new TextRun({ text: 'Total de mensagens: ', color: '666666' }),
        new TextRun({ text: String(filteredMessages.length), color: '666666' })
      ],
      spacing: { after: 100 }
    })
  ]

  // Add period info if filtered
  if (dateFrom || dateTo) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Período: ', color: '666666' }),
          new TextRun({ text: `${dateFrom || 'início'} até ${dateTo || 'agora'}`, color: '666666' })
        ],
        spacing: { after: 200 }
      })
    )
  }

  // Separator
  children.push(
    new Paragraph({
      border: {
        bottom: { color: 'CCCCCC', space: 1, size: 6, style: BorderStyle.SINGLE }
      },
      spacing: { after: 300 }
    })
  )

  // Messages
  sortedMessages.forEach((msg) => {
    const author = msg.autor?.nome || 'Utilizador'
    const date = formatDateTime(msg.created_at)
    const content = msg.conteudo || ''

    // Author and date header
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: author, bold: true }),
          new TextRun({ text: `  ${date}`, color: '888888', size: 20 })
        ],
        spacing: { before: 200 }
      })
    )

    // Message content
    children.push(
      new Paragraph({
        text: content,
        spacing: { after: 100 }
      })
    )

    // Reactions
    if (includeMetadata && msg.reactions && Object.keys(msg.reactions).length > 0) {
      const reactionsText = Object.entries(msg.reactions)
        .map(([emoji, count]) => `${emoji} ${count}`)
        .join('  ')

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Reações: ', color: '666666', size: 18 }),
            new TextRun({ text: reactionsText, color: '666666', size: 18 })
          ]
        })
      )
    }

    // Attachments
    if (includeMetadata && msg.anexos && msg.anexos.length > 0) {
      const attachmentNames = msg.anexos.map(a => a.name || a.nome).join(', ')

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Anexos: ', color: '666666', size: 18 }),
            new TextRun({ text: attachmentNames, color: '666666', size: 18 })
          ]
        })
      )
    }

    // Separator between messages
    children.push(
      new Paragraph({
        border: {
          bottom: { color: 'EEEEEE', space: 1, size: 2, style: BorderStyle.SINGLE }
        },
        spacing: { after: 100 }
      })
    )
  })

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${channelInfo.codigo || 'chat'}_export_${formatFilenameDate()}.docx`
  saveAs(blob, filename)

  return { success: true, filename, messageCount: filteredMessages.length }
}

/**
 * Format date for filename
 */
const formatFilenameDate = () => {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Main export function
 */
export const exportConversation = async (format, messages, channelInfo, options = {}) => {
  try {
    switch (format) {
      case EXPORT_FORMATS.JSON:
        return exportToJSON(messages, channelInfo, options)

      case EXPORT_FORMATS.TXT:
        return exportToTXT(messages, channelInfo, options)

      case EXPORT_FORMATS.PDF:
        return exportToPDF(messages, channelInfo, options)

      case EXPORT_FORMATS.DOCX:
        return await exportToDOCX(messages, channelInfo, options)

      default:
        throw new Error(`Formato não suportado: ${format}`)
    }
  } catch (error) {
    console.error('Export error:', error)
    return { success: false, error: error.message }
  }
}

export default exportConversation
