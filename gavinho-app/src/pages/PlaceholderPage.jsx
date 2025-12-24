import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="card">
        <div className="empty-state">
          <Construction size={48} />
          <h3>Em Desenvolvimento</h3>
          <p>Este módulo está a ser desenvolvido e estará disponível em breve.</p>
        </div>
      </div>
    </div>
  )
}
