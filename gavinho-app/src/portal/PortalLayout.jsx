import { useState, useEffect, createContext, useContext } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Home, Image, ClipboardList, Clock, FileText, FolderOpen,
  MessageSquare, LogOut, Globe, Loader2, Menu, X
} from 'lucide-react'

// ═══════════════════════════════════════
// PORTAL AUTH CONTEXT
// ═══════════════════════════════════════

const PortalContext = createContext(null)

export function usePortal() {
  return useContext(PortalContext)
}

// ═══════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════

const translations = {
  pt: {
    welcome: 'Bom dia',
    home: 'Resumo',
    gallery: 'Galeria',
    decisions: 'Decisões',
    timeline: 'Timeline',
    reports: 'Relatórios',
    documents: 'Documentos',
    messages: 'Mensagens',
    logout: 'Sair',
    loading: 'A carregar...',
    no_access: 'Sem acesso',
    no_access_desc: 'O portal não está activo para este projecto.',
    back_login: 'Voltar ao login',
  },
  en: {
    welcome: 'Good morning',
    home: 'Overview',
    gallery: 'Gallery',
    decisions: 'Decisions',
    timeline: 'Timeline',
    reports: 'Reports',
    documents: 'Documents',
    messages: 'Messages',
    logout: 'Sign out',
    loading: 'Loading...',
    no_access: 'No access',
    no_access_desc: 'The portal is not active for this project.',
    back_login: 'Back to login',
  }
}

export function t(lang, key) {
  return translations[lang]?.[key] || translations.pt[key] || key
}

// ═══════════════════════════════════════
// PORTAL LAYOUT
// ═══════════════════════════════════════

