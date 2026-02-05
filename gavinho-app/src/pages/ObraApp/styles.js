// =====================================================
// OBRA APP STYLES
// Shared styles for ObraApp components
// =====================================================

export const colors = {
  primary: '#3d4349',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  background: '#f5f5f5',
  chatBackground: '#e8e9ea',
  inputBackground: '#F0F2F5',
  textPrimary: '#3d4349',
  textSecondary: '#667781',
  textMuted: '#888',
  border: '#E5E5E5',
  white: '#ffffff'
}

export const styles = {
  // Layout
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: colors.background,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 16
  },
  spinner: {
    width: 40,
    height: 40,
    color: colors.primary
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },

  // Header
  header: {
    background: colors.primary,
    color: 'white',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  menuButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: 4
  },
  headerTitle: {
    flex: 1
  },
  obraCode: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600
  },
  obraNome: {
    margin: 0,
    fontSize: 12,
    opacity: 0.7
  },
  headerActions: {
    display: 'flex',
    gap: 8
  },
  iconButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: 4
  },

  // Side Menu
  menuOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200
  },
  menu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    background: colors.primary,
    color: 'white',
    display: 'flex',
    flexDirection: 'column'
  },
  menuHeader: {
    padding: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  menuNav: {
    flex: 1,
    padding: '12px 0'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '14px 20px',
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    background: 'rgba(244, 67, 54, 0.1)',
    border: 'none',
    color: colors.error,
    fontSize: 14,
    cursor: 'pointer'
  },

  // Bottom Navigation
  bottomNav: {
    display: 'flex',
    background: 'white',
    borderTop: `1px solid ${colors.border}`,
    padding: '8px 0'
  },
  navButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px',
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: 11,
    cursor: 'pointer'
  },
  navButtonActive: {
    color: colors.primary
  },

  // Chat
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: colors.chatBackground
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  emptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.textSecondary
  },
  message: {
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: 8,
    boxShadow: '0 1px 1px rgba(0,0,0,0.1)'
  },
  messageOwn: {
    alignSelf: 'flex-end',
    background: '#d4d6d8',
    borderBottomRightRadius: 0
  },
  messageOther: {
    alignSelf: 'flex-start',
    background: 'white',
    borderBottomLeftRadius: 0
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.primary,
    display: 'block',
    marginBottom: 2
  },
  messageText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap'
  },
  messagePhoto: {
    maxWidth: '100%',
    maxHeight: 300,
    borderRadius: 8,
    marginBottom: 4,
    cursor: 'pointer'
  },
  messageTime: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4
  },

  // Photo Preview
  photoPreviewContainer: {
    position: 'relative',
    padding: 12,
    background: colors.inputBackground,
    borderTop: `1px solid ${colors.border}`
  },
  photoPreview: {
    maxWidth: '100%',
    maxHeight: 200,
    borderRadius: 8
  },
  cancelPhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16
  },

  // Input
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: colors.inputBackground
  },
  attachButton: {
    background: 'none',
    border: 'none',
    color: '#54656F',
    cursor: 'pointer',
    padding: 8
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    border: 'none',
    borderRadius: 24,
    fontSize: 14,
    outline: 'none'
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: colors.primary,
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },

  // Login
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.primary,
    padding: 20
  },
  loginCard: {
    background: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: 24
  },
  loginField: {
    marginBottom: 16
  },
  loginInput: {
    width: '100%',
    padding: '14px 16px',
    border: `2px solid ${colors.border}`,
    borderRadius: 8,
    fontSize: 16,
    marginTop: 6,
    outline: 'none',
    boxSizing: 'border-box'
  },
  loginButton: {
    width: '100%',
    padding: 14,
    background: colors.primary,
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 12
  },
  loginToggle: {
    display: 'flex',
    background: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20
  },
  toggleButton: {
    flex: 1,
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  toggleButtonActive: {
    background: 'white',
    color: colors.primary,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  error: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center'
  },

  // Obra Selector
  obrasList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 16
  },
  obraItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#F5F5F5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left'
  },
  selectedObraCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: '#E8F5E9',
    borderRadius: 8,
    marginBottom: 20
  },
  changeButton: {
    marginLeft: 'auto',
    padding: '6px 12px',
    background: 'none',
    border: `1px solid ${colors.success}`,
    borderRadius: 4,
    color: colors.success,
    fontSize: 12,
    cursor: 'pointer'
  },

  // Forms
  formContainer: {
    flex: 1,
    padding: 20,
    overflowY: 'auto'
  },
  formTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 18,
    marginBottom: 20
  },
  formField: {
    marginBottom: 16
  },
  formRow: {
    display: 'flex',
    gap: 12
  },
  formInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #DDD',
    borderRadius: 8,
    fontSize: 14,
    marginTop: 4,
    boxSizing: 'border-box'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    cursor: 'pointer'
  },
  submitButton: {
    width: '100%',
    padding: 14,
    background: colors.primary,
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer'
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    background: '#E8F5E9',
    color: '#2E7D32',
    borderRadius: 8,
    marginBottom: 16
  },

  // Empty & Loading States
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    color: colors.textMuted
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },

  // Team Members
  membrosList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  membroItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: 'white',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  membroAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: colors.primary,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600
  }
}

export default styles
