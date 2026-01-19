import { useState } from 'react'
import FeedbackMessage from '../FeedbackMessage'

export default function CycleExercise({
  exercise,
  onComplete,
  showFeedback = true
}) {
  const { instruction, stages, cycleTitle } = exercise
  const [arrangement, setArrangement] = useState(() =>
    [...stages].sort(() => Math.random() - 0.5).map(s => s.id)
  )
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [showResults, setShowResults] = useState(false)

  const handleStageClick = (index) => {
    if (showResults) return

    if (selectedIndex === null) {
      setSelectedIndex(index)
    } else {
      // Swap the stages
      const newArrangement = [...arrangement]
      const temp = newArrangement[selectedIndex]
      newArrangement[selectedIndex] = newArrangement[index]
      newArrangement[index] = temp
      setArrangement(newArrangement)
      setSelectedIndex(null)
      setFeedback(null)
    }
  }

  const checkAnswers = () => {
    const correctOrder = stages.map(s => s.id)
    const isCorrect = arrangement.every((id, idx) => id === correctOrder[idx])

    if (isCorrect) {
      setFeedback({ type: 'correct' })
    } else {
      setFeedback({ type: 'incorrect' })
    }
    setShowResults(true)
  }

  const handleRetry = () => {
    setArrangement([...stages].sort(() => Math.random() - 0.5).map(s => s.id))
    setSelectedIndex(null)
    setFeedback(null)
    setShowResults(false)
  }

  const handleContinue = () => {
    onComplete?.()
  }

  const getStageById = (id) => stages.find(s => s.id === id)

  const getStageState = (id, index) => {
    if (!showResults) return 'default'
    const correctOrder = stages.map(s => s.id)
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

      {/* Cycle title */}
      {cycleTitle && (
        <div className="text-center">
          <h3 className="text-xl font-semibold text-primary-700">
            <span>{cycleTitle.pt}</span>
            <span className="text-primary-400 ml-2">/ {cycleTitle.en}</span>
          </h3>
        </div>
      )}

      {/* Cycle visualization */}
      <div className="relative max-w-2xl mx-auto">
        {/* Circular arrangement for larger screens */}
        <div className="hidden md:block relative h-96">
          {arrangement.map((id, index) => {
            const stage = getStageById(id)
            const state = getStageState(id, index)
            const angle = (index / arrangement.length) * 2 * Math.PI - Math.PI / 2
            const radius = 140
            const x = 50 + (radius * Math.cos(angle)) / 3
            const y = 50 + (radius * Math.sin(angle)) / 2

            return (
              <div
                key={id}
                onClick={() => handleStageClick(index)}
                style={{
                  position: 'absolute',
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`
                  w-32 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${selectedIndex === index ? 'ring-4 ring-amber-300 border-amber-400' : ''}
                  ${state === 'correct' ? 'border-green-400 bg-green-50' : ''}
                  ${state === 'incorrect' ? 'border-orange-400 bg-orange-50' : ''}
                  ${state === 'default' && selectedIndex !== index ? 'border-gray-200 bg-white hover:border-amber-300' : ''}
                  ${showResults ? 'cursor-default' : ''}
                `}
              >
                {/* Stage number */}
                <div className="text-center text-sm text-gray-400 mb-1">
                  {index + 1}
                </div>

                {/* Stage image/emoji */}
                <div className="text-center text-3xl mb-2">
                  {stage.emoji || '🌱'}
                </div>

                {/* Stage name */}
                <div className="text-center text-xs">
                  <div className="font-medium text-gray-800">{stage.name.pt}</div>
                  <div className="text-gray-500">{stage.name.en}</div>
                </div>
              </div>
            )
          })}

          {/* Arrows between stages */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                </marker>
              </defs>
            </svg>
          </div>
        </div>

        {/* Linear arrangement for mobile */}
        <div className="md:hidden space-y-3">
          {arrangement.map((id, index) => {
            const stage = getStageById(id)
            const state = getStageState(id, index)

            return (
              <div key={id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                  {index + 1}
                </div>
                <div
                  onClick={() => handleStageClick(index)}
                  className={`
                    flex-1 flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${selectedIndex === index ? 'ring-2 ring-amber-300 border-amber-400' : ''}
                    ${state === 'correct' ? 'border-green-400 bg-green-50' : ''}
                    ${state === 'incorrect' ? 'border-orange-400 bg-orange-50' : ''}
                    ${state === 'default' && selectedIndex !== index ? 'border-gray-200 bg-white' : ''}
                    ${showResults ? 'cursor-default' : ''}
                  `}
                >
                  <span className="text-3xl">{stage.emoji || '🌱'}</span>
                  <div>
                    <div className="font-medium text-gray-800">{stage.name.pt}</div>
                    <div className="text-sm text-gray-500">{stage.name.en}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hint */}
      {!showResults && selectedIndex !== null && (
        <p className="text-center text-sm text-amber-600">
          <span className="text-pt">Clica noutra etapa para trocar</span>
          <span className="text-en ml-2">(Click another stage to swap)</span>
        </p>
      )}

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
