// =====================================================
// GAVINHO MOBILE - DESIGN SYSTEM
// Brand colors, typography, spacing
// =====================================================

export const colors = {
  // Brand
  primary: '#3d4349',
  verde: '#4a5d4a',
  beige: '#ADAA96',
  cream: '#F2F0E7',
  gold: '#C9A882',

  // UI
  background: '#f5f5f5',
  surface: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  // Text
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textWhite: '#ffffff',

  // Status
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Priority
  priorityAlta: '#ef4444',
  priorityMedia: '#f59e0b',
  priorityBaixa: '#6b7280',
}

export const fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  // Will be replaced with Cormorant Garamond + Quattrocento Sans
  // once loaded via expo-font
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
}
