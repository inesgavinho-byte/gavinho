// =====================================================
// COLORS CONSTANTS
// Cores centralizadas para toda a aplicacao
// =====================================================

// Cores da marca Gavinho
export const BRAND = {
  gold: '#C9A882',
  goldDark: '#B8956E',
  goldLight: '#D4BC9E',
  charcoal: '#2D2D2D',
  stone: '#C3BAAF',
  cream: '#FAF8F5'
}

// Cores semanticas
export const SEMANTIC = {
  success: '#10B981',
  successDark: '#059669',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorDark: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoDark: '#2563EB',
  infoLight: '#DBEAFE'
}

// Cores de status de projeto
export const PROJECT_STATUS = {
  on_track: { color: '#10B981', bg: '#D1FAE5', label: 'No Prazo' },
  at_risk: { color: '#F59E0B', bg: '#FEF3C7', label: 'Em Risco' },
  delayed: { color: '#EF4444', bg: '#FEE2E2', label: 'Atrasado' },
  on_hold: { color: '#6B7280', bg: '#F3F4F6', label: 'Em Espera' },
  completed: { color: '#3B82F6', bg: '#DBEAFE', label: 'Concluido' }
}

// Cores de fases de projeto
export const PROJECT_PHASES = {
  'Proposta': { color: '#9CA3AF', bg: '#F3F4F6' },
  'Conceito': { color: '#F59E0B', bg: '#FEF3C7' },
  'Projeto Base': { color: '#3B82F6', bg: '#DBEAFE' },
  'Projeto Execução': { color: '#8B5CF6', bg: '#EDE9FE' },
  'Licenciamento': { color: '#EC4899', bg: '#FCE7F3' },
  'Concluído': { color: '#10B981', bg: '#D1FAE5' }
}

// Cores de prioridade
export const PRIORITY = {
  high: { color: '#EF4444', bg: '#FEE2E2', label: 'Alta' },
  medium: { color: '#F59E0B', bg: '#FEF3C7', label: 'Media' },
  low: { color: '#10B981', bg: '#D1FAE5', label: 'Baixa' }
}

// Cores de estado de pagamento
export const PAYMENT_STATUS = {
  pendente: { color: '#F59E0B', bg: '#FEF3C7', label: 'Pendente' },
  pago: { color: '#10B981', bg: '#D1FAE5', label: 'Pago' },
  atrasado: { color: '#EF4444', bg: '#FEE2E2', label: 'Atrasado' },
  cancelado: { color: '#6B7280', bg: '#F3F4F6', label: 'Cancelado' }
}

// Cores de texto
export const TEXT = {
  primary: '#1F2937',
  secondary: '#6B7280',
  tertiary: '#9CA3AF',
  inverse: '#FFFFFF',
  link: '#3B82F6',
  linkHover: '#2563EB'
}

// Cores de background
export const BACKGROUND = {
  page: '#F9FAFB',
  card: '#FFFFFF',
  cardHover: '#F3F4F6',
  input: '#FFFFFF',
  inputDisabled: '#F3F4F6',
  overlay: 'rgba(0, 0, 0, 0.5)'
}

// Cores de borda
export const BORDER = {
  default: '#E5E7EB',
  focus: '#C9A882',
  error: '#EF4444',
  success: '#10B981'
}

// Cores para graficos
export const CHART = [
  '#C9A882', // Gold
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#EF4444', // Red
  '#84CC16'  // Lime
]

// Helpers
export const getStatusColor = (status) => PROJECT_STATUS[status]?.color || TEXT.secondary
export const getStatusBg = (status) => PROJECT_STATUS[status]?.bg || BACKGROUND.cardHover
export const getStatusLabel = (status) => PROJECT_STATUS[status]?.label || status

export const getPhaseColor = (phase) => PROJECT_PHASES[phase]?.color || TEXT.secondary
export const getPhaseBg = (phase) => PROJECT_PHASES[phase]?.bg || BACKGROUND.cardHover

export const getPriorityColor = (priority) => PRIORITY[priority]?.color || TEXT.secondary
export const getPriorityBg = (priority) => PRIORITY[priority]?.bg || BACKGROUND.cardHover
export const getPriorityLabel = (priority) => PRIORITY[priority]?.label || priority

export const getPaymentStatusColor = (status) => PAYMENT_STATUS[status]?.color || TEXT.secondary
export const getPaymentStatusBg = (status) => PAYMENT_STATUS[status]?.bg || BACKGROUND.cardHover
export const getPaymentStatusLabel = (status) => PAYMENT_STATUS[status]?.label || status

// Export all as default
export default {
  BRAND,
  SEMANTIC,
  PROJECT_STATUS,
  PROJECT_PHASES,
  PRIORITY,
  PAYMENT_STATUS,
  TEXT,
  BACKGROUND,
  BORDER,
  CHART,
  getStatusColor,
  getStatusBg,
  getStatusLabel,
  getPhaseColor,
  getPhaseBg,
  getPriorityColor,
  getPriorityBg,
  getPriorityLabel,
  getPaymentStatusColor,
  getPaymentStatusBg,
  getPaymentStatusLabel
}
