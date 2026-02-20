import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useObraId } from '../useObraId'

// ── Mock supabase ──────────────────────────────────────
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('../../lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) }
}))

// ── Mock Sentry (noop) ────────────────────────────────
vi.mock('../../lib/sentry', () => ({
  default: { captureException: vi.fn() }
}))

// ── Test data ──────────────────────────────────────────
const MOCK_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const MOCK_CODIGO = 'GB00462'
const MOCK_OBRA = {
  id: MOCK_UUID,
  codigo: MOCK_CODIGO,
  nome: 'Obra Teste',
  localizacao: 'Lisboa',
  status: 'em_curso',
  projetos: { id: 'proj-1', codigo: 'P001', nome: 'Projeto 1', cliente_nome: 'Cliente X' }
}

// ── Tests ──────────────────────────────────────────────
describe('useObraId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns loading=false and null values when called without argument', async () => {
    const { result } = renderHook(() => useObraId(undefined))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.obraUuid).toBeNull()
    expect(result.current.obra).toBeNull()
  })

  it('resolves a UUID by querying column "id"', async () => {
    mockSingle.mockResolvedValue({ data: MOCK_OBRA, error: null })

    const { result } = renderHook(() => useObraId(MOCK_UUID))

    // Should start loading
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should query with 'id' column
    expect(mockFrom).toHaveBeenCalledWith('obras')
    expect(mockSelect).toHaveBeenCalledWith('*, projetos(id, codigo, nome, cliente_nome)')
    expect(mockEq).toHaveBeenCalledWith('id', MOCK_UUID)

    // Should return resolved data
    expect(result.current.obraUuid).toBe(MOCK_UUID)
    expect(result.current.obra).toEqual(MOCK_OBRA)
  })

  it('resolves a codigo by querying column "codigo"', async () => {
    mockSingle.mockResolvedValue({ data: MOCK_OBRA, error: null })

    const { result } = renderHook(() => useObraId(MOCK_CODIGO))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should query with 'codigo' column
    expect(mockEq).toHaveBeenCalledWith('codigo', MOCK_CODIGO)

    // Should return the UUID from the resolved data
    expect(result.current.obraUuid).toBe(MOCK_UUID)
    expect(result.current.obra).toEqual(MOCK_OBRA)
  })

  it('handles invalid/unknown value gracefully (supabase returns error)', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Row not found', code: 'PGRST116' }
    })

    const { result } = renderHook(() => useObraId('INVALID_123'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should query with 'codigo' (not a UUID pattern)
    expect(mockEq).toHaveBeenCalledWith('codigo', 'INVALID_123')

    // Should return nulls
    expect(result.current.obraUuid).toBeNull()
    expect(result.current.obra).toBeNull()
  })

  it('handles empty string the same as undefined', async () => {
    const { result } = renderHook(() => useObraId(''))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.obraUuid).toBeNull()
    expect(result.current.obra).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('reports error to Sentry on failure', async () => {
    const Sentry = await import('../../lib/sentry')
    const mockError = { message: 'Network error', code: '500' }
    mockSingle.mockResolvedValue({ data: null, error: mockError })

    const { result } = renderHook(() => useObraId(MOCK_UUID))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(Sentry.default.captureException).toHaveBeenCalledWith(
      mockError,
      { tags: { hook: 'useObraId', input: MOCK_UUID } }
    )
  })
})
