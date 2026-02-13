// =====================================================
// PUSH NOTIFICATIONS HOOK (ObraApp)
// Manages push permission, subscription persistence to Supabase
// Self-contained — does NOT depend on AuthContext
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { urlBase64ToUint8Array } from '../utils'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
  || 'BEWvOiZUhXGyjJHW3Wg89oq0o1CKOub482PHXxik6SMYZry4MKU-95y3ALE7xSGp-DolVlUfrWIkXAq07KX3GfU'

export function usePushNotifications(userId) {
  const [permission, setPermission] = useState('default')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isSupported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Check for existing subscription on mount
  useEffect(() => {
    if (!isSupported) return
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setSubscription(sub)
      })
    })
  }, [isSupported])

  // Save subscription to Supabase
  const saveSubscription = useCallback(async (sub) => {
    if (!sub || !userId) return

    const subJson = sub.toJSON()
    try {
      const { error: err } = await supabase
        .from('chat_push_subscriptions')
        .upsert({
          utilizador_id: userId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || '',
          user_agent: navigator.userAgent,
          dispositivo: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          activo: true,
          ultimo_uso: new Date().toISOString()
        }, { onConflict: 'endpoint' })

      if (err) console.error('Failed to save push subscription:', err.message)
    } catch (e) {
      console.error('Failed to save push subscription:', e)
    }
  }, [userId])

  // Remove subscription from Supabase
  const removeSubscription = useCallback(async (sub) => {
    if (!sub) return
    const subJson = sub.toJSON()
    try {
      await supabase
        .from('chat_push_subscriptions')
        .update({ activo: false })
        .eq('endpoint', subJson.endpoint)
    } catch (e) {
      console.error('Failed to deactivate push subscription:', e)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Este browser não suporta notificações push')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (err) {
      setError('Erro ao pedir permissão para notificações')
      return false
    } finally {
      setLoading(false)
    }
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Service Worker não suportado')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) {
          setLoading(false)
          return null
        }
      }

      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      setSubscription(sub)
      await saveSubscription(sub)

      return sub
    } catch (err) {
      console.error('Erro ao subscrever push:', err)
      setError('Erro ao ativar notificações push')
      return null
    } finally {
      setLoading(false)
    }
  }, [isSupported, requestPermission, saveSubscription])

  const unsubscribe = useCallback(async () => {
    if (!subscription) return true

    setLoading(true)
    try {
      await removeSubscription(subscription)
      await subscription.unsubscribe()
      setSubscription(null)
      return true
    } catch (err) {
      setError('Erro ao desativar notificações push')
      return false
    } finally {
      setLoading(false)
    }
  }, [subscription, removeSubscription])

  return {
    permission,
    subscription,
    loading,
    error,
    isSupported,
    isSubscribed: !!subscription,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    subscribe,
    unsubscribe
  }
}

export default usePushNotifications
