import {
  FileText, Calculator, Receipt, ShoppingCart,
  TrendingUp, ClipboardList, Users,
  AlertTriangle, Camera, BookOpen, Download,
  Shield, Truck, Grid3X3, BarChart3, MessageSquare
} from 'lucide-react'

// ============================================
// CONFIGURAÇÃO DAS TABS PRINCIPAIS
// ============================================
export const mainTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'tracking', label: 'Tracking', icon: ClipboardList, hasSubtabs: true },
  { id: 'acompanhamento', label: 'Acompanhamento', icon: Camera, hasSubtabs: true },
  { id: 'fiscalizacao', label: 'Fiscalização', icon: Shield, hasSubtabs: true },
  { id: 'equipas', label: 'Equipas', icon: Users, hasSubtabs: true },
  { id: 'projeto', label: 'Projeto', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
]

// Sub-tabs do Tracking (MQT → Orçamento → POPs → Compras → Execução → Autos)
export const trackingSubtabs = [
  { id: 'mqt', label: 'MQT', icon: ClipboardList },
  { id: 'orcamento', label: 'Orçamento', icon: Calculator },
  { id: 'pops', label: 'POPs', icon: FileText },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'execucao', label: 'Execução', icon: TrendingUp },
  { id: 'autos', label: 'Autos', icon: Receipt },
]

// Sub-tabs de Acompanhamento
export const acompanhamentoSubtabs = [
  { id: 'resumo', label: 'Resumo', icon: BarChart3 },
  { id: 'diario', label: 'Diário', icon: BookOpen },
  { id: 'fotografias', label: 'Fotografias', icon: Camera },
  { id: 'nao-conformidades', label: 'Não Conformidades', icon: AlertTriangle },
  { id: 'documentos', label: 'Documentos', icon: Download },
]

// Sub-tabs de Fiscalização
export const fiscalizacaoSubtabs = [
  { id: 'hso', label: 'HSO', icon: Shield },
  { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
]

// Sub-tabs de Equipas
export const equipasSubtabs = [
  { id: 'equipa', label: 'Equipa Gavinho', icon: Users },
  { id: 'subempreiteiros', label: 'SubEmpreiteiros', icon: Truck },
  { id: 'zonas', label: 'Zonas', icon: Grid3X3 },
]

// Unidades disponíveis
export const unidades = ['m²', 'm³', 'ml', 'un', 'vg', 'kg', 'ton', 'dia', 'hora', 'conj', 'pç']

// Estados do POP
export const popEstados = [
  { value: 'rascunho', label: 'Rascunho', color: '#6B7280' },
  { value: 'enviada', label: 'Enviada', color: '#F59E0B' },
  { value: 'contratada', label: 'Contratada', color: '#10B981' },
  { value: 'recusada', label: 'Recusada', color: '#EF4444' },
]

// Cores do design
export const colors = {
  primary: '#5C4B3A',
  text: '#3D3326',
  textMuted: '#8B7355',
  background: '#F5F3EF',
  white: '#FFFFFF',
  border: '#E8E4DC',
  success: '#6B8F5E',
  warning: '#F5A623',
  error: '#DC2626',
  progressBg: '#E8E4DC',
}
