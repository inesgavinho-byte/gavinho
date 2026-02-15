import SubTabNav from '../SubTabNav'
import AcompanhamentoFotos from '../../AcompanhamentoFotos'
import DesenhosObra from '../../DesenhosObra'
import FotoComparador from '../../FotoComparador'
import { Camera, Ruler, SplitSquareHorizontal } from 'lucide-react'

const acompSections = [
  { id: 'fotografias', label: 'Fotografias', icon: Camera },
  { id: 'comparador', label: 'Comparador', icon: SplitSquareHorizontal },
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

      {activeAcompSection === 'comparador' && (
        <FotoComparador projeto={project} />
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
