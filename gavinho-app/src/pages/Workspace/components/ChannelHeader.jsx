// =====================================================
// CHANNEL HEADER COMPONENT
// Header bar showing current channel info and action buttons
// Includes tabs, filters, topics bar, and pinned messages bar
// =====================================================

import { useState } from 'react'
import {
  MessageSquare, FileText, StickyNote, CheckSquare,
  Check, Link2, Video, Phone, MessageCircle, Sparkles,
  BarChart3, FileDown, CalendarPlus, Settings, Plus, X,
  SlidersHorizontal, User, CalendarDays, Paperclip, AtSign, Pin, Clock, Mail, Edit
} from 'lucide-react'

import { FILTER_OPTIONS } from '../utils/constants'

export default function ChannelHeader({
  // Channel data
  canalAtivo,
  equipas = [],
  membros = [],
  posts = [],
  filteredPosts = [],

  // Copy link
  linkCopied,
  onCopyLink,

  // Panels
  showDMPanel,
  onToggleDMPanel,
  showAIAssistant,
  onToggleAIAssistant,

  // Actions
  onLoadAnalytics,
  onShowExportModal,
  onScheduleMeeting,
  onScheduleMessage,
  onEmailSettings,
  onStartCall,

  // Tabs
  activeTab,
  setActiveTab,

  // Filters
  activeFilter,
  setActiveFilter,
  showAdvancedSearch,
  setShowAdvancedSearch,
  onResetFilters,
  searchQuery,
  searchFilters,
  setSearchFilters,

  // Topics
  activeTopic,
  setActiveTopic,
  getCurrentChannelTopics,
  getTopicIcon,
  showAddTopic,
  setShowAddTopic,
  newTopicName,
  setNewTopicName,
  onAddCustomTopic,
  onRemoveCustomTopic,
  onRenameCustomTopic,

  // Pinned messages
  showPinnedMessages,
  setShowPinnedMessages,
  getCurrentChannelPinnedMessages
}) {
  // State for topic editing
  const [editingTopicId, setEditingTopicId] = useState(null)
  const [editingTopicName, setEditingTopicName] = useState('')

  if (!canalAtivo) return null

  const equipa = equipas.find(e => e.id === canalAtivo.equipa)
  const pinnedMessages = getCurrentChannelPinnedMessages?.() || []

  // Handle topic rename
  const handleStartEditTopic = (topic) => {
    setEditingTopicId(topic.id)
    setEditingTopicName(topic.nome)
  }

  const handleSaveEditTopic = () => {
    if (editingTopicId && editingTopicName.trim()) {
      onRenameCustomTopic?.(editingTopicId, editingTopicName.trim())
    }
    setEditingTopicId(null)
    setEditingTopicName('')
  }

  const handleCancelEditTopic = () => {
    setEditingTopicId(null)
    setEditingTopicName('')
  }

  return (
    <>
      {/* Header do canal */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--stone)',
        background: 'var(--white)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: equipa?.cor || 'var(--accent-olive)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 700
          }}>
            {equipa?.inicial || 'G'}
          </div>
          <div>
            <h2 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--brown)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {canalAtivo.codigo}
              <span style={{ fontWeight: 400, color: 'var(--brown-light)' }}>
                {canalAtivo.nome}
              </span>
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--brown-light)', marginTop: '2px' }}>
              {membros.length} membros • {posts.length} mensagens
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* Copy Link Button */}
          <button
            onClick={onCopyLink}
            title={linkCopied ? 'Link copiado!' : 'Copiar link do canal'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: linkCopied ? 'var(--success)' : 'var(--cream)',
              border: linkCopied ? '1px solid var(--success)' : '1px solid var(--stone)',
              cursor: 'pointer',
              color: linkCopied ? 'white' : 'var(--brown)',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {linkCopied ? <Check size={14} /> : <Link2 size={14} />}
            {linkCopied ? 'Copiado!' : 'Copiar Link'}
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--stone)', margin: '0 8px' }} />

          {/* Video Call */}
          <button
            onClick={() => onStartCall?.('video', membros.slice(0, 3))}
            title="Iniciar reuniao"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Video size={18} />
          </button>

          {/* Voice Call */}
          <button
            onClick={() => onStartCall?.('audio', membros.slice(0, 3))}
            title="Chamada de voz"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Phone size={18} />
          </button>

          {/* DM */}
          <button
            onClick={onToggleDMPanel}
            title="Mensagens diretas"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: showDMPanel ? 'var(--stone)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <MessageCircle size={18} />
          </button>

          {/* AI Assistant */}
          <button
            onClick={onToggleAIAssistant}
            title="Assistente IA"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: showAIAssistant ? 'var(--stone)' : 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Sparkles size={18} />
          </button>

          {/* Analytics */}
          <button
            onClick={onLoadAnalytics}
            title="Analytics"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <BarChart3 size={18} />
          </button>

          {/* Export */}
          <button
            onClick={onShowExportModal}
            title="Exportar conversa"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <FileDown size={18} />
          </button>

          {/* Schedule Message */}
          <button
            onClick={onScheduleMessage}
            title="Agendar mensagem"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Clock size={18} />
          </button>

          {/* Email Settings */}
          <button
            onClick={onEmailSettings}
            title="Definições de email"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Mail size={18} />
          </button>

          {/* Schedule Meeting */}
          <button
            onClick={() => onScheduleMeeting?.()}
            title="Agendar reuniao"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CalendarPlus size={18} />
          </button>

          {/* Settings */}
          <button
            title="Definicoes"
            style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brown-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderBottom: '1px solid var(--stone)',
        padding: '0 24px',
        background: 'var(--white)',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex' }}>
          {[
            { id: 'publicacoes', label: 'Publicacoes', icon: MessageSquare },
            { id: 'ficheiros', label: 'Ficheiros', icon: FileText },
            { id: 'wiki', label: 'Wiki', icon: StickyNote },
            { id: 'tarefas', label: 'Tarefas', icon: CheckSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-olive)' : '2px solid transparent',
                cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--brown)' : 'var(--brown-light)',
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: '13px',
                marginBottom: '-1px',
                transition: 'color 0.15s'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        {activeTab === 'publicacoes' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingRight: '8px' }}>
            {/* Quick filters */}
            <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
              {FILTER_OPTIONS.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  title={filter.label}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: activeFilter === filter.id ? 'var(--accent-olive)' : 'var(--cream)',
                    border: activeFilter === filter.id ? 'none' : '1px solid var(--stone)',
                    cursor: 'pointer',
                    color: activeFilter === filter.id ? 'white' : 'var(--brown-light)',
                    fontSize: '11px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                >
                  <filter.icon size={12} />
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Advanced search toggle */}
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              title="Pesquisa avancada"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                background: showAdvancedSearch ? 'var(--brown)' : 'transparent',
                border: '1px solid var(--stone)',
                cursor: 'pointer',
                color: showAdvancedSearch ? 'white' : 'var(--brown-light)',
                fontSize: '11px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <SlidersHorizontal size={12} />
              Avancada
            </button>

            {/* Reset filters */}
            {(activeFilter !== 'all' || searchQuery || showAdvancedSearch) && (
              <button
                onClick={onResetFilters}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'var(--error)',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <X size={12} />
                Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Topics Bar */}
      {activeTab === 'publicacoes' && getCurrentChannelTopics && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 24px',
          background: 'var(--off-white)',
          borderBottom: '1px solid var(--stone)',
          overflowX: 'auto'
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginRight: '4px' }}>
            Topicos:
          </span>
          {getCurrentChannelTopics().map(topic => {
            const IconComponent = getTopicIcon(topic.icon)
            const isActive = activeTopic === topic.id
            const isEditing = editingTopicId === topic.id

            // Render editing input
            if (isEditing) {
              return (
                <div key={topic.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="text"
                    value={editingTopicName}
                    onChange={(e) => setEditingTopicName(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid var(--accent-olive)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      width: '120px',
                      outline: 'none'
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEditTopic()
                      if (e.key === 'Escape') handleCancelEditTopic()
                    }}
                  />
                  <button
                    onClick={handleSaveEditTopic}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--accent-olive)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={handleCancelEditTopic}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--stone)',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--brown-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            }

            return (
              <div
                key={topic.id}
                style={{ position: 'relative', display: 'inline-flex' }}
                className="topic-item"
              >
                <button
                  onClick={() => setActiveTopic(topic.id)}
                  onDoubleClick={() => topic.custom && handleStartEditTopic(topic)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    background: isActive ? topic.cor : 'var(--white)',
                    border: isActive ? 'none' : '1px solid var(--stone)',
                    cursor: 'pointer',
                    color: isActive ? 'white' : 'var(--brown)',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 400,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                  title={topic.custom ? 'Duplo-clique para editar' : undefined}
                >
                  <IconComponent size={14} />
                  {topic.nome}
                  {topic.custom && isActive && (
                    <>
                      <Edit
                        size={12}
                        style={{ marginLeft: '2px', cursor: 'pointer', opacity: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEditTopic(topic)
                        }}
                      />
                      <X
                        size={12}
                        style={{ cursor: 'pointer', opacity: 0.8 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveCustomTopic?.(topic.id)
                        }}
                      />
                    </>
                  )}
                </button>
              </div>
            )
          })}

          {/* Add Topic Button */}
          {!showAddTopic ? (
            <button
              onClick={() => setShowAddTopic(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '16px',
                background: 'transparent',
                border: '1px dashed var(--stone)',
                cursor: 'pointer',
                color: 'var(--brown-light)',
                fontSize: '12px'
              }}
            >
              <Plus size={14} />
              Topico
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Nome do topico..."
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--accent-olive)',
                  borderRadius: '16px',
                  fontSize: '12px',
                  width: '120px',
                  outline: 'none'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAddCustomTopic?.()
                  if (e.key === 'Escape') setShowAddTopic(false)
                }}
              />
              <button
                onClick={onAddCustomTopic}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-olive)',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => setShowAddTopic(false)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--stone)',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Advanced Search Panel */}
      {showAdvancedSearch && activeTab === 'publicacoes' && (
        <div style={{
          padding: '16px 24px',
          background: 'var(--cream)',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-end',
          flexWrap: 'wrap'
        }}>
          {/* Author search */}
          <div style={{ minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
              <User size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Autor
            </label>
            <input
              type="text"
              placeholder="Nome do autor..."
              value={searchFilters.author}
              onChange={e => setSearchFilters(prev => ({ ...prev, author: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--stone)',
                borderRadius: '6px',
                fontSize: '12px',
                background: 'var(--white)',
                outline: 'none'
              }}
            />
          </div>

          {/* Date from */}
          <div style={{ minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
              <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              De
            </label>
            <input
              type="date"
              value={searchFilters.dateFrom}
              onChange={e => setSearchFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--stone)',
                borderRadius: '6px',
                fontSize: '12px',
                background: 'var(--white)',
                outline: 'none'
              }}
            />
          </div>

          {/* Date to */}
          <div style={{ minWidth: '140px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--brown-light)', marginBottom: '6px' }}>
              <CalendarDays size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Ate
            </label>
            <input
              type="date"
              value={searchFilters.dateTo}
              onChange={e => setSearchFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--stone)',
                borderRadius: '6px',
                fontSize: '12px',
                background: 'var(--white)',
                outline: 'none'
              }}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brown)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={searchFilters.hasAttachments}
                onChange={e => setSearchFilters(prev => ({ ...prev, hasAttachments: e.target.checked }))}
                style={{ accentColor: 'var(--accent-olive)' }}
              />
              <Paperclip size={14} />
              Com anexos
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brown)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={searchFilters.hasMentions}
                onChange={e => setSearchFilters(prev => ({ ...prev, hasMentions: e.target.checked }))}
                style={{ accentColor: 'var(--accent-olive)' }}
              />
              <AtSign size={14} />
              Com mencoes
            </label>
          </div>

          {/* Results count */}
          <div style={{
            marginLeft: 'auto',
            fontSize: '12px',
            color: 'var(--brown-light)',
            background: 'var(--white)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontWeight: 500
          }}>
            {filteredPosts.length} {filteredPosts.length === 1 ? 'resultado' : 'resultados'}
          </div>
        </div>
      )}

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <div style={{
          padding: '10px 24px',
          background: 'rgba(201, 168, 130, 0.1)',
          borderBottom: '1px solid var(--stone)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Pin size={16} style={{ color: 'var(--warning)' }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--brown)' }}>
            {pinnedMessages.length} mensagem(ns) fixada(s)
          </span>
          <button
            onClick={() => setShowPinnedMessages(!showPinnedMessages)}
            style={{
              marginLeft: 'auto',
              padding: '4px 12px',
              borderRadius: '4px',
              background: showPinnedMessages ? 'var(--accent-olive)' : 'var(--white)',
              border: '1px solid var(--stone)',
              cursor: 'pointer',
              color: showPinnedMessages ? 'white' : 'var(--brown)',
              fontSize: '12px'
            }}
          >
            {showPinnedMessages ? 'Ocultar' : 'Ver todas'}
          </button>
        </div>
      )}
    </>
  )
}
