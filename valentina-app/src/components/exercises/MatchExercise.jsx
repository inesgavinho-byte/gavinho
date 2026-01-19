import { useState } from 'react'
import FeedbackMessage from '../FeedbackMessage'

export default function MatchExercise({
  exercise,
  onComplete,
  showFeedback = true
}) {
  const { instruction, pairs } = exercise
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [selectedRight, setSelectedRight] = useState(null)
  const [matches, setMatches] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [showResults, setShowResults] = useState(false)

  // Shuffle right side items
  const [shuffledRight] = useState(() =>
    [...pairs].sort(() => Math.random() - 0.5)
  )

  const handleLeftClick = (id) => {
    if (showResults || matches[id]) return
    setSelectedLeft(id)

    if (selectedRight) {
      // Make a match
      setMatches(prev => ({ ...prev, [id]: selectedRight }))
      setSelectedLeft(null)
      setSelectedRight(null)
      setFeedback(null)
    }
  }

  const handleRightClick = (id) => {
    if (showResults) return
    // Check if this right item is already matched
    const isMatched = Object.values(matches).includes(id)
    if (isMatched) return

    setSelectedRight(id)

    if (selectedLeft) {
      // Make a match
      setMatches(prev => ({ ...prev, [selectedLeft]: id }))
      setSelectedLeft(null)
      setSelectedRight(null)
      setFeedback(null)
    }
  }

  const removeMatch = (leftId) => {
    if (showResults) return
    setMatches(prev => {
      const newMatches = { ...prev }
      delete newMatches[leftId]
      return newMatches
    })
  }

  const checkAnswers = () => {
    const allMatched = pairs.every(pair => matches[pair.left.id])
    if (!allMatched) {
      setFeedback({ type: 'incomplete' })
      return
    }

    const allCorrect = pairs.every(pair => matches[pair.left.id] === pair.right.id)

    if (allCorrect) {
      setFeedback({ type: 'correct' })
    } else {
      setFeedback({ type: 'incorrect' })
    }
    setShowResults(true)
  }

  const handleRetry = () => {
    setMatches({})
    setSelectedLeft(null)
    setSelectedRight(null)
    setFeedback(null)
    setShowResults(false)
  }

  const handleContinue = () => {
    onComplete?.()
  }

  const getMatchState = (leftId) => {
    if (!showResults) return 'default'
    const pair = pairs.find(p => p.left.id === leftId)
    return matches[leftId] === pair.right.id ? 'correct' : 'incorrect'
  }

  const isRightMatched = (rightId) => Object.values(matches).includes(rightId)
  const getMatchedLeftForRight = (rightId) => {
    const entry = Object.entries(matches).find(([_, rid]) => rid === rightId)
    return entry ? entry[0] : null
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

      {/* Matching area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Terms */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide text-center">
            <span className="text-pt">Termos</span>
            <span className="text-en ml-2">(Terms)</span>
          </h4>
          {pairs.map(pair => {
            const isSelected = selectedLeft === pair.left.id
            const isMatched = matches[pair.left.id]
            const state = getMatchState(pair.left.id)

            return (
              <div
                key={pair.left.id}
                onClick={() => isMatched ? removeMatch(pair.left.id) : handleLeftClick(pair.left.id)}
                className={`
                  p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${isSelected ? 'ring-2 ring-amber-300 border-amber-400 bg-amber-50' : ''}
                  ${isMatched && !showResults ? 'border-primary-400 bg-primary-50' : ''}
                  ${state === 'correct' ? 'border-green-400 bg-green-50' : ''}
                  ${state === 'incorrect' ? 'border-orange-400 bg-orange-50' : ''}
                  ${!isSelected && !isMatched && state === 'default' ? 'border-gray-200 bg-white hover:border-amber-300' : ''}
                  ${showResults ? 'cursor-default' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  {pair.left.emoji && (
                    <span className="text-2xl">{pair.left.emoji}</span>
                  )}
                  <div>
                    <div className="font-medium text-gray-800">{pair.left.text.pt}</div>
                    <div className="text-sm text-gray-500">{pair.left.text.en}</div>
                  </div>
                </div>
                {isMatched && !showResults && (
                  <div className="mt-2 text-xs text-primary-600">
                    <span className="text-pt">Clica para remover ligação</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right column - Definitions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide text-center">
            <span className="text-pt">Definições</span>
            <span className="text-en ml-2">(Definitions)</span>
          </h4>
          {shuffledRight.map(pair => {
            const isSelected = selectedRight === pair.right.id
            const isMatched = isRightMatched(pair.right.id)
            const matchedLeftId = getMatchedLeftForRight(pair.right.id)
            const state = matchedLeftId ? getMatchState(matchedLeftId) : 'default'

            return (
              <div
                key={pair.right.id}
                onClick={() => handleRightClick(pair.right.id)}
                className={`
                  p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${isSelected ? 'ring-2 ring-amber-300 border-amber-400 bg-amber-50' : ''}
                  ${isMatched && !showResults ? 'border-primary-400 bg-primary-50' : ''}
                  ${state === 'correct' ? 'border-green-400 bg-green-50' : ''}
                  ${state === 'incorrect' ? 'border-orange-400 bg-orange-50' : ''}
                  ${!isSelected && !isMatched && state === 'default' ? 'border-gray-200 bg-white hover:border-amber-300' : ''}
                  ${showResults || isMatched ? 'cursor-default' : ''}
                `}
              >
                <div className="text-gray-800">{pair.right.text.pt}</div>
                <div className="text-sm text-gray-500 mt-1">{pair.right.text.en}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selection hint */}
      {(selectedLeft || selectedRight) && !showResults && (
        <p className="text-center text-sm text-amber-600">
          <span className="text-pt">Agora clica no outro lado para ligar</span>
          <span className="text-en ml-2">(Now click on the other side to match)</span>
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

      {/* Incomplete message */}
      {feedback?.type === 'incomplete' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-gray-600">
            <span className="text-pt">Liga todos os pares antes de verificar.</span>
            <span className="text-en ml-2">(Match all pairs before checking.)</span>
          </p>
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
