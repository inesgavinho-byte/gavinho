import { useState } from 'react'
import FeedbackMessage from '../FeedbackMessage'

export default function SequenceExercise({
  exercise,
  onComplete,
  showFeedback = true
}) {
  const { instruction, steps } = exercise
  const [arrangement, setArrangement] = useState(() =>
    [...steps].sort(() => Math.random() - 0.5).map(s => s.id)
  )
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [showResults, setShowResults] = useState(false)

  const handleDragStart = (index) => {
    if (showResults) return
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (showResults || draggedIndex === null || draggedIndex === index) return

    const newArrangement = [...arrangement]
    const draggedItem = newArrangement[draggedIndex]
    newArrangement.splice(draggedIndex, 1)
    newArrangement.splice(index, 0, draggedItem)
    setArrangement(newArrangement)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setFeedback(null)
  }

  const moveItem = (fromIndex, direction) => {
    if (showResults) return
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= arrangement.length) return

    const newArrangement = [...arrangement]
    const temp = newArrangement[fromIndex]
    newArrangement[fromIndex] = newArrangement[toIndex]
    newArrangement[toIndex] = temp
    setArrangement(newArrangement)
    setFeedback(null)
  }

  const checkAnswers = () => {
    const correctOrder = steps.map(s => s.id)
    const isCorrect = arrangement.every((id, idx) => id === correctOrder[idx])

    if (isCorrect) {
      setFeedback({ type: 'correct' })
    } else {
      setFeedback({ type: 'incorrect' })
    }
    setShowResults(true)
  }

  const handleRetry = () => {
    setArrangement([...steps].sort(() => Math.random() - 0.5).map(s => s.id))
    setDraggedIndex(null)
    setFeedback(null)
    setShowResults(false)
  }

  const handleContinue = () => {
    onComplete?.()
  }

  const getStepById = (id) => steps.find(s => s.id === id)

  const getStepState = (id, index) => {
    if (!showResults) return 'default'
    const correctOrder = steps.map(s => s.id)
    return correctOrder[index] === id ? 'correct' : 'incorrect'
  }

  return (
    <div className="space-y-6">
      {/* Instruction */}
      <div className="text-center">
        <p className="text-lg">
          <span className="text-gray-900">{instruction.pt}</span>
          <span className="text-gray-500 italic ml-2">/ {instruction.en}</span>
        </p>
      </div>

      {/* Steps list */}
      <div className="max-w-xl mx-auto space-y-3">
        {arrangement.map((id, index) => {
          const step = getStepById(id)
          const state = getStepState(id, index)
          const isCorrect = state === 'correct'
          const isIncorrect = state === 'incorrect'

          return (
            <div
              key={id}
              draggable={!showResults}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                ${!showResults ? 'cursor-grab active:cursor-grabbing' : ''}
                ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                ${isCorrect ? 'border-green-400 bg-green-50' : ''}
                ${isIncorrect ? 'border-orange-400 bg-orange-50' : ''}
                ${state === 'default' ? 'border-gray-200 bg-white hover:border-amber-300' : ''}
              `}
            >
              {/* Position number */}
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                ${isCorrect ? 'bg-green-500 text-white' : ''}
                ${isIncorrect ? 'bg-orange-500 text-white' : ''}
                ${state === 'default' ? 'bg-amber-100 text-amber-700' : ''}
              `}>
                {index + 1}
              </div>

              {/* Step content */}
              <div className="flex-1 flex items-center gap-3">
                {step.emoji && (
                  <span className="text-2xl">{step.emoji}</span>
                )}
                <div>
                  <div className="font-medium text-gray-800">{step.text.pt}</div>
                  <div className="text-sm text-gray-500">{step.text.en}</div>
                </div>
              </div>

              {/* Move buttons (mobile friendly) */}
              {!showResults && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                      ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}
                    `}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === arrangement.length - 1}
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                      ${index === arrangement.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'}
                    `}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Check button */}
      {!showResults && (
        <div className="flex justify-center">
          <button
            onClick={checkAnswers}
            className="btn-primary text-lg px-8 py-3"
          >
            <span className="text-pt">Verificar</span>
            <span className="text-en ml-2 text-white/80">(Check)</span>
          </button>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && feedback?.type === 'correct' && (
        <FeedbackMessage
          type="correct"
          onContinue={handleContinue}
        />
      )}

      {showFeedback && feedback?.type === 'incorrect' && (
        <FeedbackMessage
          type="incorrect"
          onRetry={handleRetry}
        />
      )}
    </div>
  )
}
