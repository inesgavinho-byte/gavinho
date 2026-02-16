// =====================================================
// DESIGN TOKENS — Gavinho Platform
// Single source of truth for all visual constants.
// Import tokens — never hardcode values.
// =====================================================

// ── Typography ──────────────────────────────────────
export const FONTS = {
  heading: "'Cormorant Garamond', Georgia, serif",   // Page titles & entity names ONLY
  body: "'Quattrocento Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
}

export const FONT_SIZES = {
  xs: '11px',
  sm: '12px',
  base: '13px',
  md: '14px',
  lg: '17px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '36px',
}

export const FONT_WEIGHTS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

// ── Colors (map to CSS custom props) ────────────────
export const COLORS = {
  // Brand
  gold: '#C9A882',
  goldDark: '#B8956E',
  goldLight: '#D4BC9E',
  charcoal: '#2D2D2D',
  stone: 'var(--stone)',
  cream: 'var(--cream)',

  // Backgrounds (use CSS vars for dark-mode compat)
  bgPage: 'var(--sandy-beach)',
  bgCard: 'var(--white)',
  bgCardHover: 'var(--cream)',
  bgSubtle: 'var(--off-white)',

  // Text
  textPrimary: 'var(--brown)',
  textSecondary: 'var(--brown-light)',
  textTertiary: 'var(--blush-dark)',
  textInverse: '#FFFFFF',

  // Borders
  border: 'var(--stone)',
  borderHover: 'var(--stone-dark)',
  borderFocus: 'var(--accent-olive)',

  // Status  (earthy palette — replaces old #10B981 / #EF4444 / etc.)
  success: 'var(--success)',          // olive green  #7A8B6E
  warning: 'var(--warning)',          // warm gold    #C9A86C
  error: 'var(--error)',              // terracotta   #9A6B5B
  info: 'var(--info)',                // steel blue   #7A8B9E

  successBg: 'var(--success-bg)',
  warningBg: 'var(--warning-bg)',
  errorBg: 'var(--error-bg)',

  // Accent
  accent: 'var(--accent-olive)',
  accentDark: 'var(--accent-olive-dark)',
}

// ── Spacing ─────────────────────────────────────────
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  base: '16px',
  lg: '20px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '36px',
  '4xl': '48px',
}

// ── Radius ──────────────────────────────────────────
export const RADIUS = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '980px',
}

// ── Shadows ─────────────────────────────────────────
export const SHADOWS = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
}

// ── Phase colors (earthy) ───────────────────────────
export const PHASE_COLORS = {
  'Proposta':          { color: '#8A9EB8', bg: 'rgba(138,158,184,0.12)' },
  'Conceito':          { color: '#C9A882', bg: 'rgba(201,168,130,0.12)' },
  'Projeto':           { color: '#C3BAAF', bg: 'rgba(195,186,175,0.12)' },
  'Projeto Base':      { color: '#C3BAAF', bg: 'rgba(195,186,175,0.12)' },
  'Projeto Execução':  { color: '#B0A599', bg: 'rgba(176,165,153,0.12)' },
  'Licenciamento':     { color: '#B0A599', bg: 'rgba(176,165,153,0.12)' },
  'Construção':        { color: '#7A9E7A', bg: 'rgba(122,158,122,0.12)' },
  'Fit-out':           { color: '#5F5C59', bg: 'rgba(95,92,89,0.12)' },
  'Entrega':           { color: '#4A4845', bg: 'rgba(74,72,69,0.12)' },
  'Casa Viva':         { color: '#7A8B6E', bg: 'rgba(122,139,110,0.12)' },
  'Concluído':         { color: '#7A8B6E', bg: 'rgba(122,139,110,0.12)' },
}

// Helper: get phase color (earthy, not #8B5CF6/#3B82F6)
export const getPhaseColor = (fase) => PHASE_COLORS[fase]?.color || COLORS.textSecondary
export const getPhaseBg    = (fase) => PHASE_COLORS[fase]?.bg    || 'var(--cream)'

// ── Status colours ──────────────────────────────────
export const STATUS_COLORS = {
  on_track:  { color: 'var(--success)', bg: 'var(--success-bg)' },
  at_risk:   { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  delayed:   { color: 'var(--error)',   bg: 'var(--error-bg)' },
  on_hold:   { color: 'var(--info)',    bg: 'rgba(122,139,158,0.12)' },
  completed: { color: 'var(--success)', bg: 'var(--success-bg)' },
}

export const getStatusColor = (status) => STATUS_COLORS[status]?.color || COLORS.info
export const getStatusBg    = (status) => STATUS_COLORS[status]?.bg    || 'var(--cream)'

// ── KPI card accent presets ─────────────────────────
export const KPI_ACCENTS = {
  olive:   { icon: 'var(--accent-olive)',  bg: 'rgba(122,139,110,0.10)', gradient: 'linear-gradient(135deg, #F8F6F0 0%, #F0EDE4 100%)' },
  gold:    { icon: 'var(--warning)',       bg: 'rgba(201,168,108,0.10)', gradient: 'linear-gradient(135deg, #F8F5EE 0%, #F2EDDF 100%)' },
  steel:   { icon: 'var(--info)',          bg: 'rgba(122,139,158,0.10)', gradient: 'linear-gradient(135deg, #F5F7F9 0%, #EDF0F4 100%)' },
  earth:   { icon: 'var(--error)',         bg: 'rgba(154,107,91,0.10)',  gradient: 'linear-gradient(135deg, #F8F4F2 0%, #F0EBE8 100%)' },
}

// ── Default export ──────────────────────────────────
export default {
  FONTS,
  FONT_SIZES,
  FONT_WEIGHTS,
  COLORS,
  SPACING,
  RADIUS,
  SHADOWS,
  PHASE_COLORS,
  STATUS_COLORS,
  KPI_ACCENTS,
  getPhaseColor,
  getPhaseBg,
  getStatusColor,
  getStatusBg,
}
