import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ui/ThemeToggle'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  HardHat,
  Calendar,
  Truck,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  User,
  UsersRound,
  Receipt,
  ShoppingCart,
  PieChart,
  Wallet,
  Library,
  Database,
  Shield,
  FileSearch,
  Mail,
  MessageSquare,
  Eye,
  EyeOff,
  Check,
  Handshake,
  ClipboardList,
  FileCheck,
  Layers,
  TrendingUp,
  CreditCard,
  FileText,
  Building2,
  MessagesSquare
} from 'lucide-react'
import { useState } from 'react'

// Calendário global - visível para todos, fora dos módulos
const globalItems = [
  { name: 'Calendário', href: '/calendario', icon: Calendar }
]

const navigation = [
  {
    section: 'Projetos',
    items: [
      { name: 'Dashboard Projetos', href: '/dashboard-projetos', icon: LayoutDashboard },
      { name: 'Projetos', href: '/projetos', icon: FolderKanban },
      { name: 'Teams', href: '/chat', icon: MessagesSquare },
      { name: 'Biblioteca', href: '/biblioteca', icon: Library },
    ]
  },
  {
    section: 'Obras',
    items: [
      { name: 'Dashboard Obras', href: '/obras', icon: HardHat },
      { name: 'Obras', href: '/obras-lista', icon: Building2 },
      { name: 'Chat', href: '/obras-chat', icon: MessageSquare },
      { name: 'Equipa & SubEmpreiteiros', href: '/gestao-obras', icon: UsersRound },
    ]
  },
  {
    section: 'Gestão Projeto',
    adminOnly: true,
    items: [
      { name: 'Clientes', href: '/clientes', icon: Users },
      { name: 'Viabilidade', href: '/viabilidade', icon: FileSearch },
      { name: 'Leads', href: '/leads', icon: TrendingUp },
      {
        name: 'Projetos em Curso',
        href: '/gestao-projeto/em-curso',
        icon: FolderKanban,
        subItems: [
          { name: 'Procurement', href: '/gestao-projeto/em-curso/procurement', icon: Handshake },
          { name: 'Compras', href: '/gestao-projeto/em-curso/compras', icon: ShoppingCart },
          { name: 'Controlo Executado', href: '/gestao-projeto/em-curso/controlo', icon: PieChart },
          { name: 'Autos Projeto', href: '/gestao-projeto/em-curso/autos', icon: FileCheck },
        ]
      },
      {
        name: 'Projetos Concluídos',
        href: '/gestao-projeto/concluidos',
        icon: ClipboardList,
        subItems: [
          { name: 'Procurement', href: '/gestao-projeto/concluidos/procurement', icon: Handshake },
          { name: 'Compras', href: '/gestao-projeto/concluidos/compras', icon: ShoppingCart },
          { name: 'Controlo Executado', href: '/gestao-projeto/concluidos/controlo', icon: PieChart },
          { name: 'Autos Obra', href: '/gestao-projeto/concluidos/autos', icon: FileCheck },
        ]
      },
      { name: 'Gestão Integrada', href: '/gestao-projeto/integrada', icon: Layers },
      { name: 'Fornecedores', href: '/fornecedores', icon: Truck },
    ]
  },
  {
    section: 'Financeiro',
    adminOnly: true,
    items: [
      { name: 'Custos Fixos', href: '/financeiro/custos-fixos', icon: CreditCard },
      { name: 'Faturação', href: '/financeiro/faturacao', icon: FileText },
      { name: 'Compras', href: '/financeiro/compras', icon: ShoppingCart },
    ]
  },
  {
    section: 'Administrativo',
    adminOnly: true,
    items: [
      { name: 'Emails', href: '/emails', icon: Mail },
      { name: 'Recursos Humanos', href: '/equipa', icon: UsersRound },
      { name: 'Seed de Dados', href: '/admin/seed', icon: Database },
      { name: 'Configurações', href: '/configuracoes', icon: Settings },
    ]
  }
]

