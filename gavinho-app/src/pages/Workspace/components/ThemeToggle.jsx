// =====================================================
// THEME TOGGLE COMPONENT
// Toggle between light and dark mode
// =====================================================

import { memo } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, THEMES } from '../context'

const ThemeToggle = memo(function ThemeToggle({
  showLabel = false,
  size = 'md',
  variant = 'icon' // 'icon' | 'dropdown' | 'buttons'
}) {
  const { themePreference, isDarkMode, setTheme, toggleTheme } = useTheme()

  const sizeStyles = {
    sm: { button: '28px', icon: 14 },
    md: { button: '36px', icon: 18 },
    lg: { button: '44px', icon: 22 }
  }

  const { button: buttonSize, icon: iconSize } = sizeStyles[size] || sizeStyles.md

  // Simple icon toggle (light/dark)
  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        style={{
          width: buttonSize,
          height: buttonSize,
          borderRadius: '8px',
          background: 'var(--stone)',
          border: '1px solid var(--border-color)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--brown)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--cream)'
          e.currentTarget.style.borderColor = 'var(--accent-olive)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--stone)'
          e.currentTarget.style.borderColor = 'var(--border-color)'
        }}
      >
        {isDarkMode ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
      </button>
    )
  }

  // Button group (light/dark/system)
  if (variant === 'buttons') {
    const options = [
      { value: THEMES.LIGHT, icon: Sun, label: 'Claro' },
      { value: THEMES.DARK, icon: Moon, label: 'Escuro' },
      { value: THEMES.SYSTEM, icon: Monitor, label: 'Sistema' }
    ]

    return (
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        background: 'var(--stone)',
        borderRadius: '10px'
      }}>
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: showLabel ? '8px 12px' : '8px',
              borderRadius: '6px',
              border: 'none',
              background: themePreference === value ? 'var(--white)' : 'transparent',
              color: themePreference === value ? 'var(--accent-olive)' : 'var(--brown-light)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: themePreference === value ? 600 : 400,
              boxShadow: themePreference === value ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Icon size={iconSize} />
            {showLabel && label}
          </button>
        ))}
      </div>
    )
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    const options = [
      { value: THEMES.LIGHT, icon: Sun, label: 'Modo Claro' },
      { value: THEMES.DARK, icon: Moon, label: 'Modo Escuro' },
      { value: THEMES.SYSTEM, icon: Monitor, label: 'Sistema' }
    ]

    const currentOption = options.find(o => o.value === themePreference) || options[2]
    const CurrentIcon = currentOption.icon

    return (
      <div style={{ position: 'relative' }}>
        <select
          value={themePreference}
          onChange={(e) => setTheme(e.target.value)}
          style={{
            appearance: 'none',
            padding: '8px 32px 8px 36px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--white)',
            color: 'var(--brown)',
            fontSize: '13px',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {options.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <CurrentIcon
          size={16}
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--brown-light)',
            pointerEvents: 'none'
          }}
        />
      </div>
    )
  }

  return null
})

export default ThemeToggle
