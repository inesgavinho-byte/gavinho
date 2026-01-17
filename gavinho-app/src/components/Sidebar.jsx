import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  HardHat,
  UserCircle,
  Calendar,
  FileText,
  Truck,
  Settings,
  Kanban,
  AlertOctagon,
  MessageSquare,
  Euro,
  GanttChart,
  LogOut,
  ChevronDown,
  ChevronRight,
  User,
  UsersRound,
  Receipt,
  ShoppingCart,
  PieChart,
  Wallet,
  Library
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  {
    section: 'Módulo Projetos',
    items: [
      { name: 'Dashboard Projetos', href: '/dashboard-projetos', icon: LayoutDashboard },
      { name: 'Projetos', href: '/projetos', icon: FolderKanban },
      { name: 'Chat Projetos', href: '/chat', icon: MessageSquare },
      {
        name: 'Planning',
        href: '/planning',
        icon: GanttChart,
        subItems: [
          { name: 'Bloqueios', href: '/planning?tab=bloqueios', icon: AlertOctagon },
          { name: 'Tarefas', href: '/planning?tab=tarefas', icon: Kanban }
        ]
      },
      { name: 'Calendário', href: '/calendario', icon: Calendar },
      { name: 'Biblioteca', href: '/biblioteca', icon: Library },
    ]
  },
  {
    section: 'Módulo Obras',
    items: [
      { name: 'Dashboard Obras', href: '/obras', icon: HardHat },
    ]
  },
  {
    section: 'Gestão Projetos',
    items: [
      { name: 'Dashboard Gestão', href: '/gestao', icon: LayoutDashboard },
      { name: 'Clientes', href: '/clientes', icon: Users },
      {
        name: 'Gestão Financeira',
        href: '/financeiro',
        icon: Wallet,
        subItems: [
          { name: 'Orçamentos', href: '/financeiro?tab=orcamentos', icon: Receipt },
          { name: 'Compras', href: '/financeiro?tab=compras', icon: ShoppingCart },
          { name: 'Controlo Executado', href: '/financeiro?tab=controlo', icon: PieChart }
        ]
      },
      { name: 'Fornecedores', href: '/fornecedores', icon: Truck },
    ]
  },
  {
    section: 'Administração',
    items: [
      { name: 'Recursos Humanos', href: '/equipa', icon: UsersRound },
      { name: 'Controlo Custos', href: '/financeiro', icon: Euro },
    ]
  }
]

export default function Sidebar({ isOpen, onClose, isMobile }) {
  const { user, signOut, getUserName, getUserInitials, getUserAvatar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [expandedItems, setExpandedItems] = useState({})

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
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-logo" onClick={handleNavClick}>
          <div className="logo-mark">G</div>
          <span className="logo-text">GAVINHO</span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navigation.map((group) => (
          <div key={group.section} className="nav-section">
            <div className="nav-section-title">{group.section}</div>
            {group.items.map((item) => renderNavItem(item))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <NavLink to="/configuracoes" className="nav-item">
          <Settings size={18} />
          <span style={{ flex: 1 }}>Configurações</span>
        </NavLink>
        
        {/* User Card with Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            className="user-card"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{ cursor: 'pointer' }}
          >
            {getUserAvatar() ? (
              <img 
                src={getUserAvatar()} 
                alt={getUserName()}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div className="user-avatar">{getUserInitials()}</div>
            )}
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