export default function Sidebar({ isOpen, onClose, isMobile, collapsed, onToggleCollapse, isWorkspace }) {
  const { user, signOut, getUserName, getUserInitials, getUserAvatar, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [expandedItems, setExpandedItems] = useState({})
  const [viewAsRole, setViewAsRole] = useState(null) // null = normal, 'user' = ver como utilizador normal
  const [showViewAsMenu, setShowViewAsMenu] = useState(false)

  // Verificar se deve mostrar como admin (real ou simulado)
  const shouldShowAsAdmin = () => {
    if (viewAsRole === 'user') return false
    return isAdmin()
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Get user role from email domain or metadata
  const getUserRole = () => {
    if (!user) return 'Utilizador'
    const email = user.email || ''
    if (email.includes('maria.gavinho')) return 'Diretora Criativa'
    if (email.includes('armando.felix')) return 'Project Manager'
    return 'Equipa GAVINHO'
  }

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose()
    }
  }

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }))
  }

  const isItemActive = (item) => {
    const basePath = item.href.split('?')[0]
    return location.pathname === basePath || location.pathname.startsWith(basePath + '/')
  }

  const renderNavItem = (item) => {
    const hasSubItems = item.subItems && item.subItems.length > 0
    const isExpanded = expandedItems[item.name]
    const isActive = isItemActive(item)

    // Collapsed mode - show only icons with custom tooltip
    if (collapsed) {
      return (
        <NavLink
          key={item.name}
          to={item.href}
          end={item.href === '/'}
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item nav-item-collapsed ${isActive ? 'active' : ''} ${item.highlight ? 'nav-item-highlight' : ''}`
          }
        >
          <item.icon size={20} />
          <span className="nav-tooltip">{item.name}</span>
        </NavLink>
      )
    }

    if (hasSubItems) {
      return (
        <div key={item.name}>
          <div
            onClick={() => toggleExpanded(item.name)}
            className={`nav-item ${isActive ? 'active' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <item.icon size={18} />
            <span style={{ flex: 1 }}>{item.name}</span>
            <ChevronRight
              size={16}
              style={{
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)'
              }}
            />
          </div>
          {isExpanded && (
            <div style={{ marginLeft: '12px', borderLeft: '1px solid var(--stone)', marginTop: '4px' }}>
              {item.subItems.map(subItem => (
                <NavLink
                  key={subItem.name}
                  to={subItem.href}
                  onClick={handleNavClick}
                  className="nav-item nav-subitem"
                  style={{
                    paddingLeft: '20px',
                    fontSize: '13px'
                  }}
                >
                  <subItem.icon size={16} />
                  <span style={{ flex: 1 }}>{subItem.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.name}
        to={item.href}
        end={item.href === '/'}
        onClick={handleNavClick}
        className={({ isActive }) =>
          `nav-item ${isActive ? 'active' : ''} ${item.highlight ? 'nav-item-highlight' : ''}`
        }
      >
        <item.icon size={18} />
        <span style={{ flex: 1 }}>{item.name}</span>
        {item.badge && (
          <span className="nav-item-badge">{item.badge}</span>
        )}
      </NavLink>
    )
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header" style={collapsed ? { justifyContent: 'center', padding: '16px 8px' } : {}}>
        <NavLink to="/" className="sidebar-logo" onClick={handleNavClick} style={collapsed ? { gap: 0 } : {}}>
          <div className="logo-mark">G</div>
          {!collapsed && <span className="logo-text">GAVINHO</span>}
        </NavLink>
      </div>

      {/* Collapse Toggle Button */}
      {!isMobile && (
        <button
          onClick={onToggleCollapse}
          className="sidebar-collapse-btn"
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          style={{
            position: 'absolute',
            top: collapsed ? '72px' : '28px',
            right: collapsed ? '50%' : '-14px',
            transform: collapsed ? 'translateX(50%)' : 'none',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--brown)',
            border: '2px solid var(--cream)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.25s ease'
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Calendário global - sempre visível */}
        <div className="nav-section">
          {globalItems.map((item) => renderNavItem(item))}
        </div>

        {navigation
          .filter(group => !group.adminOnly || shouldShowAsAdmin())
          .map((group, index) => (
          <div key={group.section} className="nav-section">
            {!collapsed && <div className="nav-section-title">{group.section}</div>}
            {collapsed && <div className="nav-section-divider" />}
            {group.items.map((item) => renderNavItem(item))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={collapsed ? { padding: '12px 8px' } : {}}>
        {/* Theme Toggle */}
        <div style={{
          marginBottom: collapsed ? '8px' : '12px',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-start',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ThemeToggle size={collapsed ? 'sm' : 'md'} />
          {!collapsed && (
            <span style={{ fontSize: '12px', color: 'var(--brown-light)', fontWeight: 500 }}>
              Tema
            </span>
          )}
        </div>

        {/* View As indicator - collapsed mode */}
        {isAdmin() && collapsed && (
          <div
            className="view-as-indicator"
            onClick={() => setViewAsRole(viewAsRole ? null : 'user')}
            style={{
              background: viewAsRole ? 'rgba(239, 68, 68, 0.15)' : 'var(--cream)',
              border: viewAsRole ? '2px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--stone)',
              color: viewAsRole ? '#dc2626' : 'var(--brown-light)'
            }}
            title={viewAsRole ? 'A ver como: Utilizador - Clique para voltar ao normal' : 'Visualizar como utilizador normal'}
          >
            {viewAsRole ? <EyeOff size={16} /> : <Eye size={16} />}
            <div className="user-tooltip" style={{ minWidth: '160px' }}>
              <div className="tooltip-name">{viewAsRole ? 'Modo: Utilizador' : 'Visualizar como...'}</div>
              <div className="tooltip-role">{viewAsRole ? 'Clique para voltar ao normal' : 'Clique para simular utilizador'}</div>
            </div>
          </div>
        )}

        {/* View As - apenas para admins reais */}
        {isAdmin() && !collapsed && (
          <div style={{ marginBottom: '12px', position: 'relative' }}>
            <button
              onClick={() => setShowViewAsMenu(!showViewAsMenu)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '10px 12px',
                background: viewAsRole ? 'rgba(239, 68, 68, 0.1)' : 'var(--cream)',
                border: viewAsRole ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--stone)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: viewAsRole ? '#dc2626' : 'var(--brown)',
                fontWeight: 500
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {viewAsRole ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{viewAsRole ? 'A ver como: Utilizador' : 'Visualizar como...'}</span>
              </div>
              <ChevronDown size={14} style={{ transform: showViewAsMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showViewAsMenu && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '4px',
                background: 'var(--white)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                zIndex: 100
              }}>
                <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--brown-light)', borderBottom: '1px solid var(--stone)' }}>
                  Visualizar plataforma como:
                </div>
                <button
                  onClick={() => { setViewAsRole(null); setShowViewAsMenu(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: !viewAsRole ? 'var(--cream)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--brown)',
                    textAlign: 'left'
                  }}
                >
                  <Shield size={14} />
                  Administrador (normal)
                  {!viewAsRole && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--success)' }} />}
                </button>
                <button
                  onClick={() => { setViewAsRole('user'); setShowViewAsMenu(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: viewAsRole === 'user' ? 'var(--cream)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: 'var(--brown)',
                    textAlign: 'left'
                  }}
                >
                  <User size={14} />
                  Utilizador normal
                  {viewAsRole === 'user' && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--success)' }} />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* User Card with Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            className={`user-card ${collapsed ? 'user-card-collapsed' : ''}`}
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={collapsed ? {
              cursor: 'pointer',
              justifyContent: 'center',
              padding: '8px'
            } : { cursor: 'pointer' }}
          >
            {getUserAvatar() ? (
              <img
                src={getUserAvatar()}
                alt={getUserName()}
                style={{
                  width: collapsed ? '32px' : '36px',
                  height: collapsed ? '32px' : '36px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div className="user-avatar" style={collapsed ? { width: '32px', height: '32px', fontSize: '11px' } : {}}>
                {getUserInitials()}
              </div>
            )}
            {!collapsed && (
              <>
                <div className="user-info">
                  <div className="user-name">{getUserName()}</div>
                  <div className="user-role">{getUserRole()}</div>
                </div>
                <ChevronDown
                  size={16}
                  style={{
                    color: 'var(--brown-light)',
                    transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.2s'
                  }}
                />
              </>
            )}
            {collapsed && (
              <div className="user-tooltip">
                <div className="tooltip-name">{getUserName()}</div>
                <div className="tooltip-role">{getUserRole()}</div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div 
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '8px',
                background: 'var(--white)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                zIndex: 100
              }}
            >
              <div 
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--stone)',
                  fontSize: '12px',
                  color: 'var(--brown-light)'
                }}
              >
                {user?.email}
              </div>
              <NavLink
                to="/perfil"
                onClick={() => { setShowUserMenu(false); handleNavClick(); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brown)',
                  fontSize: '13px',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >
                <User size={16} />
                O Meu Perfil
              </NavLink>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--error)',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16} />
                Terminar Sessão
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
