import SubTabNav from '../SubTabNav'
import ProjetoInspiracoes from '../../ProjetoInspiracoes'
import ProjetoMoodboards from '../../ProjetoMoodboards'
import ProjetoLevantamento from '../../ProjetoLevantamento'
import { Camera, Lightbulb, Palette } from 'lucide-react'

const briefingSections = [
  { id: 'inspiracoes', label: 'Inspirações & Referências', icon: Palette },
  { id: 'moodboards', label: 'Moodboards', icon: Lightbulb },
  { id: 'levantamento', label: 'Levantamento Fotografico', icon: Camera }
]

export function ProjetoBriefing({ project, user, activeBriefingSection, onSectionChange, projetoCompartimentos }) {
  return (
    <div>
      <SubTabNav sections={briefingSections} activeSection={activeBriefingSection} onSectionChange={onSectionChange} />

      {activeBriefingSection === 'inspiracoes' && (
        <div className="card">
          <ProjetoInspiracoes
            projeto={project}
            userId={user?.id}
            userName={user?.nome || user?.email}
            compartimentosProjeto={projetoCompartimentos}
          />
        </div>
      )}

      {activeBriefingSection === 'moodboards' && (
        <ProjetoMoodboards
          projeto={project}
          userId={user?.id}
          userName={user?.email?.split('@')[0] || 'Utilizador'}
        />
      )}

      {activeBriefingSection === 'levantamento' && (
        <ProjetoLevantamento
          projeto={project}
          userId={user?.id}
          userName={user?.email?.split('@')[0] || 'Utilizador'}
        />
      )}
    </div>
  )
}

export { briefingSections }
export default ProjetoBriefing
