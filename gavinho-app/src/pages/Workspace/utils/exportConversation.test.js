// =====================================================
// EXPORT CONVERSATION TESTS
// =====================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EXPORT_FORMATS } from './exportConversation'

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}))

// Mock jspdf
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      pages: [null, {}]
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    splitTextToSize: vi.fn((text) => [text]),
    addPage: vi.fn(),
    setPage: vi.fn(),
    save: vi.fn()
  }))
}))

// Mock docx
vi.mock('docx', () => ({
  Document: vi.fn().mockImplementation(() => ({})),
  Packer: {
    toBlob: vi.fn().mockResolvedValue(new Blob(['test']))
  },
  Paragraph: vi.fn().mockImplementation(() => ({})),
  TextRun: vi.fn().mockImplementation(() => ({})),
  HeadingLevel: { HEADING_1: 'heading1' },
  BorderStyle: { SINGLE: 'single' }
}))

describe('EXPORT_FORMATS', () => {
  it('should have correct format values', () => {
    expect(EXPORT_FORMATS.PDF).toBe('pdf')
    expect(EXPORT_FORMATS.JSON).toBe('json')
    expect(EXPORT_FORMATS.DOCX).toBe('docx')
    expect(EXPORT_FORMATS.TXT).toBe('txt')
  })
})

describe('exportConversation', () => {
  const mockMessages = [
    {
      id: '1',
      conteudo: 'Hello world',
      autor_id: 'user1',
      autor: { id: 'user1', nome: 'John Doe' },
      created_at: '2025-01-15T10:30:00Z',
      reactions: { '👍': 2, '❤️': 1 },
      anexos: [{ name: 'file.pdf' }]
    },
    {
      id: '2',
      conteudo: 'How are you?',
      autor_id: 'user2',
      autor: { id: 'user2', nome: 'Jane Smith' },
      created_at: '2025-01-15T11:00:00Z',
      reactions: {},
      anexos: []
    }
  ]

  const mockChannelInfo = {
    id: 'channel1',
    codigo: 'PROJ-001',
    nome: 'Test Channel',
    equipa: 'team1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToJSON', () => {
    it('should export messages to JSON format', async () => {
      const { exportToJSON } = await import('./exportConversation')
      const { saveAs } = await import('file-saver')

      const result = exportToJSON(mockMessages, mockChannelInfo)

      expect(result.success).toBe(true)
      expect(result.messageCount).toBe(2)
      expect(result.filename).toMatch(/PROJ-001_export_\d{8}\.json/)
      expect(saveAs).toHaveBeenCalled()
    })

    it('should filter messages by date range', async () => {
      const { exportToJSON } = await import('./exportConversation')

      const result = exportToJSON(mockMessages, mockChannelInfo, {
        dateFrom: '2025-01-15',
        dateTo: '2025-01-15'
      })

      expect(result.success).toBe(true)
      expect(result.messageCount).toBe(2)
    })

    it('should filter out messages outside date range', async () => {
      const { exportToJSON } = await import('./exportConversation')

      const result = exportToJSON(mockMessages, mockChannelInfo, {
        dateFrom: '2025-01-16',
        dateTo: '2025-01-16'
      })

      expect(result.success).toBe(true)
      expect(result.messageCount).toBe(0)
    })
  })

  describe('exportToTXT', () => {
    it('should export messages to TXT format', async () => {
      const { exportToTXT } = await import('./exportConversation')
      const { saveAs } = await import('file-saver')

      const result = exportToTXT(mockMessages, mockChannelInfo)

      expect(result.success).toBe(true)
      expect(result.messageCount).toBe(2)
      expect(result.filename).toMatch(/PROJ-001_export_\d{8}\.txt/)
      expect(saveAs).toHaveBeenCalled()
    })
  })

  describe('exportToPDF', () => {
    it('should export messages to PDF format', async () => {
      const { exportToPDF } = await import('./exportConversation')

      const result = exportToPDF(mockMessages, mockChannelInfo)

      expect(result.success).toBe(true)
      expect(result.messageCount).toBe(2)
      expect(result.filename).toMatch(/PROJ-001_export_\d{8}\.pdf/)
    })

    it('should respect includeMetadata option', async () => {
      const { exportToPDF } = await import('./exportConversation')

      const result = exportToPDF(mockMessages, mockChannelInfo, {
        includeMetadata: false
      })

      expect(result.success).toBe(true)
    })
  })

  describe('exportToDOCX', () => {
    it('should export messages to DOCX format', async () => {
      const { exportToDOCX } = await import('./exportConversation')
      const { saveAs } = await import('file-saver')

      const result = await exportToDOCX(mockMessages, mockChannelInfo)

      expect(result.success).toBe(true)
      expect(result.messageCount).toBe(2)
      expect(result.filename).toMatch(/PROJ-001_export_\d{8}\.docx/)
      expect(saveAs).toHaveBeenCalled()
    })
  })

  describe('exportConversation main function', () => {
    it('should call correct export function based on format', async () => {
      const { exportConversation } = await import('./exportConversation')

      const jsonResult = await exportConversation(EXPORT_FORMATS.JSON, mockMessages, mockChannelInfo)
      expect(jsonResult.success).toBe(true)

      const txtResult = await exportConversation(EXPORT_FORMATS.TXT, mockMessages, mockChannelInfo)
      expect(txtResult.success).toBe(true)

      const pdfResult = await exportConversation(EXPORT_FORMATS.PDF, mockMessages, mockChannelInfo)
      expect(pdfResult.success).toBe(true)

      const docxResult = await exportConversation(EXPORT_FORMATS.DOCX, mockMessages, mockChannelInfo)
      expect(docxResult.success).toBe(true)
    })

    it('should return error for unsupported format', async () => {
      const { exportConversation } = await import('./exportConversation')

      const result = await exportConversation('invalid', mockMessages, mockChannelInfo)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Formato não suportado: invalid')
    })
  })
})
