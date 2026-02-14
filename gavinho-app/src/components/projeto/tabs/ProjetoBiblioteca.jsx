import { Library, Plus } from 'lucide-react'
import styles from '../../../pages/ProjetoDetalhe.module.css'

export function ProjetoBiblioteca() {
  return (
    <div>
      <div className={styles.kpiGrid}>
        {[
          { label: 'Materiais', count: 0 },
          { label: 'Objetos 3D', count: 0 },
          { label: 'Texturas', count: 0 }
        ].map((item, idx) => (
          <div key={idx} className={`card ${styles.kpiCard}`}>
            <div className={styles.kpiValue}>{item.count}</div>
            <div className={styles.kpiLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className={styles.archvizHeader}>
          <h3 className={styles.sectionTitle}>Biblioteca do Projeto</h3>
          <div className="flex gap-sm">
            <button className="btn btn-secondary">Importar da Biblioteca Global</button>
            <button className="btn btn-primary">
              <Plus size={16} style={{ marginRight: '8px' }} />
              Adicionar Item
            </button>
          </div>
        </div>

        <div className={styles.subTabNav} style={{ borderBottom: 'none', marginBottom: '16px' }}>
          {['Todos', 'Materiais', 'Objetos 3D', 'Texturas'].map((cat, idx) => (
            <button key={idx} className={idx === 0 ? styles.subTabActive : styles.subTab}>
              {cat}
            </button>
          ))}
        </div>

        <div className={styles.emptyState}>
          <Library size={48} className={styles.emptyStateIcon} />
          <h4>Biblioteca Vazia</h4>
          <p>Adicione materiais, objetos 3D e texturas específicos deste projeto.</p>
        </div>
      </div>
    </div>
  )
}

export default ProjetoBiblioteca
