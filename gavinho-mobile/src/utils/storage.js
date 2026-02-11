// =====================================================
// LOCAL STORAGE UTILITIES
// SecureStore for sensitive data, AsyncStorage for preferences
// =====================================================

import * as SecureStore from 'expo-secure-store'

export const STORAGE_KEYS = {
  USER: 'gavinho_user',
  OBRAS: 'gavinho_obras',
  OBRA: 'gavinho_selected_obra',
  SETTINGS: 'gavinho_settings',
}

export const storage = {
  async get(key) {
    try {
      const value = await SecureStore.getItemAsync(key)
      return value ? JSON.parse(value) : null
    } catch (e) {
      console.error(`Storage get(${key}) error:`, e)
      return null
    }
  },

  async set(key, value) {
    try {
      await SecureStore.setItemAsync(key, JSON.stringify(value))
    } catch (e) {
      console.error(`Storage set(${key}) error:`, e)
    }
  },

  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (e) {
      console.error(`Storage remove(${key}) error:`, e)
    }
  },

  async clear() {
    await Promise.all(
      Object.values(STORAGE_KEYS).map(key => SecureStore.deleteItemAsync(key).catch(() => {}))
    )
  },
}
