import { useState } from 'react'
import FeedbackMessage from '../FeedbackMessage'

export default function FillBlankExercise({
  exercise,
  onComplete,
  showFeedback = true
}) {
  const { instruction, sentences, wordBank } = exercise
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [showResults, setShowResults] = useState(false)

  const handleWordSelect = (sentenceId, blankId, word) => {
    if (showResults) return
    setAnswers(prev => ({
      ...prev,
      [`${sentenceId}-${blankId}`]: word
    }))
    setFeedback(null)
  }

  const clearAnswer = (sentenceId, blankId) => {
    if (showResults) return
    setAnswers(prev => {
      const newAnswers = { ...prev }
      delete newAnswers[`${sentenceId}-${blankId}`]
      return newAnswers
    })
  }

  const getUsedWords = () => {
    return Object.values(answers)
  }

  const checkAnswers = () => {
    // Check if all blanks are filled
    const totalBlanks = sentences.reduce((sum, s) => sum + s.blanks.length, 0)
    const filledBlanks = Object.keys(answers).length

    if (filledBlanks < totalBlanks) {
      setFeedback({ type: 'incomplete' })
      return
    }

    // Check correctness
    let allCorrect = true
    sentences.forEach(sentence => {
      sentence.blanks.forEach(blank => {
        const answer = answers[`${sentence.id}-${blank.id}`]
        if (answer !== blank.correct) {
          allCorrect = false
        }
      })
    })

    if (allCorrect) {
      setFeedback({ type: 'correct' })
    } else {
      setFeedback({ type: 'incorrect' })
    }
    setShowResults(true)
  }

  const handleRetry = () => {
    setAnswers({})
    setFeedback(null)
    setShowResults(false)
  }

  const handleContinue = () => {
    onComplete?.()
  }

  const getBlankState = (sentenceId, blank) => {
    if (!showResults) return 'default'
    const answer = answers[`${sentenceId}-${blank.id}`]
    return answer === blank.correct ? 'correct' : 'incorrect'
  }

  const renderSentenceWithBlanks = (sentence) => {
    const parts = sentence.template.split(/(\[blank:\d+\])/)

    return parts.map((part, index) => {
      const blankMatch = part.match(/\[blank:(\d+)\]/)

      if (blankMatch) {
        const blankId = parseInt(blankMatch[1])
        const blank = sentence.blanks.find(b => b.id === blankId)
        const answer = answers[`${sentence.id}-${blankId}`]
        const state = getBlankState(sentence.id, blank)

        return (
          <span key={index} className="inline-block mx-1">
            {answer ? (
              <button
                onClick={() => clearAnswer(sentence.id, blankId)}
                disabled={showResults}
                className={`
                  px-3 py-1 rounded-lg font-medium transition-all duration-200
                  ${state === 'correct' ? 'bg-green-500 text-white' : ''}
                  ${state === 'incorrect' ? 'bg-orange-500 text-white' : ''}
                  ${state === 'default' ? 'bg-amber-400 text-white hover:bg-amber-500' : ''}
                  ${showResults ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                {answer}
              </button>
            ) : (
              <span className="inline-block w-24 h-8 border-b-2 border-dashed border-gray-400 mx-1" />
            )}
            {showResults && state === 'incorrect' && (
              <span className="text-green-600 text-sm ml-1">
                ({blank.correct})
              </span>
            )}
          </span>
        )
      }

      return <span key={index}>{part}</span>
    })
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

      {/* Word bank */}
      <div className="bg-amber-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-amber-800 mb-3 text-center">
          <span className="text-pt">Palavras disponíveis</span>
          <span className="text-en ml-2">(Available words)</span>
        </h4>
        <div className="flex flex-wrap justify-center gap-2">
          {wordBank.map((word, index) => {
            const isUsed = getUsedWords().includes(word)

            return (
              <span
                key={index}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all duration-200
                  ${isUsed
                    ? 'bg-gray-200 text-gray-400 line-through'
                    : 'bg-white border-2 border-amber-300 text-amber-800'
                  }
                `}
              >
                {word}
              </span>
            )
          })}
        </div>
      </div>

      {/* Sentences */}
      <div className="space-y-4">
        {sentences.map(sentence => (
          <div key={sentence.id} className="bg-white rounded-xl border border-gray-200 p-4">
            {/* Portuguese sentence */}
            <p className="text-lg text-gray-800 leading-relaxed mb-2">
              {renderSentenceWithBlanks(sentence)}
            </p>

            {/* English translation */}
            <p className="text-sm text-gray-500 italic">
              {sentence.translation}
            </p>

            {/* Word selection for this sentence */}
            {!showResults && (
              <div className="mt-3 flex flex-wrap gap-2">
                {sentence.blanks.map(blank => {
                  const currentAnswer = answers[`${sentence.id}-${blank.id}`]
                  if (currentAnswer) return null

                  return (
                    <div key={blank.id} className="flex flex-wrap gap-1">
                      {wordBank.filter(w => !getUsedWords().includes(w)).map((word, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleWordSelect(sentence.id, blank.id, word)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
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
            <span className="text-pt">Completa todas as frases antes de verificar.</span>
            <span className="text-en ml-2">(Complete all sentences before checking.)</span>
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
