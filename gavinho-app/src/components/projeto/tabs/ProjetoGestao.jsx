import { useNavigate } from 'react-router-dom'
import SubTabNav from '../SubTabNav'
import ProjetoDecisoes from '../../decisoes/ProjetoDecisoes'
import ViabilidadeModule from '../../viabilidade/ViabilidadeModule'
import ProjetoFichaCliente from './ProjetoFichaCliente'
import DiarioBordo from '../../DiarioBordo'
import {
  ClipboardList, FileSearch, FileText, BookOpen,
  BarChart3, Euro, UserCircle, ExternalLink
} from 'lucide-react'

const gestaoSections = [
  { id: 'decisoes', label: 'Decisões', icon: ClipboardList },
  { id: 'viabilidade', label: 'Viabilidade', icon: FileSearch },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'diario-projeto', label: 'Diário de Projeto', icon: BookOpen },
  { id: 'painel-financeiro', label: 'Painel Financeiro', icon: BarChart3 },
  { id: 'faturacao', label: 'Faturação', icon: Euro },
  { id: 'ficha-cliente', label: 'Ficha de Cliente', icon: UserCircle }
]

export function ProjetoGestao({ project, setProject, activeGestaoSection, onSectionChange, projectId }) {
  const navigate = useNavigate()

  return (
    <div>
      <SubTabNav sections={gestaoSections} activeSection={activeGestaoSection} onSectionChange={onSectionChange} />

      {activeGestaoSection === 'decisoes' && (
        <ProjetoDecisoes projetoId={project?.id} />
      )}

      {activeGestaoSection === 'viabilidade' && (
        <ViabilidadeModule projetoId={project?.id} projeto={project} />
      )}

      {activeGestaoSection === 'contratos' && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Contratos & Documentos</h3>
          <p style={{ color: 'var(--brown-light)', margin: 0 }}>Propostas, contratos e documentação legal</p>
        </div>
      )}

      {activeGestaoSection === 'diario-projeto' && (
        <div className="card" style={{ padding: '20px' }}>
          <DiarioBordo projeto={project} />
        </div>
      )}

      {activeGestaoSection === 'painel-financeiro' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} style={{ color: 'var(--verde)' }} />
              <h3 style={{ margin: 0, color: 'var(--brown)', fontFamily: 'Cormorant Garamond, serif' }}>Painel Financeiro</h3>
            </div>
            <button
              onClick={() => navigate(`/financeiro/projeto/${projectId}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--verde)',
                background: 'transparent', color: 'var(--verde)', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: 600
              }}
            >
              <ExternalLink size={14} /> Abrir painel completo
            </button>
          </div>
          <p style={{ color: 'var(--brown-light)', margin: '0 0 12px', fontSize: '0.85rem' }}>
            Dashboard financeiro em tempo real com orçamento por capítulo, alertas, extras e projecções.
          </p>
          <button
            onClick={() => navigate(`/financeiro/projeto/${projectId}`)}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: 'var(--verde)', color: '#fff', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600
            }}
          >
            Ver Painel Financeiro
          </button>
        </div>
      )}

      {activeGestaoSection === 'faturacao' && (
        <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
          <Euro size={48} style={{ color: 'var(--brown-light)', opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--brown)' }}>Faturação</h3>
          <p style={{ color: 'var(--brown-light)', margin: 0 }}>Gestão de faturação e pagamentos</p>
        </div>
      )}

      {activeGestaoSection === 'ficha-cliente' && (
        <ProjetoFichaCliente project={project} setProject={setProject} />
      )}
    </div>
  )
}

export { gestaoSections }
export default ProjetoGestao
