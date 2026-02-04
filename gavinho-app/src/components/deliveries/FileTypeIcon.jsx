import { FileText, Image, File } from 'lucide-react'

const iconConfig = {
  pdf: { color: '#E53935', label: 'PDF', bg: '#FFEBEE' },
  jpg: { color: '#43A047', label: 'JPG', bg: '#E8F5E9' },
  jpeg: { color: '#43A047', label: 'JPG', bg: '#E8F5E9' },
  png: { color: '#1E88E5', label: 'PNG', bg: '#E3F2FD' },
  dwg: { color: '#FB8C00', label: 'DWG', bg: '#FFF3E0' },
  dwf: { color: '#8E24AA', label: 'DWF', bg: '#F3E5F5' }
}

export default function FileTypeIcon({ type, size = 32 }) {
  const config = iconConfig[type?.toLowerCase()] || { color: '#757575', label: '?', bg: '#F5F5F5' }

  return (
    <div style={{
      width: size,
      height: size,
      minWidth: size,
      borderRadius: '6px',
      background: config.bg,
      border: `1px solid ${config.color}30`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.28,
      fontWeight: '700',
      color: config.color,
      fontFamily: 'monospace'
    }}>
      {config.label}
    </div>
  )
}

export function getFileTypeLabel(ext) {
  const labels = {
    pdf: 'PDF',
    jpg: 'JPEG',
    jpeg: 'JPEG',
    png: 'PNG',
    dwg: 'AutoCAD DWG',
    dwf: 'AutoCAD DWF'
  }
  return labels[ext?.toLowerCase()] || ext?.toUpperCase() || 'Ficheiro'
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
