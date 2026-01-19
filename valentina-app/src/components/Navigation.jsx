import { useNavigate } from 'react-router-dom'

export default function Navigation({
  sections,
  currentSection,
  onSectionChange,
  onPrevious,
  onNext,
  onSkip,
  canGoBack = true,
  canGoForward = true,
  canSkip = true
}) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      {sections && sections.length > 0 && (
        <div className="flex justify-center">
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${currentSection === section.id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                  }
                `}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onPrevious}
          disabled={!canGoBack}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
            ${canGoBack
              ? 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
              : 'text-gray-300 cursor-not-allowed'
            }
          `}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">
            <span className="text-pt">Anterior</span>
            <span className="text-en ml-1">(Previous)</span>
          </span>
        </button>

        {canSkip && (
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            <span className="text-pt">Saltar</span>
            <span className="text-en ml-1">(Skip)</span>
          </button>
        )}

        <button
          onClick={onNext}
          disabled={!canGoForward}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
            ${canGoForward
              ? 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <span className="hidden sm:inline">
            <span className="text-pt">Próximo</span>
            <span className="text-en ml-1">(Next)</span>
          </span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
