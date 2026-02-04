// =====================================================
// PROJECT CONSTANTS
// Constantes partilhadas para o módulo de projetos
// =====================================================

// Lista de compartimentos comuns para renders/archviz
export const COMPARTIMENTOS = [
  'Sala de Estar',
  'Sala de Jantar',
  'Cozinha',
  'Suite Principal',
  'Suite 1',
  'Suite 2',
  'Quarto 1',
  'Quarto 2',
  'Casa de Banho Social',
  'Casa de Banho Suite',
  'Hall de Entrada',
  'Varanda',
  'Terraço',
  'Jardim',
  'Piscina',
  'Escritório',
  'Closet',
  'Lavandaria',
  'Garagem',
  'Exterior - Fachada',
  'Exterior - Vista Geral',
  'Outro'
]

// Tipologias de projeto
export const TIPOLOGIAS = ['Residencial', 'Comercial', 'Hospitality', 'Misto']

// Subtipos por tipologia
export const SUBTIPOS = ['Moradia', 'Apartamento', 'Edifício', 'Loja', 'Escritório', 'Hotel', 'Restaurante']

// Fases do projeto
export const FASES = ['Proposta', 'Conceito', 'Projeto Base', 'Projeto Execução', 'Licenciamento', 'Concluído']

// Opções de status
export const STATUS_OPTIONS = [
  { value: 'on_track', label: 'No Prazo', color: '#10B981' },
  { value: 'at_risk', label: 'Em Risco', color: '#F59E0B' },
  { value: 'delayed', label: 'Atrasado', color: '#EF4444' },
  { value: 'on_hold', label: 'Em Espera', color: '#6B7280' },
  { value: 'completed', label: 'Concluído', color: '#3B82F6' }
]

// Cores por fase
export const FASE_COLORS = {
  'Proposta': '#9CA3AF',
  'Conceito': '#F59E0B',
  'Projeto Base': '#3B82F6',
  'Projeto Execução': '#8B5CF6',
  'Licenciamento': '#EC4899',
  'Concluído': '#10B981'
}

// Helper para obter cor do status
export const getStatusColor = (status) => {
  const option = STATUS_OPTIONS.find(s => s.value === status)
  return option?.color || '#6B7280'
}

// Helper para obter label do status
export const getStatusLabel = (status) => {
  const option = STATUS_OPTIONS.find(s => s.value === status)
  return option?.label || status
}

// Formatar moeda
export const formatCurrency = (value, currency = 'EUR') => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency
  }).format(value)
}

// Formatar data
export const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-PT')
}

// Tipos de intervenientes
export const TIPOS_INTERVENIENTES = [
  'Dono de Obra',
  'Cliente',
  'Representante Dono de Obra',
  'Autor Licenciamento Arquitectura',
  'Arquitectura Paisagista',
  'Especialidade Estruturas',
  'Especialidades',
  'Especialidade Acústica',
  'Especialidade Térmica',
  'Especialidade Segurança',
  'Outro'
]
