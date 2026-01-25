import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  DecisoesList,
  DecisaoDetalhe,
  DecisaoForm,
  ValidacaoDecisoes
} from '../components/decisoes'

export default function DecisoesPagina({ projetoId: propProjetoId }) {
  const { id } = useParams()
  const projetoId = propProjetoId || id
  // Estado da navegação
  const [view, setView] = useState('list') // 'list' | 'detail' | 'form' | 'validar'
  const [selectedDecisao, setSelectedDecisao] = useState(null)
  const [editingDecisao, setEditingDecisao] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Handlers de navegação
  const handleSelectDecisao = (decisao) => {
    setSelectedDecisao(decisao)
    setView('detail')
  }

  const handleNovaDecisao = () => {
    setEditingDecisao(null)
    setView('form')
  }

  const handleEditDecisao = (decisao) => {
    setEditingDecisao(decisao)
    setView('form')
  }

  const handleBackToList = () => {
    setSelectedDecisao(null)
    setEditingDecisao(null)
    setView('list')
  }

  const handleCloseForm = () => {
    setEditingDecisao(null)
    setView(selectedDecisao ? 'detail' : 'list')
  }

  const handleSaveSuccess = () => {
    setRefreshKey(k => k + 1) // Força refresh da lista
    setEditingDecisao(null)
    setView('list')
  }

  const handleOpenValidacao = () => {
    setView('validar')
  }

  const handleCloseValidacao = () => {
    setView('list')
  }

  const handleValidacaoUpdate = () => {
    setRefreshKey(k => k + 1) // Força refresh da lista
  }

  // Render baseado no estado
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F9F9F7',
      fontFamily: 'Quattrocento Sans, sans-serif'
    }}>
      {/* Lista de Decisões */}
      {view === 'list' && (
        <DecisoesList
          key={refreshKey}
          projetoId={projetoId}
          onSelectDecisao={handleSelectDecisao}
          onNovaDecisao={handleNovaDecisao}
          onOpenValidacao={handleOpenValidacao}
        />
      )}

      {/* Detalhe da Decisão */}
      {view === 'detail' && selectedDecisao && (
        <DecisaoDetalhe
          decisaoId={selectedDecisao.id}
          onBack={handleBackToList}
          onEdit={handleEditDecisao}
        />
      )}

      {/* Formulário (Modal) */}
      {view === 'form' && (
        <DecisaoForm
          projetoId={projetoId}
          decisao={editingDecisao}
          onClose={handleCloseForm}
          onSave={handleSaveSuccess}
        />
      )}

      {/* Validação (Modal) */}
      {view === 'validar' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <ValidacaoDecisoes
            projetoId={projetoId}
            onClose={handleCloseValidacao}
            onUpdate={handleValidacaoUpdate}
          />
        </div>
      )}
    </div>
  )
}
