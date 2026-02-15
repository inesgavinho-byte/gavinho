// Cores disponiveis para desenho
export const DRAWING_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#000000', // black
]

// Categorias de anotacao
export const CATEGORIAS = [
  { id: 'geral', label: 'Geral', color: '#6B7280' },
  { id: 'erro', label: 'Erro', color: '#EF4444' },
  { id: 'duvida', label: 'Duvida', color: '#F59E0B' },
  { id: 'sugestao', label: 'Sugestao', color: '#3B82F6' },
  { id: 'cota_falta', label: 'Cota em falta', color: '#8B5CF6' },
  { id: 'material', label: 'Material', color: '#10B981' },
  { id: 'dimensao', label: 'Dimensao', color: '#EC4899' },
  { id: 'alinhamento', label: 'Alinhamento', color: '#06B6D4' },
  { id: 'especialidades', label: 'Especialidades', color: '#7C3AED' }
]

export const DRAWING_TOOLS = ['pencil', 'rectangle', 'arrow', 'circle', 'line']

export const ALL_TOOLS = [
  { id: 'select', label: 'Selecionar' },
  { id: 'comment', label: 'Comentario' },
  { id: 'pencil', label: 'Desenho livre' },
  { id: 'rectangle', label: 'Retangulo' },
  { id: 'arrow', label: 'Seta' },
  { id: 'circle', label: 'Circulo' },
  { id: 'line', label: 'Linha' },
  { id: 'eraser', label: 'Borracha' }
]

export const getCategoriaColor = (cat) => {
  return CATEGORIAS.find(c => c.id === cat)?.color || '#6B7280'
}

export const getStatusColor = (status) => {
  switch (status) {
    case 'aberto': return '#F59E0B'
    case 'em_discussao': return '#3B82F6'
    case 'resolvido': return '#10B981'
    default: return '#6B7280'
  }
}
