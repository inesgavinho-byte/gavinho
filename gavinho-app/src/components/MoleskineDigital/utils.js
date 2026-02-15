import { getStroke } from 'perfect-freehand'

// Opções do perfect-freehand
export const getPenOptions = (size) => ({
  size,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
})

export const getHighlighterOptions = (size) => ({
  size: size * 4,
  thinning: 0,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: false,
})

// Converter pontos para path SVG
export function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return ''
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )
  d.push('Z')
  return d.join(' ')
}

// Gerar ID único
export function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

// Página em branco default
export const createBlankPage = (template = 'blank') => ({
  id: generateId(),
  elements: [],
  background: '#FFFFFF',
  template: template,
  createdAt: new Date().toISOString()
})

// Get freehand stroke from element
export function getElementStroke(el) {
  const options = el.type === 'pen' ? getPenOptions(el.width) : getHighlighterOptions(el.width)
  return getStroke(el.points, options)
}
