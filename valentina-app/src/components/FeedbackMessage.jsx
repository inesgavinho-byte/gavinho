export default function FeedbackMessage({ type, onRetry, onContinue, correctAnswer }) {
  if (type === 'correct') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4 feedback-correct">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-green-800 font-medium">
              <span className="text-pt">Correto!</span>
              <span className="text-en ml-2">(Correct!)</span>
            </p>
          </div>
          <button onClick={onContinue} className="btn-primary">
            <span className="text-pt">Continuar</span>
            <span className="text-en ml-1 text-white/80">(Continue)</span>
          </button>
        </div>
      </div>
    )
  }

  if (type === 'incorrect') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-4 feedback-retry">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-orange-800 font-medium">
              <span className="text-pt">Tenta outra vez!</span>
              <span className="text-en ml-2">(Try again!)</span>
            </p>
            {correctAnswer && (
              <p className="text-orange-600 text-sm mt-1">
                <span className="text-pt">Resposta: {correctAnswer.pt}</span>
                {correctAnswer.en && (
                  <span className="text-en ml-2">({correctAnswer.en})</span>
                )}
              </p>
            )}
          </div>
          <button onClick={onRetry} className="btn-retry">
            <span className="text-pt">Tentar</span>
            <span className="text-en ml-1 text-white/80">(Retry)</span>
          </button>
        </div>
      </div>
    )
  }

  return null
}
