import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register service worker for PWA + Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service worker registered, scope:', reg.scope)
        // Check for updates every 60 minutes
        setInterval(() => reg.update(), 60 * 60 * 1000)
      })
      .catch((err) => console.warn('[PWA] SW registration failed:', err))
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
