import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { chapter1, getTotalExercises, getAllExercises } from '../data/chapter1'
import { useProgress } from '../hooks/useProgress'
import Header from '../components/Header'
import ExerciseRenderer from '../components/ExerciseRenderer'

export default function ChapterPage() {
  const { chapterId } = useParams()
  const navigate = useNavigate()
  const {
    getChapterProgress,
    getCompletedCount,
    markExerciseComplete,
    isExerciseComplete,
    setCurrentPosition
  } = useProgress()

  // For now, only chapter 1 is available
  const chapter = chapterId === '1' ? chapter1 : null

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)

  const allExercises = chapter ? getAllExercises(chapter) : []
  const totalExercises = chapter ? getTotalExercises(chapter) : 0
  const completedCount = chapter ? getCompletedCount(chapter.id) : 0
  const progress = chapter ? getChapterProgress(chapter.id, totalExercises) : 0

  // Current section and exercise
  const currentSection = chapter?.sections[currentSectionIndex]
  const currentExercise = currentSection?.exercises[currentExerciseIndex]

  // Global exercise index (for progress tracking)
  const globalExerciseIndex = chapter?.sections
    .slice(0, currentSectionIndex)
    .reduce((sum, s) => sum + s.exercises.length, 0) + currentExerciseIndex

  // Update current position in progress
  useEffect(() => {
    if (chapter && currentSection && currentExercise) {
      setCurrentPosition(chapter.id, currentSection.id, currentExerciseIndex)
    }
  }, [chapter, currentSection, currentExercise, currentExerciseIndex, setCurrentPosition])

  if (!chapter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            <span className="text-pt">Capítulo não encontrado</span>
            <span className="text-en ml-2">(Chapter not found)</span>
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            <span className="text-pt">Voltar</span>
            <span className="text-en ml-2">(Back)</span>
          </button>
        </div>
      </div>
    )
  }

  const handleExerciseComplete = () => {
    // Mark as complete
    markExerciseComplete(chapter.id, currentSection.id, currentExerciseIndex)

    // Move to next exercise
    if (currentExerciseIndex < currentSection.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
    } else if (currentSectionIndex < chapter.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1)
      setCurrentExerciseIndex(0)
    }
  }

  const handleSectionChange = (sectionId) => {
    const index = chapter.sections.findIndex(s => s.id === sectionId)
    if (index !== -1) {
      setCurrentSectionIndex(index)
      setCurrentExerciseIndex(0)
    }
  }

  const handlePrevious = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1)
    } else if (currentSectionIndex > 0) {
      const prevSection = chapter.sections[currentSectionIndex - 1]
      setCurrentSectionIndex(prev => prev - 1)
      setCurrentExerciseIndex(prevSection.exercises.length - 1)
    }
  }

  const handleNext = () => {
    if (currentExerciseIndex < currentSection.exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1)
    } else if (currentSectionIndex < chapter.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1)
      setCurrentExerciseIndex(0)
    }
  }

  const canGoBack = currentSectionIndex > 0 || currentExerciseIndex > 0
  const canGoForward = currentSectionIndex < chapter.sections.length - 1 ||
    currentExerciseIndex < currentSection.exercises.length - 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Title and progress */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {chapter.title.pt}
                <span className="text-gray-400 font-normal ml-2">/ {chapter.title.en}</span>
              </h1>
              <p className="text-sm text-gray-500">{chapter.subtitle}</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-semibold text-gray-700">
                {completedCount} / {totalExercises}
              </span>
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2">
            {chapter.sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${currentSectionIndex === index
                    ? 'bg-amber-400 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {section.id}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Section title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {currentSection.id} {currentSection.title.pt}
            <span className="text-amber-500 font-normal ml-2">/ {currentSection.title.en}</span>
          </h2>
          <p className="text-gray-500 mt-1">
            <span className="text-pt">Exercício {currentExerciseIndex + 1} de {currentSection.exercises.length}</span>
            <span className="text-en ml-2">/ Exercise {currentExerciseIndex + 1} of {currentSection.exercises.length}</span>
          </p>
        </div>

        {/* Exercise card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          {currentExercise && (
            <ExerciseRenderer
              key={currentExercise.id}
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={!canGoBack}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
              ${canGoBack
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
              }
            `}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">
              <span className="text-pt">Anterior</span>
              <span className="text-en ml-1 text-gray-400">(Previous)</span>
            </span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            <span className="text-pt">Início</span>
            <span className="text-en ml-1">(Home)</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoForward}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200
              ${canGoForward
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
              }
            `}
          >
            <span className="hidden sm:inline">
              <span className="text-pt">Próximo</span>
              <span className="text-en ml-1 text-gray-400">(Next)</span>
            </span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  )
}
