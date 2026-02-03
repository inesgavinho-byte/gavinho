// =====================================================
// WORKSPACE CONSTANTS
// Constantes extraídas do Workspace.jsx para melhor organização
// =====================================================

import {
  MessageSquare, FileText, Building2, FolderOpen, Grip, Users,
  FileImage, AtSign, Bookmark
} from 'lucide-react'

// Microsoft Graph API Configuration
export const MS_GRAPH_CONFIG = {
  clientId: import.meta.env.VITE_MS_CLIENT_ID || 'YOUR_CLIENT_ID',
  authority: 'https://login.microsoftonline.com/common',
  redirectUri: typeof window !== 'undefined' ? window.location.origin + '/oauth/callback' : '',
  scopes: ['User.Read', 'Team.ReadBasic.All', 'Channel.ReadBasic.All', 'ChannelMessage.Read.All', 'Files.Read.All']
}

// Status options for users
export const USER_STATUS_OPTIONS = [
  { id: 'available', label: 'Disponível', icon: 'CheckCircle2', color: '#22c55e' },
  { id: 'busy', label: 'Ocupado', icon: 'XCircle', color: '#ef4444' },
  { id: 'away', label: 'Ausente', icon: 'Clock', color: '#f59e0b' },
  { id: 'dnd', label: 'Não incomodar', icon: 'BellOff', color: '#ef4444' },
  { id: 'meeting', label: 'Em reunião', icon: 'Video', color: '#8b5cf6' },
  { id: 'lunch', label: 'Almoço', icon: 'Coffee', color: '#f97316' },
  { id: 'vacation', label: 'Férias', icon: 'Plane', color: '#06b6d4' },
  { id: 'wfh', label: 'A trabalhar de casa', icon: 'Home', color: '#10b981' }
]

// Message tags/labels
export const MESSAGE_TAGS = [
  { id: 'urgent', label: 'Urgente', color: '#ef4444' },
  { id: 'important', label: 'Importante', color: '#f59e0b' },
  { id: 'followup', label: 'Follow-up', color: '#8b5cf6' },
  { id: 'decision', label: 'Decisão', color: '#3b82f6' },
  { id: 'info', label: 'Informação', color: '#06b6d4' },
  { id: 'action', label: 'Ação necessária', color: '#ec4899' }
]

// Reminder options
export const REMINDER_OPTIONS = [
  { id: '30min', label: 'Em 30 minutos', minutes: 30 },
  { id: '1h', label: 'Em 1 hora', minutes: 60 },
  { id: '2h', label: 'Em 2 horas', minutes: 120 },
  { id: '4h', label: 'Em 4 horas', minutes: 240 },
  { id: 'tomorrow', label: 'Amanhã de manhã', minutes: 'tomorrow' },
  { id: 'nextweek', label: 'Próxima semana', minutes: 'nextweek' },
  { id: 'custom', label: 'Personalizado...', minutes: 'custom' }
]

// Estrutura de equipas GAVINHO (baseado no Teams)
export const EQUIPAS_GAVINHO = [
  { id: 'arch', nome: 'GAVINHO ARCH', cor: '#6366f1', inicial: 'A', descricao: 'Projetos de Arquitetura' },
  { id: 'hosp', nome: 'GAVINHO HOSP.', cor: '#f59e0b', inicial: 'H', descricao: 'Projetos de Hospitalidade' },
  { id: 'signature', nome: 'GAVINHO Signature', cor: '#10b981', inicial: 'GS', descricao: 'Projetos Premium' }
]

// Tópicos padrão para cada canal/projeto
export const DEFAULT_TOPICS = [
  { id: 'geral', nome: 'Geral', icon: 'MessageSquare', cor: '#6b7280' },
  { id: 'estudo-previo', nome: 'Estudo Prévio', icon: 'FileText', cor: '#8b5cf6' },
  { id: 'projeto-execucao', nome: 'Projeto de Execução', icon: 'Building2', cor: '#3b82f6' },
  { id: 'central-entregas', nome: 'Central de Entregas', icon: 'FolderOpen', cor: '#10b981' },
  { id: 'obra', nome: 'Acompanhamento Obra', icon: 'Grip', cor: '#f59e0b' },
  { id: 'cliente', nome: 'Cliente', icon: 'Users', cor: '#ec4899' }
]

// Reações disponíveis (estilo Teams)
export const REACTIONS = [
  { emoji: '👍', name: 'like' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '😄', name: 'laugh' },
  { emoji: '😮', name: 'surprised' },
  { emoji: '😢', name: 'sad' },
  { emoji: '🎉', name: 'celebrate' }
]

// Emojis organizados por categoria
export const EMOJI_CATEGORIES = [
  {
    name: 'Frequentes',
    emojis: ['👍', '❤️', '😄', '🎉', '👏', '🙏', '💪', '✅', '🔥', '⭐']
  },
  {
    name: 'Caras',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😮', '😲', '😳', '🥺', '😢', '😭', '😤', '😠', '🤯', '😱', '🥴', '😴']
  },
  {
    name: 'Gestos',
    emojis: ['👋', '🤚', '✋', '🖐️', '👌', '🤌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🤝', '🙏', '💪']
  },
  {
    name: 'Objetos',
    emojis: ['💼', '📁', '📂', '📄', '📝', '✏️', '📌', '📎', '🔗', '📧', '📨', '💻', '🖥️', '📱', '📷', '🎨', '🏠', '🏢', '🏗️', '🔨', '🔧', '📐', '📏', '🗓️', '⏰', '💡', '🔑', '🔒']
  },
  {
    name: 'Símbolos',
    emojis: ['✅', '❌', '⭕', '❗', '❓', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚪', '⚫', '▶️', '⏸️', '⏹️', '🔄', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '🔔', '🔕']
  },
  {
    name: 'Celebração',
    emojis: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎯', '🌟', '✨', '💫', '🔥', '💥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💖', '💗']
  }
]

// Filter options for messages
export const FILTER_OPTIONS = [
  { id: 'all', label: 'Todas', icon: MessageSquare },
  { id: 'attachments', label: 'Com anexos', icon: FileText },
  { id: 'images', label: 'Com imagens', icon: FileImage },
  { id: 'mentions', label: 'Menções', icon: AtSign },
  { id: 'saved', label: 'Guardadas', icon: Bookmark }
]

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'Enter'], description: 'Enviar mensagem' },
  { keys: ['Ctrl', 'K'], description: 'Pesquisar' },
  { keys: ['Ctrl', 'B'], description: 'Negrito' },
  { keys: ['Ctrl', 'I'], description: 'Itálico' },
  { keys: ['Ctrl', 'Shift', 'C'], description: 'Código' },
  { keys: ['Esc'], description: 'Fechar menus/modais' },
  { keys: ['?'], description: 'Atalhos de teclado' }
]

// Topic icon mapping
export const TOPIC_ICONS = {
  MessageSquare,
  FileText,
  Building2,
  FolderOpen,
  Grip,
  Users
}
