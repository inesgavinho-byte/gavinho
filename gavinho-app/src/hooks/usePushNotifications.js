// =====================================================
// PUSH NOTIFICATIONS HOOK (Shared)
// Manages push permission, subscription persistence to Supabase,
// and service worker registration for Web Push
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// VAPID public key — the private key must be configured as
// VAPID_PRIVATE_KEY secret in Supabase Edge Function environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
  || 'BEWvOiZUhXGyjJHW3Wg89oq0o1CKOub482PHXxik6SMYZry4MKU-95y3ALE7xSGp-DolVlUfrWIkXAq07KX3GfU'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const { user, profile } = useAuth()
  const [permission, setPermission] = useState('default')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isSupported = typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window

  // Check current permission on mount
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

  // Save subscription to Supabase chat_push_subscriptions table
  const saveSubscription = useCallback(async (sub) => {
    if (!sub || !user?.id) return

    const subJson = sub.toJSON()
    try {
      // Upsert by endpoint (unique constraint)
      const { error: err } = await supabase
        .from('chat_push_subscriptions')
        .upsert({
          utilizador_id: profile?.id || user.id,
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
  }, [user, profile])

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

  // Request notification permission
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

  // Subscribe to push notifications + persist to DB
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Service Worker não suportado')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      // Ensure permission is granted
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) {
          setLoading(false)
          return null
        }
      }

      // Register service worker if not already
      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
      }

      // Create push subscription
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      setSubscription(sub)

      // Persist to Supabase
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

  // Unsubscribe from push notifications
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
