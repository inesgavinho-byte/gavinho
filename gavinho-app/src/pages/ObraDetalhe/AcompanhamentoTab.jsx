import ResumoSubtab from './acompanhamento/ResumoSubtab'
import DiarioSubtab from './acompanhamento/DiarioSubtab'
import FotografiasSubtab from './acompanhamento/FotografiasSubtab'
import NCSubtab from './acompanhamento/NCSubtab'
import DocumentosSubtab from './acompanhamento/DocumentosSubtab'

export default function AcompanhamentoTab({ obra, obraId, activeSubtab, currentUser }) {
  // obraId é SEMPRE UUID (vem de useObraId no index.jsx)
  const props = { obraUuid: obraId, obra, currentUser }

  switch (activeSubtab) {
    case 'resumo':
      return <ResumoSubtab {...props} />
    case 'diario':
      return <DiarioSubtab {...props} />
    case 'fotografias':
      return <FotografiasSubtab {...props} />
    case 'nao-conformidades':
      return <NCSubtab {...props} />
    case 'documentos':
      return <DocumentosSubtab {...props} />
    default:
      return <ResumoSubtab {...props} />
  }
}
