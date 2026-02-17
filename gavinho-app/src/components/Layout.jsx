import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { Menu, X } from 'lucide-react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()

  // Auto-collapse sidebar when on workspace
  const isWorkspace = location.pathname === '/workspace' || location.pathname === '/chat'

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) {
        setSidebarOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-collapse on workspace
  useEffect(() => {
    if (isWorkspace && !isMobile) {
      setSidebarCollapsed(true)
    }
  }, [isWorkspace, isMobile])

  const closeSidebar = () => setSidebarOpen(false)
  const toggleCollapsed = () => setSidebarCollapsed(!sidebarCollapsed)

  return (
    <div className={`app-layout ${sidebarCollapsed && !isMobile ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Header */}
      {isMobile && (
        <div className="mobile-header" style={{ display: 'flex' }}>
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, var(--brown), var(--brown-dark))', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sandy-beach)', fontSize: '12px', fontWeight: 700 }}>G</div>
            <span style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px' }}>GAVINHO</span>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay open" onClick={closeSidebar} />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        isMobile={isMobile}
        collapsed={sidebarCollapsed && !isMobile}
        onToggleCollapse={toggleCollapsed}
      />
      <main className={`main-content ${isWorkspace ? 'workspace-mode' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}
