// =====================================================
// GAVINHO OBRAS - MOBILE APP
// React Native (Expo) - Entry Point
// =====================================================

import { useState, useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

// Screens
import LoginScreen from './src/screens/LoginScreen'
import ObraSelectScreen from './src/screens/ObraSelectScreen'
import AppNavigator from './src/navigation/AppNavigator'

// Utils
import { storage, STORAGE_KEYS } from './src/utils/storage'
import { colors } from './src/theme'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [obras, setObras] = useState([])
  const [selectedObra, setSelectedObra] = useState(null)

  // Restore session on mount
  useEffect(() => {
    restoreSession()
  }, [])

  const restoreSession = async () => {
    try {
      const savedUser = await storage.get(STORAGE_KEYS.USER)
      const savedObras = await storage.get(STORAGE_KEYS.OBRAS)
      const savedObra = await storage.get(STORAGE_KEYS.OBRA)

      if (savedUser) {
        setUser(savedUser)
        setObras(savedObras || [])
        if (savedObra) {
          setSelectedObra(savedObra)
        }
      }
    } catch (err) {
      console.error('Session restore error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = (userData, obrasData) => {
    setUser(userData)
    setObras(obrasData)

    // Auto-select if only one obra
    if (obrasData.length === 1) {
      handleSelectObra(obrasData[0])
    }
  }

  const handleSelectObra = async (obra) => {
    setSelectedObra(obra)
    await storage.set(STORAGE_KEYS.OBRA, obra)
  }

  const handleLogout = async () => {
    await storage.clear()
    setUser(null)
    setObras([])
    setSelectedObra(null)
  }

  // Loading splash
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="white" />
        <StatusBar style="light" />
      </View>
    )
  }

  // Not logged in
  if (!user) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={handleLogin} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    )
  }

  // No obra selected (multiple obras)
  if (!selectedObra) {
    return (
      <SafeAreaProvider>
        <ObraSelectScreen
          obras={obras}
          user={user}
          onSelect={handleSelectObra}
        />
        <StatusBar style="dark" />
      </SafeAreaProvider>
    )
  }

  // Main app
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator obra={selectedObra} user={user} />
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
})
