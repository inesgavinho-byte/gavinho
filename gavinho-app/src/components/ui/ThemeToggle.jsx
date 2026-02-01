// =====================================================
// THEME TOGGLE - Dark/Light mode switch
// =====================================================

import { Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import './ThemeToggle.css'

export default function ThemeToggle({ showLabel = false, size = 'md' }) {
  const { theme, toggleTheme, isDark } = useTheme()

  const sizes = {
    sm: { button: 32, icon: 16 },
    md: { button: 40, icon: 20 },
    lg: { button: 48, icon: 24 }
  }

  const { button, icon } = sizes[size]

  return (
    <button
      className={`theme-toggle ${isDark ? 'theme-toggle-dark' : ''}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      style={{ width: button, height: button }}
    >
      <div className="theme-toggle-icons">
        <Sun
          size={icon}
          className={`theme-toggle-icon theme-toggle-sun ${!isDark ? 'active' : ''}`}
        />
        <Moon
          size={icon}
          className={`theme-toggle-icon theme-toggle-moon ${isDark ? 'active' : ''}`}
        />
      </div>
      {showLabel && (
        <span className="theme-toggle-label">
          {isDark ? 'Escuro' : 'Claro'}
        </span>
      )}
    </button>
  )
}
