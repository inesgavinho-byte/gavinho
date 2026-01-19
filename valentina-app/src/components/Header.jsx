import { useLocation } from 'react-router-dom'
import ProgressBar from './ProgressBar'

export default function Header({ progress = 0, chapterTitle }) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C10.5 5 9 8 12 14c3-6 1.5-9 0-12z"/>
                <path d="M12 14v8M8 18c0-2 4-2 4-4 0 2 4 2 4 4" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Valentina</h1>
              {!isHome && chapterTitle && (
                <p className="text-sm text-gray-500">{chapterTitle}</p>
              )}
            </div>
          </div>

          {/* Progress indicator (only show when not on home) */}
          {!isHome && (
            <div className="flex items-center gap-4">
              <ProgressBar progress={progress} />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
