// =====================================================
// LOGIN SCREEN
// Dual login: Workers (phone + PIN) / Management (email + password)
// Migrated from ObraApp WorkerLogin component
// =====================================================

import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../lib/supabase'
import { storage, STORAGE_KEYS } from '../utils/storage'
import { colors, spacing, borderRadius, shadows } from '../theme'

export default function LoginScreen({ onLogin }) {
  const [loginMode, setLoginMode] = useState('worker') // 'worker' | 'management'
  const [loading, setLoading] = useState(false)

  // Worker fields
  const [telefone, setTelefone] = useState('')
  const [pin, setPin] = useState('')

  // Management fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ========== WORKER LOGIN ==========
  const handleWorkerLogin = async () => {
    if (!telefone.trim() || !pin.trim()) {
      Alert.alert('Erro', 'Preenche o telefone e o PIN')
      return
    }

    setLoading(true)
    try {
      // Format phone
      let phone = telefone.replace(/\s/g, '')
      if (!phone.startsWith('+')) {
        phone = '+351' + phone.replace(/^0/, '')
      }

      // Check credentials
      const { data: trabalhador, error } = await supabase
        .from('trabalhadores')
        .select('id, nome, telefone, cargo')
        .eq('telefone', phone)
        .eq('pin', pin)
        .eq('ativo', true)
        .single()

      if (error || !trabalhador) {
        Alert.alert('Erro', 'Telefone ou PIN incorretos')
        return
      }

      const user = {
        id: trabalhador.id,
        nome: trabalhador.nome,
        telefone: trabalhador.telefone,
        cargo: trabalhador.cargo || 'Equipa',
        tipo: 'trabalhador',
      }

      // Load assigned obras
      const { data: obrasRaw } = await supabase
        .from('trabalhador_obras')
        .select('obra_id, obras(id, codigo, nome)')
        .eq('trabalhador_id', trabalhador.id)

      const obras = obrasRaw?.map(o => o.obras).filter(Boolean) || []

      if (obras.length === 0) {
        Alert.alert('Sem obras', 'Não tens obras atribuídas. Fala com o teu encarregado.')
        return
      }

      // Persist and callback
      await storage.set(STORAGE_KEYS.USER, user)
      await storage.set(STORAGE_KEYS.OBRAS, obras)
      onLogin(user, obras)
    } catch (err) {
      console.error('Worker login error:', err)
      Alert.alert('Erro', 'Erro ao fazer login. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ========== MANAGEMENT LOGIN ==========
  const handleManagementLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erro', 'Preenche o email e a password')
      return
    }

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        Alert.alert('Erro', 'Email ou password incorretos')
        return
      }

      // Get profile and role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nome, cargo, email')
        .eq('id', authData.user.id)
        .single()

      const { data: utilizador } = await supabase
        .from('utilizadores')
        .select('id, nome, role, cargo, ativo')
        .eq('id', authData.user.id)
        .single()

      const user = {
        id: authData.user.id,
        nome: utilizador?.nome || profile?.nome || authData.user.email.split('@')[0],
        email: authData.user.email,
        cargo: utilizador?.cargo || profile?.cargo || 'Gestão',
        role: utilizador?.role || 'user',
        tipo: 'gestao',
        isAdmin: utilizador?.role === 'admin',
        isGestor: ['admin', 'gestor'].includes(utilizador?.role),
      }

      // Load all obras
      const { data: obras } = await supabase
        .from('obras')
        .select('id, codigo, nome, status')
        .order('codigo', { ascending: false })

      await storage.set(STORAGE_KEYS.USER, user)
      await storage.set(STORAGE_KEYS.OBRAS, obras || [])
      onLogin(user, obras || [])
    } catch (err) {
      console.error('Management login error:', err)
      Alert.alert('Erro', 'Erro ao fazer login. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={styles.title}>Gavinho Obras</Text>
          <Text style={styles.subtitle}>Gestão de obra na palma da mão</Text>
        </View>

        {/* Login Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, loginMode === 'worker' && styles.modeButtonActive]}
            onPress={() => setLoginMode('worker')}
          >
            <Ionicons
              name="construct-outline"
              size={18}
              color={loginMode === 'worker' ? colors.textWhite : colors.textSecondary}
            />
            <Text style={[styles.modeText, loginMode === 'worker' && styles.modeTextActive]}>
              Trabalhador
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, loginMode === 'management' && styles.modeButtonActive]}
            onPress={() => setLoginMode('management')}
          >
            <Ionicons
              name="briefcase-outline"
              size={18}
              color={loginMode === 'management' ? colors.textWhite : colors.textSecondary}
            />
            <Text style={[styles.modeText, loginMode === 'management' && styles.modeTextActive]}>
              Gestão
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          {loginMode === 'worker' ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Telefone</Text>
                <View style={styles.inputRow}>
                  <View style={styles.prefix}>
                    <Text style={styles.prefixText}>+351</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.inputWithPrefix]}
                    placeholder="912 345 678"
                    placeholderTextColor={colors.textMuted}
                    value={telefone}
                    onChangeText={setTelefone}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>PIN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="O teu PIN de acesso"
                  placeholderTextColor={colors.textMuted}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
              </View>
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleWorkerLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>Entrar</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="nome@gavinhogroup.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, paddingRight: 44 }]}
                    placeholder="A tua password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleManagementLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.loginButtonText}>Entrar</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>GAVINHO Group</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.textWhite,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textWhite,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    padding: 3,
    marginBottom: spacing.xl,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modeText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  modeTextActive: {
    color: colors.textWhite,
  },
  form: {
    gap: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopLeftRadius: borderRadius.md,
    borderBottomLeftRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRightWidth: 0,
  },
  prefixText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: 16,
    color: colors.textWhite,
  },
  inputWithPrefix: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  passwordRow: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  loginButton: {
    backgroundColor: colors.verde,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.md,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.textWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    marginTop: 40,
    fontWeight: '500',
    letterSpacing: 1,
  },
})
