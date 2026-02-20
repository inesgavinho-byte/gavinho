import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resolve obra code or UUID to { obraUuid, obra, loading }.
 * Accepts either a UUID (e.g. from DB) or a codigo (e.g. "GB00462" from URL).
 * Always returns the UUID in obraUuid and the full obra row in obra.
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
      const isUuid = UUID_RE.test(codigoOrId)
      const column = isUuid ? 'id' : 'codigo'

      const { data } = await supabase
        .from('obras')
        .select('*, projetos(id, codigo, nome, cliente_nome)')
        .eq(column, codigoOrId)
        .single()

      if (cancelled) return

      if (data) {
        setObraUuid(data.id)
        setObra(data)
      }
      setLoading(false)
    }

    resolve()
    return () => { cancelled = true }
  }, [codigoOrId])

  return { obraUuid, obra, loading }
}
