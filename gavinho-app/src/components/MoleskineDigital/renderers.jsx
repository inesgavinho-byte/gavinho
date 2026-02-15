import { getStroke } from 'perfect-freehand'
import { TOOLS, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants'
import { getPenOptions, getHighlighterOptions, getSvgPathFromStroke } from './utils'

// Render element as SVG JSX
export function renderElement(el) {
  const key = el.id

  if (el.type === TOOLS.PEN) {
    const stroke = getStroke(el.points, getPenOptions(el.width))
    return (
      <path
        key={key}
        d={getSvgPathFromStroke(stroke)}
        fill={el.color}
      />
    )
  }

  if (el.type === TOOLS.HIGHLIGHTER) {
    const stroke = getStroke(el.points, getHighlighterOptions(el.width))
    return (
      <path
        key={key}
        d={getSvgPathFromStroke(stroke)}
        fill={el.color}
        opacity={0.3}
      />
    )
  }

  if (el.type === TOOLS.LINE) {
    return (
      <line
        key={key}
        x1={el.x1}
        y1={el.y1}
        x2={el.x2}
        y2={el.y2}
        stroke={el.color}
        strokeWidth={el.width}
        strokeLinecap="round"
      />
    )
  }

  if (el.type === TOOLS.RECTANGLE) {
    return (
      <rect
        key={key}
        x={Math.min(el.x1, el.x2)}
        y={Math.min(el.y1, el.y2)}
        width={Math.abs(el.x2 - el.x1)}
        height={Math.abs(el.y2 - el.y1)}
        fill="none"
        stroke={el.color}
        strokeWidth={el.width}
      />
    )
  }

  if (el.type === TOOLS.CIRCLE) {
    return (
      <ellipse
        key={key}
        cx={(el.x1 + el.x2) / 2}
        cy={(el.y1 + el.y2) / 2}
        rx={Math.abs(el.x2 - el.x1) / 2}
        ry={Math.abs(el.y2 - el.y1) / 2}
        fill="none"
        stroke={el.color}
        strokeWidth={el.width}
      />
    )
  }

  if (el.type === TOOLS.ARROW) {
    const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
    const headLength = 15
    return (
      <g key={key}>
        <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2}
          stroke={el.color} strokeWidth={el.width} strokeLinecap="round" />
        <line x1={el.x2} y1={el.y2}
          x2={el.x2 - headLength * Math.cos(angle - Math.PI / 6)}
          y2={el.y2 - headLength * Math.sin(angle - Math.PI / 6)}
          stroke={el.color} strokeWidth={el.width} strokeLinecap="round" />
        <line x1={el.x2} y1={el.y2}
          x2={el.x2 - headLength * Math.cos(angle + Math.PI / 6)}
          y2={el.y2 - headLength * Math.sin(angle + Math.PI / 6)}
          stroke={el.color} strokeWidth={el.width} strokeLinecap="round" />
      </g>
    )
  }

  if (el.type === TOOLS.TEXT) {
    return (
      <text key={key} x={el.x} y={el.y} fill={el.color}
        fontSize={el.fontSize} fontFamily="'Quattrocento Sans', sans-serif">
        {el.text}
      </text>
    )
  }

  if (el.type === TOOLS.LINK) {
    return (
      <a key={key} href={el.url} target="_blank" rel="noopener noreferrer">
        <text x={el.x} y={el.y} fill="#4338CA" fontSize={16}
          fontFamily="'Quattrocento Sans', sans-serif"
          textDecoration="underline" style={{ cursor: 'pointer' }}>
          {el.label}
        </text>
      </a>
    )
  }

  if (el.type === 'image') {
    return (
      <image key={key} href={el.url} x={el.x} y={el.y}
        width={el.width} height={el.height}
        preserveAspectRatio="xMidYMid meet" />
    )
  }

  return null
}

