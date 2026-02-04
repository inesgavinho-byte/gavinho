import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  DecisoesList,
  DecisaoDetalhe,
  DecisaoForm,
  ValidacaoDecisoes
} from '../components/decisoes'

// Página de Lista de Decisões
function DecisoesPagina() {
  const { projetoId } = useParams()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [showValidacao, setShowValidacao] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9F9F7', fontFamily: 'Quattrocento Sans, sans-serif' }}>
      <DecisoesList
        key={refreshKey}
        projetoId={projetoId}
        onSelectDecisao={(d) => navigate(`/projetos/${projetoId}/decisoes/${d.id}`)}
        onNovaDecisao={() => setShowForm(true)}
        onOpenValidacao={() => setShowValidacao(true)}
      />

      {/* Modal Nova Decisão */}
      {showForm && (
        <DecisaoForm
          projetoId={projetoId}
          decisao={null}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); setRefreshKey(k => k + 1) }}
        />
      )}

      {/* Modal Validação */}
      {showValidacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <ValidacaoDecisoes
            projetoId={projetoId}
            onClose={() => setShowValidacao(false)}
            onUpdate={() => setRefreshKey(k => k + 1)}
          />
        </div>
      )}
    </div>
  )
}

// Página de Detalhe de Decisão
function DecisaoDetalhePagina() {
  const { projetoId, decisaoId } = useParams()
  const navigate = useNavigate()
  const [showEditForm, setShowEditForm] = useState(false)
  const [decisao, setDecisao] = useState(null)

  useEffect(() => {
    fetchDecisao()
  }, [decisaoId])

  const fetchDecisao = async () => {
    const { data } = await supabase
      .from('decisoes')
      .select('*')
      .eq('id', decisaoId)
      .single()
    setDecisao(data)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9F9F7', fontFamily: 'Quattrocento Sans, sans-serif' }}>
      <DecisaoDetalhe
        decisaoId={decisaoId}
        onBack={() => navigate(`/projetos/${projetoId}/decisoes`)}
        onEdit={(d) => { setDecisao(d); setShowEditForm(true) }}
      />

      {/* Modal Editar */}
      {showEditForm && decisao && (
        <DecisaoForm
          projetoId={projetoId}
          decisao={decisao}
          onClose={() => setShowEditForm(false)}
          onSave={() => { setShowEditForm(false); fetchDecisao() }}
        />
      )}
    </div>
  )
}

// Router Principal do Projecto
export default function ProjetoRoutes() {
  return (
    <Routes>
      {/* Decisões */}
      <Route path="/projetos/:projetoId/decisoes" element={<DecisoesPagina />} />
      <Route path="/projetos/:projetoId/decisoes/:decisaoId" element={<DecisaoDetalhePagina />} />

      {/* Adicionar outras rotas do projecto aqui */}
      {/* <Route path="/projetos/:projetoId/obras" element={<ObrasPagina />} /> */}
      {/* <Route path="/projetos/:projetoId/entregaveis" element={<EntregaveisPagina />} /> */}
    </Routes>
  )
}
