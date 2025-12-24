import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Buscar perfil do utilizador na tabela utilizadores
  const fetchProfile = async (email) => {
    if (!email) {
      setProfile(null)
      return null
    }
    
    try {
      const { data, error } = await supabase
        .from('utilizadores')
        .select('*')
        .eq('email', email)
        .eq('ativo', true)
        .single()
      
      if (error) {
        console.warn('Perfil não encontrado:', error.message)
        setProfile(null)
        return null
      }
      
      setProfile(data)
      return data
    } catch (err) {
      console.error('Erro ao buscar perfil:', err)
      setProfile(null)
      return null
    }
  }

  useEffect(() => {
    // Timeout de segurança - máximo 2 segundos
    const timeout = setTimeout(() => setLoading(false), 2000)

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Fetch profile em background (não bloqueia)
      if (session?.user?.email) {
        fetchProfile(session.user.email)
      }
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        if (session?.user?.email) {
          fetchProfile(session.user.email)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  // Sign in with email/password
  const signInWithEmail = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) throw error
    return data
  }

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  // Get user display name
  const getUserName = () => {
    if (profile?.nome) return profile.nome
    if (!user) return ''
    return user.user_metadata?.full_name || 
           user.user_metadata?.name || 
           user.email?.split('@')[0] || 
           'Utilizador'
  }

  // Get user initials
  const getUserInitials = () => {
    const name = getUserName()
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Get user avatar URL
  const getUserAvatar = () => {
    return profile?.avatar_url || user?.user_metadata?.avatar_url || null
  }

  // Check if user is admin
  const isAdmin = () => {
    return profile?.role === 'admin'
  }

  // Check if user is gestor or higher
  const isGestor = () => {
    return ['admin', 'gestor'].includes(profile?.role)
  }

  // Check if user is tecnico or higher
  const isTecnico = () => {
    return ['admin', 'gestor', 'tecnico'].includes(profile?.role)
  }

  // Check permission level
  const hasPermission = (requiredRole) => {
    const hierarchy = { admin: 4, gestor: 3, tecnico: 2, user: 1 }
    const userLevel = hierarchy[profile?.role] || 0
    const requiredLevel = hierarchy[requiredRole] || 0
    return userLevel >= requiredLevel
  }

  // Get user role
  const getRole = () => {
    return profile?.role || 'user'
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    getUserName,
    getUserInitials,
    getUserAvatar,
    isAdmin,
    isGestor,
    isTecnico,
    hasPermission,
    getRole,
    isAuthenticated: !!session,
    refreshProfile: () => fetchProfile(user?.email)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
