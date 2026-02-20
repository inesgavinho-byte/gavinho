import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Sentry from './lib/sentry'
import './index.css'
import App from './App.jsx'

// Register service worker for PWA + Push Notifications (production only)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      // In development, unregister any existing service workers to avoid stale cache
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister())
      })
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)))
      return
    }
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        // Force check for update immediately, then every 30 minutes
        reg.update()
        setInterval(() => reg.update(), 30 * 60 * 1000)

        // When a new SW is found, tell it to skip waiting and take over
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                window.location.reload()
              }
            })
          }
        })

        // If there's already a waiting worker, activate it
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      })
      .catch((err) => console.warn('[PWA] SW registration failed:', err))
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ocorreu um erro. Recarregue a página.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
