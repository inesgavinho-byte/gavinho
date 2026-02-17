import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  HardHat,
  Truck,
  Settings,
  LogOut,
  ChevronDown,
  User,
  UsersRound,
  Library,
  FileSearch,
  FileText,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  {
    section: 'Projetos',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Projetos', href: '/projetos', icon: FolderKanban, badge: 14 },
      { name: 'Clientes', href: '/clientes', icon: Users, badge: 2 },
      { name: 'Biblioteca', href: '/biblioteca', icon: Library },
    ]
  },
  {
    section: 'Obras',
    items: [
      { name: 'Obras', href: '/obras', icon: HardHat, badge: 3 },
      { name: 'Fornecedores', href: '/fornecedores', icon: Truck },
    ]
  },
  {
    section: 'Equipa',
    items: [
      { name: 'Equipa & Tarefas', href: '/equipa', icon: UsersRound, badge: 8 },
    ]
  },
  {
    section: 'Ferramentas',
    items: [
      { name: 'Viabilidade', href: '/viabilidade', icon: FileSearch },
      { name: 'Documentos', href: '/biblioteca', icon: FileText },
    ]
  }
]

export default function Sidebar({ isOpen, onClose, isMobile, collapsed, onToggleCollapse }) {
  const { user, signOut, getUserName, getUserInitials, getUserAvatar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

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

  const renderNavItem = (item) => {
    if (collapsed) {
      return (
        <NavLink
          key={item.name}
          to={item.href}
          end={item.href === '/'}
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item nav-item-collapsed ${isActive ? 'active' : ''}`
          }
        >
          <item.icon size={18} />
          <span className="nav-tooltip">{item.name}</span>
        </NavLink>
      )
    }

    return (
      <NavLink
        key={item.name}
        to={item.href}
        end={item.href === '/'}
        onClick={handleNavClick}
        className={({ isActive }) =>
          `nav-item ${isActive ? 'active' : ''}`
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
      {/* Header: Logo + Toggle */}
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-logo" onClick={handleNavClick}>
          <div className="logo-mark">G</div>
          {!collapsed && <span className="logo-text">GAVINHO</span>}
        </NavLink>
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className="sidebar-toggle-btn"
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* G.A.R.V.I.S. AI Assistant */}
      <NavLink
        to="/workspace"
        onClick={handleNavClick}
        className={`garvis-block ${collapsed ? 'garvis-collapsed' : ''} ${location.pathname === '/workspace' ? 'active' : ''}`}
      >
        <Sparkles size={collapsed ? 18 : 16} />
        {!collapsed && (
          <div className="garvis-text">
            <span className="garvis-title">G.A.R.V.I.S.</span>
            <span className="garvis-subtitle">Assistente IA</span>
          </div>
        )}
        {collapsed && <span className="nav-tooltip">G.A.R.V.I.S.</span>}
      </NavLink>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigation.map((group) => (
          <div key={group.section} className="nav-section">
            {!collapsed && <div className="nav-section-title">{group.section}</div>}
            {collapsed && <div className="nav-section-divider" />}
            {group.items.map((item) => renderNavItem(item))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Definições */}
        <NavLink
          to="/configuracoes"
          onClick={handleNavClick}
          className={({ isActive }) =>
            `nav-item sidebar-settings ${isActive ? 'active' : ''} ${collapsed ? 'nav-item-collapsed' : ''}`
          }
        >
          <Settings size={18} />
          {!collapsed && <span>Definições</span>}
          {collapsed && <span className="nav-tooltip">Definições</span>}
        </NavLink>

        {/* User Card */}
        <div style={{ position: 'relative' }}>
          <div
            className={`user-card ${collapsed ? 'user-card-collapsed' : ''}`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {getUserAvatar() ? (
              <img
                src={getUserAvatar()}
                alt={getUserName()}
                className="user-avatar-img"
              />
            ) : (
              <div className="user-avatar">
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
                    color: 'var(--sidebar-item-color)',
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
            <div className="user-menu-dropdown">
              <div className="user-menu-email">
                {user?.email}
              </div>
              <NavLink
                to="/perfil"
                onClick={() => { setShowUserMenu(false); handleNavClick(); }}
                className="user-menu-item"
              >
                <User size={16} />
                O Meu Perfil
              </NavLink>
              <button
                onClick={handleLogout}
                className="user-menu-item user-menu-logout"
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
