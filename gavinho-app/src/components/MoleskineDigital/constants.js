// Cores disponíveis
export const STROKE_COLORS = [
  { id: 'black', name: 'Preto', color: '#000000' },
  { id: 'brown', name: 'Castanho', color: '#8B7355' },
  { id: 'blue', name: 'Azul', color: '#4338CA' },
  { id: 'orange', name: 'Laranja', color: '#D97706' },
  { id: 'green', name: 'Verde', color: '#16A34A' },
  { id: 'red', name: 'Vermelho', color: '#DC2626' },
]

// Ferramentas
export const TOOLS = {
  SELECT: 'select',
  PEN: 'pen',
  HIGHLIGHTER: 'highlighter',
  LINE: 'line',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  ARROW: 'arrow',
  TEXT: 'text',
  ERASER: 'eraser',
  PAN: 'pan',
  IMAGE: 'image',
  LINK: 'link',
}

export const STROKE_WIDTHS = [2, 4, 6, 8]

// Page templates
export const PAGE_TEMPLATES = [
  { id: 'blank', name: 'Em branco', icon: 'blank', pattern: null },
  { id: 'grid', name: 'Quadriculado', icon: 'grid', pattern: 'grid' },
  { id: 'lines', name: 'Linhas', icon: 'lines', pattern: 'lines' },
  { id: 'dots', name: 'Pontos', icon: 'dots', pattern: 'dots' },
  { id: 'cornell', name: 'Cornell', icon: 'cornell', pattern: 'cornell' },
]

// Canvas dimensions (horizontal/landscape)
export const CANVAS_WIDTH = 1600
export const CANVAS_HEIGHT = 1000
