// =====================================================
// OBRA SELECTOR COMPONENT
// Allows user to select from multiple assigned obras
// =====================================================

import { HardHat } from 'lucide-react'
import { styles } from '../styles'

export default function ObraSelector({ obras, onSelect }) {
  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginCard}>
        <div style={styles.loginHeader}>
          <HardHat size={48} style={{ color: '#6b7280' }} />
          <h1 style={{ margin: '12px 0 4px' }}>As tuas obras</h1>
          <p style={{ margin: 0, opacity: 0.7 }}>Seleciona uma obra</p>
        </div>

        <div style={styles.obrasList}>
          {obras.map(obra => (
            <button
              key={obra.id}
              onClick={() => onSelect(obra)}
              style={styles.obraItem}
            >
              <HardHat size={24} style={{ color: '#6b7280' }} />
              <div>
                <strong>{obra.codigo}</strong>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{obra.nome}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
