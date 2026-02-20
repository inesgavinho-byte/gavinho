import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Sentry from '../lib/sentry'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * @typedef {Object} Obra
 * @property {string} id - UUID da obra
 * @property {string} codigo - Código legível (ex: "GB00462")
 * @property {string} nome - Nome da obra
 * @property {string} [localizacao]
 * @property {string} [encarregado]
 * @property {string} [status]
 * @property {number} [progresso]
 * @property {string} [projeto_id]
 * @property {{ id: string, codigo: string, nome: string, cliente_nome: string }} [projetos]
 */

/**
 * @typedef {Object} UseObraIdReturn
 * @property {string | null} obraUuid - UUID resolvido (null enquanto loading)
 * @property {Obra | null} obra - Objecto completo da obra (com projetos join)
 * @property {boolean} loading - true durante a resolução
 */

/**
 * Resolve obra code or UUID to { obraUuid, obra, loading }.
 * Accepts either a UUID (e.g. from DB) or a codigo (e.g. "GB00462" from URL).
 * Always returns the UUID in obraUuid and the full obra row in obra.
 *
 * @param {string | undefined} codigoOrId - UUID ou código da obra
 * @returns {UseObraIdReturn}
 */
export function useObraId(codigoOrId) {
  const [obraUuid, setObraUuid] = useState(null)
  const [obra, setObra] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!codigoOrId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function resolve() {
      setLoading(true)
      try {
        const isUuid = UUID_RE.test(codigoOrId)
        const column = isUuid ? 'id' : 'codigo'

        const { data, error } = await supabase
          .from('obras')
          .select('*, projetos(id, codigo, nome, cliente_nome)')
          .eq(column, codigoOrId)
          .single()

        if (error) throw error
        if (cancelled) return

        if (data) {
          setObraUuid(data.id)
          setObra(data)
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { hook: 'useObraId', input: codigoOrId } })
        console.error('useObraId:', err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [codigoOrId])

  return { obraUuid, obra, loading }
}