export default function PortalLayout() {
  const [session, setSession] = useState(null)
  const [config, setConfig] = useState(null)
  const [projeto, setProjeto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('pt')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) loadPortalData(s.user.email)
      else {
        setLoading(false)
        navigate('/portal/login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) loadPortalData(s.user.email)
      else navigate('/portal/login')
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadPortalData = async (email) => {
    try {
      // Find portal config for this client email
      const { data: cfg, error: cfgErr } = await supabase
        .from('portal_config')
        .select('*, projetos(*)')
        .eq('cliente_email', email)
        .eq('activo', true)
        .limit(1)
        .single()

      if (cfgErr) {
        if (cfgErr.code === '42P01') {
          setConfig(null)
          setLoading(false)
          return
        }
        // Try alternate: client might have multiple projects
        const { data: cfgs } = await supabase
          .from('portal_config')
          .select('*, projetos(*)')
          .eq('cliente_email', email)
          .eq('activo', true)
          .limit(1)

        if (cfgs && cfgs.length > 0) {
          setConfig(cfgs[0])
          setProjeto(cfgs[0].projetos)
          setLang(cfgs[0].idioma_preferido || 'pt')
        }
        setLoading(false)
        return
      }

      setConfig(cfg)
      setProjeto(cfg.projetos)
      setLang(cfg.idioma_preferido || 'pt')

      // Log access
      await supabase.from('portal_acessos').insert({
        projeto_id: cfg.projeto_id,
        cliente_email: email,
        seccao_visitada: 'home',
      }).then(() => {})

      // Update access count
      await supabase
        .from('portal_config')
        .update({
          ultimo_acesso: new Date().toISOString(),
          total_acessos: (cfg.total_acessos || 0) + 1,
        })
        .eq('id', cfg.id)
    } catch (err) {
      console.error('Portal load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/portal/login')
  }

  const toggleLang = () => {
    const newLang = lang === 'pt' ? 'en' : 'pt'
    setLang(newLang)
    if (config) {
      supabase
        .from('portal_config')
        .update({ idioma_preferido: newLang })
        .eq('id', config.id)
        .then(() => {})
    }
  }

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingContent}>
          <div style={styles.logo}>GAVINHO</div>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#ADAA96' }} />
          <p style={{ color: '#8B8670', fontSize: '14px' }}>{t(lang, 'loading')}</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingContent}>
          <div style={styles.logo}>GAVINHO</div>
          <h2 style={{ color: '#2D2B28', margin: '16px 0 8px' }}>{t(lang, 'no_access')}</h2>
          <p style={{ color: '#8B8670', fontSize: '14px', marginBottom: '24px' }}>{t(lang, 'no_access_desc')}</p>
          <button onClick={handleLogout} style={styles.btnOutline}>
            {t(lang, 'back_login')}
          </button>
        </div>
      </div>
    )
  }

  const navItems = [
    { to: '/portal', icon: Home, label: t(lang, 'home'), end: true },
    { to: '/portal/galeria', icon: Image, label: t(lang, 'gallery') },
    { to: '/portal/decisoes', icon: ClipboardList, label: t(lang, 'decisions') },
    { to: '/portal/timeline', icon: Clock, label: t(lang, 'timeline'), show: config.mostrar_timeline },
    { to: '/portal/relatorios', icon: FileText, label: t(lang, 'reports') },
    { to: '/portal/documentos', icon: FolderOpen, label: t(lang, 'documents'), show: config.mostrar_documentos },
    { to: '/portal/mensagens', icon: MessageSquare, label: t(lang, 'messages'), show: config.mostrar_mensagens },
  ].filter(item => item.show !== false)

  const contextValue = { config, projeto, lang, session, t: (key) => t(lang, key) }

  return (
    <PortalContext.Provider value={contextValue}>
      <div style={styles.wrapper}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={styles.logoSmall}>GAVINHO</div>
              <div style={styles.divider} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#2D2B28' }}>
                  {config.cliente_nome || config.cliente_email}
                </div>
                <div style={{ fontSize: '12px', color: '#8B8670' }}>
                  {projeto?.nome || ''} · {projeto?.codigo || ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={toggleLang} style={styles.langBtn} title="PT/EN">
                <Globe size={16} />
                <span>{lang.toUpperCase()}</span>
              </button>
              <button onClick={handleLogout} style={styles.logoutBtn} title={t(lang, 'logout')}>
                <LogOut size={16} />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={styles.menuBtn}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Nav */}
        <nav style={styles.desktopNav}>
          <div style={styles.navInner}>
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  style={({ isActive }) => ({
                    ...styles.navLink,
                    color: isActive ? '#2D2B28' : '#8B8670',
                    borderBottom: isActive ? '2px solid #ADAA96' : '2px solid transparent',
                  })}
                >
                  <Icon size={15} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Mobile Nav (overlay) */}
        {mobileMenuOpen && (
          <div style={styles.mobileNav}>
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  style={({ isActive }) => ({
                    ...styles.mobileNavLink,
                    background: isActive ? '#F5F3EB' : 'transparent',
                    color: isActive ? '#2D2B28' : '#8B8670',
                  })}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              )
            })}
          </div>
        )}

        {/* Content */}
        <main style={styles.main}>
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav style={styles.bottomNav}>
          {navItems.slice(0, 5).map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={({ isActive }) => ({
                  ...styles.bottomNavLink,
                  color: isActive ? '#ADAA96' : '#8B8670',
                })}
              >
                <Icon size={20} />
                <span style={{ fontSize: '10px' }}>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </PortalContext.Provider>
  )
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: '#FAFAF8',
    fontFamily: "'Quattrocento Sans', sans-serif",
  },
  loadingScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#FAFAF8',
  },
  loadingContent: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '32px',
    fontWeight: 600,
    letterSpacing: '4px',
    color: '#2D2B28',
  },
  logoSmall: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '20px',
    fontWeight: 600,
    letterSpacing: '3px',
    color: '#2D2B28',
  },
  header: {
    background: '#FFFFFF',
    borderBottom: '1px solid #E8E6DF',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    width: '1px',
    height: '28px',
    background: '#E8E6DF',
  },
  langBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    border: '1px solid #E8E6DF',
    borderRadius: '6px',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#8B8670',
  },
  logoutBtn: {
    padding: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#8B8670',
    borderRadius: '6px',
  },
  menuBtn: {
    padding: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#2D2B28',
    display: 'none',
  },
  desktopNav: {
    background: '#FFFFFF',
    borderBottom: '1px solid #E8E6DF',
  },
  navInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    gap: '4px',
    overflowX: 'auto',
  },
  navLink: {
    padding: '12px 14px',
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    transition: 'color 0.2s',
  },
  mobileNav: {
    position: 'fixed',
    top: '56px',
    left: 0,
    right: 0,
    bottom: 0,
    background: '#FFFFFF',
    zIndex: 99,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  mobileNavLink: {
    padding: '14px 16px',
    borderRadius: '10px',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
    fontWeight: 500,
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px 100px',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#FFFFFF',
    borderTop: '1px solid #E8E6DF',
    display: 'none',
    justifyContent: 'space-around',
    padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
    zIndex: 100,
  },
  bottomNavLink: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    textDecoration: 'none',
    padding: '4px 8px',
  },
  btnOutline: {
    padding: '10px 24px',
    border: '1px solid #ADAA96',
    borderRadius: '8px',
    background: 'transparent',
    color: '#2D2B28',
    fontSize: '14px',
    cursor: 'pointer',
  },
}

// CSS media queries need to be in a style tag
const MediaStyles = () => (
  <style>{`
    @media (max-width: 768px) {
      [data-portal-menu-btn] { display: flex !important; }
      [data-portal-desktop-nav] { display: none !important; }
      [data-portal-bottom-nav] { display: flex !important; }
    }
  `}</style>
)
