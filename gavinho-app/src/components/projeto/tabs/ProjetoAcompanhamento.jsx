import SubTabNav from '../SubTabNav'
import AcompanhamentoFotos from '../../AcompanhamentoFotos'
import DesenhosObra from '../../DesenhosObra'
import { Camera, Ruler } from 'lucide-react'

const acompSections = [
  { id: 'fotografias', label: 'Fotografias', icon: Camera },
  { id: 'desenhos-obra', label: 'Desenhos em Uso Obra', icon: Ruler }
]

export function ProjetoAcompanhamento({ project, user, activeAcompSection, onSectionChange }) {
  return (
    <div>
      <SubTabNav sections={acompSections} activeSection={activeAcompSection} onSectionChange={onSectionChange} />

      {activeAcompSection === 'fotografias' && (
        <AcompanhamentoFotos
          projeto={project}
          userId={user?.id}
          userName={user?.email?.split('@')[0] || 'Utilizador'}
        />
      )}

      {activeAcompSection === 'desenhos-obra' && (
        <DesenhosObra
          projeto={project}
          userId={user?.id}
          userName={user?.email?.split('@')[0] || 'Utilizador'}
        />
      )}
    </div>
  )
}

export { acompSections }
export default ProjetoAcompanhamento
