// =====================================================
// PUSH NOTIFICATIONS HOOK
// Hook for managing push notification permissions and subscriptions
// =====================================================

import { useState, useEffect } from 'react'
import { urlBase64ToUint8Array } from '../utils'

// VAPID public key - should be moved to environment variable
const VAPID_PUBLIC_KEY = 'BFz6TO0qoTGjgsh_Me8K-oO-AbCmhwunac2wiHkluUTLTcNO32rZefeXIHZqkk7i_9Juh2ufLNKUQxpg4xO3XMI'

export function usePushNotifications() {
  const [permission, setPermission] = useState('default')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setError('Este browser não suporta notificações')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      setLoading(false)
      return result === 'granted'
    } catch (err) {
      setError('Erro ao pedir permissão para notificações')
      setLoading(false)
      return false
    }
  }

  const subscribe = async () => {
    if (!('serviceWorker' in navigator)) {
      setError('Service Worker não suportado')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
      setSubscription(sub)
      setLoading(false)
      return sub
    } catch (err) {
      console.error('Erro ao subscrever push:', err)
      setError('Erro ao ativar notificações')
      setLoading(false)
      return null
    }
  }

  const unsubscribe = async () => {
    if (!subscription) return true

    setLoading(true)
    try {
      await subscription.unsubscribe()
      setSubscription(null)
      setLoading(false)
      return true
    } catch (err) {
      setError('Erro ao desativar notificações')
      setLoading(false)
      return false
    }
  }

  return {
    permission,
    subscription,
    loading,
    error,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    subscribe,
    unsubscribe
  }
}

export default usePushNotifications
