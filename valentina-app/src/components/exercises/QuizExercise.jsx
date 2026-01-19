import { useState } from 'react'
import FeedbackMessage from '../FeedbackMessage'

export default function QuizExercise({
  exercise,
  onComplete,
  showFeedback = true
}) {
  const { instruction, question, options, dataTable, dataChart } = exercise
  const [selectedOption, setSelectedOption] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [showResults, setShowResults] = useState(false)

  const handleOptionSelect = (optionId) => {
    if (showResults) return
    setSelectedOption(optionId)
    setFeedback(null)
  }

  const checkAnswer = () => {
    if (!selectedOption) {
      setFeedback({ type: 'incomplete' })
      return
    }

    const selected = options.find(o => o.id === selectedOption)
    if (selected.correct) {
      setFeedback({ type: 'correct' })
    } else {
      setFeedback({ type: 'incorrect' })
    }
    setShowResults(true)
  }

  const handleRetry = () => {
    setSelectedOption(null)
    setFeedback(null)
    setShowResults(false)
  }

  const handleContinue = () => {
    onComplete?.()
  }

  const getOptionState = (option) => {
    if (!showResults) return 'default'
    if (option.correct) return 'correct'
    if (option.id === selectedOption) return 'incorrect'
    return 'default'
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

      {/* Data table if present */}
      {dataTable && (
        <div className="overflow-x-auto">
          <table className="w-full max-w-lg mx-auto bg-white rounded-xl border border-gray-200">
            <thead>
              <tr className="bg-amber-50">
                {dataTable.headers.map((header, idx) => (
                  <th key={idx} className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                    <span>{header.pt}</span>
                    <span className="text-gray-400 ml-1 text-xs">({header.en})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataTable.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-4 py-3 text-gray-800 border-b border-gray-100">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data chart/image if present */}
      {dataChart && (
        <div className="flex justify-center">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            {dataChart.type === 'bar' && (
              <div className="flex items-end gap-4 h-48">
                {dataChart.data.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div
                      className="w-12 bg-primary-400 rounded-t-lg transition-all duration-300"
                      style={{ height: `${(item.value / Math.max(...dataChart.data.map(d => d.value))) * 160}px` }}
                    />
                    <span className="mt-2 text-sm text-gray-600">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
            {dataChart.type === 'image' && (
              <div className="text-center">
                <span className="text-6xl">{dataChart.emoji}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="text-center bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-lg font-medium text-gray-800">{question.pt}</p>
        <p className="text-gray-500 mt-1">{question.en}</p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {options.map(option => {
          const state = getOptionState(option)
          const isSelected = selectedOption === option.id

          return (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              disabled={showResults}
              className={`
                p-4 rounded-xl border-2 text-left transition-all duration-200
                ${isSelected && !showResults ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : ''}
                ${state === 'correct' ? 'border-green-400 bg-green-50' : ''}
                ${state === 'incorrect' && isSelected ? 'border-orange-400 bg-orange-50' : ''}
                ${!isSelected && state === 'default' ? 'border-gray-200 bg-white hover:border-amber-300' : ''}
                ${showResults ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                  ${isSelected && !showResults ? 'bg-amber-400 text-white' : ''}
                  ${state === 'correct' ? 'bg-green-500 text-white' : ''}
                  ${state === 'incorrect' && isSelected ? 'bg-orange-500 text-white' : ''}
                  ${!isSelected && state === 'default' ? 'bg-gray-100 text-gray-600' : ''}
                `}>
                  {String.fromCharCode(65 + options.indexOf(option))}
                </div>
                <div>
                  <div className="font-medium text-gray-800">{option.text.pt}</div>
                  <div className="text-sm text-gray-500">{option.text.en}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Check button */}
      {!showResults && (
        <div className="flex justify-center">
          <button
            onClick={checkAnswer}
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
            <span className="text-pt">Seleciona uma resposta antes de verificar.</span>
            <span className="text-en ml-2">(Select an answer before checking.)</span>
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
