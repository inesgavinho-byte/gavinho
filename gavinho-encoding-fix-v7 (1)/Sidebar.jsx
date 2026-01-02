import { NavLink, useNavigate } from 'react-router-dom'
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
  User,
  UsersRound,
  Library
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  {
    section: 'Geral',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Projetos', href: '/projetos', icon: FolderKanban, badge: 12 },
      { name: 'Chat Projetos', href: '/chat-projetos', icon: MessageSquare },
      { name: 'Biblioteca', href: '/biblioteca', icon: Library },
    ]
  },
  {
    section: 'Operação',
    items: [
      { name: 'Obras', href: '/obras', icon: HardHat, badge: 3 },
      { name: 'Chat Obras', href: '/chat-obras', icon: MessageSquare },
      { name: 'Planning', href: '/planning', icon: GanttChart },
      { name: 'Bloqueios', href: '/bloqueios', icon: AlertOctagon, badge: 4 },
      { name: 'Calendário', href: '/calendario', icon: Calendar },
    ]
  },
  {
    section: 'Gestão',
    items: [
      { name: 'Dashboard Gestão', href: '/gestao', icon: LayoutDashboard },
      { name: 'Recursos Humanos', href: '/equipa', icon: UsersRound },
      { name: 'Clientes', href: '/clientes', icon: Users },
      { name: 'Orçamentos', href: '/orcamentos', icon: FileText },
      { name: 'Controlo Custos', href: '/financeiro', icon: Euro },
      { name: 'Fornecedores', href: '/fornecedores', icon: Truck },
      { name: 'Configurações', href: '/configuracoes', icon: Settings },
    ]
  }
]

export default function Sidebar({ isOpen, onClose, isMobile }) {
  const { user, signOut, getUserName, getUserInitials, getUserAvatar } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)

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
            {group.items.map((item) => (
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
            ))}
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
