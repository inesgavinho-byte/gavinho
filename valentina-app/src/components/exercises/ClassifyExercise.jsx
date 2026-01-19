import { useState } from 'react'
import BilingualText from '../BilingualText'
import FeedbackMessage from '../FeedbackMessage'

export default function ClassifyExercise({
  exercise,
  onComplete,
  showFeedback = true
}) {
  const { instruction, categories, items } = exercise
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [showResults, setShowResults] = useState(false)

  const handleSelect = (itemId, categoryId) => {
    if (showResults) return
    setAnswers(prev => ({
      ...prev,
      [itemId]: categoryId
    }))
    setFeedback(null)
  }

  const checkAnswers = () => {
    const allAnswered = items.every(item => answers[item.id])
    if (!allAnswered) {
      setFeedback({ type: 'incomplete' })
      return
    }

    const allCorrect = items.every(item => answers[item.id] === item.correctCategory)

    if (allCorrect) {
      setFeedback({ type: 'correct' })
      setShowResults(true)
    } else {
      setFeedback({ type: 'incorrect' })
      setShowResults(true)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setFeedback(null)
    setShowResults(false)
  }

  const handleContinue = () => {
    onComplete?.()
  }

  const getItemState = (item) => {
    if (!showResults) return 'default'
    return answers[item.id] === item.correctCategory ? 'correct' : 'incorrect'
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

      {/* Category headers */}
      <div className="flex justify-center gap-4 flex-wrap">
        {categories.map(category => (
          <div
            key={category.id}
            className="px-6 py-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-center"
          >
            <span className="font-medium text-gray-800">{category.pt}</span>
            <span className="text-gray-500 ml-2">/ {category.en}</span>
          </div>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(item => {
          const state = getItemState(item)
          const isCorrect = state === 'correct'
          const isIncorrect = state === 'incorrect'

          return (
            <div
              key={item.id}
              className={`
                bg-white rounded-2xl border-2 p-6 transition-all duration-200
                ${isCorrect ? 'border-green-400 bg-green-50' : ''}
                ${isIncorrect ? 'border-orange-400 bg-orange-50' : ''}
                ${!showResults ? 'border-gray-200' : ''}
              `}
            >
              {/* Item icon/image */}
              <div className="text-center mb-3">
                {item.emoji && (
                  <span className="text-5xl">{item.emoji}</span>
                )}
                {item.icon && (
                  <div className="w-16 h-16 mx-auto">{item.icon}</div>
                )}
              </div>

              {/* Item name */}
              <div className="text-center mb-4">
                <span className="font-medium text-gray-800">{item.name.pt}</span>
                <span className="text-gray-500 ml-2">/ {item.name.en}</span>
              </div>

              {/* Category selection buttons */}
              <div className="flex justify-center gap-2">
                {categories.map(category => {
                  const isSelected = answers[item.id] === category.id
                  const showCorrectAnswer = showResults && item.correctCategory === category.id

                  return (
                    <button
                      key={category.id}
                      onClick={() => handleSelect(item.id, category.id)}
                      disabled={showResults}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                        ${isSelected && !showResults
                          ? 'bg-amber-400 text-white'
                          : ''
                        }
                        ${isSelected && showResults && isCorrect
                          ? 'bg-green-500 text-white'
                          : ''
                        }
                        ${isSelected && showResults && isIncorrect
                          ? 'bg-orange-500 text-white'
                          : ''
                        }
                        ${showCorrectAnswer && !isSelected
                          ? 'bg-green-200 text-green-800 border-2 border-green-400'
                          : ''
                        }
                        ${!isSelected && !showCorrectAnswer
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : ''
                        }
                        ${showResults ? 'cursor-default' : 'cursor-pointer'}
                      `}
                    >
                      {category.pt}
                    </button>
                  )
                })}
              </div>

              {/* Show correct answer indicator */}
              {showResults && isIncorrect && (
                <div className="text-center mt-2 text-sm text-green-600">
                  <span className="text-pt">Resposta correta: </span>
                  {categories.find(c => c.id === item.correctCategory)?.pt}
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

      {/* Incomplete message */}
      {feedback?.type === 'incomplete' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-gray-600">
            <span className="text-pt">Classifica todas as plantas antes de verificar.</span>
            <span className="text-en ml-2">(Classify all plants before checking.)</span>
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
