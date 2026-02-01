// =====================================================
// DASHBOARD TAB
// Componente principal que agrupa todos os cards do dashboard
// =====================================================

import ClienteCard from './ClienteCard'
import LocalizacaoCard from './LocalizacaoCard'
import ServicosCard from './ServicosCard'
import EquipaCard from './EquipaCard'
import IntervenientesCard from './IntervenientesCard'

export default function DashboardTab({
  project,
  equipaProjeto,
  intervenientes,
  onAddInterveniente,
  onEditInterveniente,
  onRemoveInterveniente
}) {
  return (
    <div className="grid grid-2" style={{ gap: '24px' }}>
      {/* Cliente */}
      <ClienteCard cliente={project.cliente} />

      {/* Localização */}
      <LocalizacaoCard project={project} />

      {/* Serviços Contratados */}
      <ServicosCard servicos={project.servicos} />

      {/* Equipa */}
      <EquipaCard equipaProjeto={equipaProjeto} />

      {/* Intervenientes */}
      <IntervenientesCard
        intervenientes={intervenientes}
        onAdd={onAddInterveniente}
        onEdit={onEditInterveniente}
        onRemove={onRemoveInterveniente}
      />
    </div>
  )
}
