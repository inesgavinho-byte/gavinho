import { Link } from 'react-router-dom'
import { useProgress } from '../hooks/useProgress'
import { chapter1, getTotalExercises } from '../data/chapter1'
import ProgressBar from '../components/ProgressBar'

export default function HomePage() {
  const { getChapterProgress, getCompletedCount } = useProgress()

  const totalExercises = getTotalExercises(chapter1)
  const completedCount = getCompletedCount(chapter1.id)
  const progress = getChapterProgress(chapter1.id, totalExercises)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-primary-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C10.5 5 9 8 12 14c3-6 1.5-9 0-12z"/>
                <path d="M12 14v8M8 18c0-2 4-2 4-4 0 2 4 2 4 4" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Valentina</h1>
              <p className="text-gray-500">
                <span className="text-pt">Plataforma de Estudo Interativa</span>
                <span className="text-en ml-2">(Interactive Learning Platform)</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome message */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            <span className="text-pt">Olá!</span>
            <span className="text-en ml-2 text-gray-500">(Hello!)</span>
          </h2>
          <p className="text-gray-600">
            <span className="text-pt">Bem-vinda à tua plataforma de estudo de Ciências.</span>
            <span className="text-en ml-2">(Welcome to your Science study platform.)</span>
          </p>
        </div>

        {/* Chapters */}
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          <span className="text-pt">Capítulos</span>
          <span className="text-en ml-2 text-gray-400">(Chapters)</span>
        </h3>

        <div className="space-y-4">
          {/* Chapter 1 card */}
          <Link
            to="/chapter/1"
            className="block bg-white rounded-2xl border border-gray-100 p-6 hover:border-primary-300 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              {/* Chapter icon */}
              <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">🌱</span>
              </div>

              {/* Chapter info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                    Capítulo 1
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-gray-800 mb-1">
                  {chapter1.title.pt}
                </h4>
                <p className="text-gray-500 text-sm mb-3">
                  {chapter1.title.en}
                </p>

                {/* Progress */}
                <div className="flex items-center gap-4">
                  <ProgressBar progress={progress} showLabel={false} />
                  <span className="text-sm text-gray-500">
                    {completedCount} / {totalExercises}
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="text-gray-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Coming soon chapters */}
          <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6 opacity-60">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🔒</span>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-500">
                  <span className="text-pt">Mais capítulos em breve...</span>
                </h4>
                <p className="text-gray-400 text-sm">
                  <span className="text-en">(More chapters coming soon...)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-400 text-sm">
        <p>Cambridge Primary Science 5 - 2025</p>
      </footer>
    </div>
  )
}
