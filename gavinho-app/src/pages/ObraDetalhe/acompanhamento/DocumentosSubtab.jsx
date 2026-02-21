import { FileText } from 'lucide-react'
import { colors } from '../constants'
import { FONTS, FONT_SIZES } from '../../../styles/designTokens'

export default function DocumentosSubtab({ obraUuid, obra }) {
  return (
    <div style={{ textAlign: 'center', padding: 48, background: '#FFFFFF', borderRadius: 10, border: `1px solid ${colors.border}` }}>
      <FileText size={48} style={{ color: '#B0ADA3', opacity: 0.4, marginBottom: 16 }} />
      <p style={{ color: '#6B6B6B', fontSize: FONT_SIZES.md, fontFamily: FONTS.body }}>Documentos da obra</p>
      <p style={{ color: '#B0ADA3', fontSize: FONT_SIZES.sm, marginTop: 4, fontFamily: FONTS.body }}>Em construção</p>
    </div>
  )
}
