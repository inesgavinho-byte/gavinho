// =====================================================
// SUPABASE CLIENT - React Native
// Uses SecureStore for token persistence
// =====================================================

import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = 'https://vctcppuvqjstscbzdykn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdGNwcHV2cWpzdHNjYnpkeWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwNDU2MjgsImV4cCI6MjA1MjYyMTYyOH0.hFgPMjnHxzJfEhRKOpCy0jNFR2XCaZPaJIT1oEgFb6c'

// Secure storage adapter for Supabase auth tokens
const SecureStoreAdapter = {
  getItem: async (key) => {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (e) {
      console.error('SecureStore getItem error:', e)
      return null
    }
  },
  setItem: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (e) {
      console.error('SecureStore setItem error:', e)
    }
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (e) {
      console.error('SecureStore removeItem error:', e)
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'gavinho-mobile-auth',
  },
})

export { supabaseUrl, supabaseAnonKey }