// Draw template pattern to canvas context (for PDF export)
export const drawTemplatePattern = (ctx, template) => {
  ctx.strokeStyle = '#E5E5E5'
  ctx.lineWidth = 1

  if (template === 'grid') {
    const gridSize = 40
    ctx.beginPath()
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
    }
    ctx.stroke()
  } else if (template === 'lines') {
    const lineSpacing = 32
    ctx.beginPath()
    for (let y = lineSpacing; y < CANVAS_HEIGHT; y += lineSpacing) {
      ctx.moveTo(60, y)
      ctx.lineTo(CANVAS_WIDTH - 60, y)
    }
    ctx.stroke()
  } else if (template === 'dots') {
    const dotSpacing = 30
    ctx.fillStyle = '#D0D0D0'
    for (let x = dotSpacing; x < CANVAS_WIDTH; x += dotSpacing) {
      for (let y = dotSpacing; y < CANVAS_HEIGHT; y += dotSpacing) {
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (template === 'cornell') {
    ctx.strokeStyle = '#D0D0D0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(200, 0)
    ctx.lineTo(200, CANVAS_HEIGHT)
    ctx.moveTo(0, CANVAS_HEIGHT - 200)
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 200)
    ctx.stroke()
    ctx.strokeStyle = '#E5E5E5'
    ctx.lineWidth = 1
    const lineSpacing = 32
    for (let y = lineSpacing; y < CANVAS_HEIGHT - 200; y += lineSpacing) {
      ctx.beginPath()
      ctx.moveTo(200, y)
      ctx.lineTo(CANVAS_WIDTH - 40, y)
      ctx.stroke()
    }
  }
}

// Draw element to canvas context (for PDF export)
export const drawElementToCanvas = async (ctx, el) => {
  if (el.type === TOOLS.PEN || el.type === TOOLS.HIGHLIGHTER) {
    const options = el.type === TOOLS.PEN ? getPenOptions(el.width) : getHighlighterOptions(el.width)
    const stroke = getStroke(el.points, options)
    const path = new Path2D(getSvgPathFromStroke(stroke))

    ctx.globalAlpha = el.type === TOOLS.HIGHLIGHTER ? 0.3 : 1
    ctx.fillStyle = el.color
    ctx.fill(path)
    ctx.globalAlpha = 1
  } else if (el.type === TOOLS.LINE) {
    ctx.beginPath()
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.width
    ctx.lineCap = 'round'
    ctx.moveTo(el.x1, el.y1)
    ctx.lineTo(el.x2, el.y2)
    ctx.stroke()
  } else if (el.type === TOOLS.RECTANGLE) {
    ctx.beginPath()
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.width
    ctx.strokeRect(
      Math.min(el.x1, el.x2),
      Math.min(el.y1, el.y2),
      Math.abs(el.x2 - el.x1),
      Math.abs(el.y2 - el.y1)
    )
  } else if (el.type === TOOLS.CIRCLE) {
    ctx.beginPath()
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.width
    ctx.ellipse(
      (el.x1 + el.x2) / 2,
      (el.y1 + el.y2) / 2,
      Math.abs(el.x2 - el.x1) / 2,
      Math.abs(el.y2 - el.y1) / 2,
      0, 0, Math.PI * 2
    )
    ctx.stroke()
  } else if (el.type === TOOLS.ARROW) {
    ctx.beginPath()
    ctx.strokeStyle = el.color
    ctx.lineWidth = el.width
    ctx.lineCap = 'round'
    ctx.moveTo(el.x1, el.y1)
    ctx.lineTo(el.x2, el.y2)
    ctx.stroke()

    const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
    const headLength = 15
    ctx.beginPath()
    ctx.moveTo(el.x2, el.y2)
    ctx.lineTo(el.x2 - headLength * Math.cos(angle - Math.PI / 6), el.y2 - headLength * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(el.x2, el.y2)
    ctx.lineTo(el.x2 - headLength * Math.cos(angle + Math.PI / 6), el.y2 - headLength * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  } else if (el.type === TOOLS.TEXT) {
    ctx.fillStyle = el.color
    ctx.font = `${el.fontSize}px 'Quattrocento Sans', sans-serif`
    ctx.fillText(el.text, el.x, el.y)
  } else if (el.type === TOOLS.LINK) {
    ctx.fillStyle = '#4338CA'
    ctx.font = `16px 'Quattrocento Sans', sans-serif`
    ctx.fillText(el.label, el.x, el.y)
  } else if (el.type === 'image') {
    await new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.drawImage(img, el.x, el.y, el.width, el.height)
        resolve()
      }
      img.onerror = resolve
      img.src = el.url
    })
  }
}
