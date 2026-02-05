// =====================================================
// EQUIPA COMPONENT
// Displays team members assigned to the obra
// =====================================================

import { useState, useEffect } from 'react'
import { Users, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { styles } from '../styles'
import { getInitials } from '../utils'

export default function Equipa({ obra }) {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMembros()
  }, [obra])

  const loadMembros = async () => {
    try {
      const { data } = await supabase
        .from('obra_membros')
        .select('*')
        .eq('obra_id', obra.id)
        .eq('ativo', true)

      setMembros(data || [])
    } catch (err) {
      console.error('Erro ao carregar equipa:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={styles.formContainer}>
      <h2 style={styles.formTitle}>
        <Users size={24} /> Equipa da Obra
      </h2>

      {membros.length === 0 ? (
        <div style={styles.emptyState}>
          <Users size={48} style={{ opacity: 0.3 }} />
          <p>Sem membros registados</p>
        </div>
      ) : (
        <div style={styles.membrosList}>
          {membros.map(m => (
            <div key={m.id} style={styles.membroItem}>
              <div style={styles.membroAvatar}>
                {getInitials(m.nome)}
              </div>
              <div>
                <strong>{m.nome}</strong>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{m.cargo || 'Equipa'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
