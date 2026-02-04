// =====================================================
// USE TEAMS IMPORT HOOK
// Custom hook for Microsoft Teams import functionality
// Extracted from Workspace.jsx for better modularity
// =====================================================

import { useState, useCallback } from 'react'
import { MS_GRAPH_CONFIG } from '../utils/constants'

/**
 * Custom hook for managing Microsoft Teams import functionality
 * Handles OAuth authentication, fetching teams/channels, and importing data
 *
 * @param {Object} options - Hook options
 * @param {Function} options.onChannelImported - Callback when a channel is imported (receives channel data)
 * @returns {Object} Teams import state and functions
 */
const useTeamsImport = ({ onChannelImported } = {}) => {
  // Modal visibility
  const [showTeamsImport, setShowTeamsImport] = useState(false)

  // Authentication state
  const [teamsAuthState, setTeamsAuthState] = useState('idle') // 'idle' | 'authenticating' | 'authenticated' | 'error'
  const [teamsAccessToken, setTeamsAccessToken] = useState(null)
  const [teamsUser, setTeamsUser] = useState(null)

  // Teams and channels data
  const [availableTeams, setAvailableTeams] = useState([])
  const [selectedTeamsToImport, setSelectedTeamsToImport] = useState([])
  const [teamsChannels, setTeamsChannels] = useState({})
  const [selectedChannelsToImport, setSelectedChannelsToImport] = useState([])

  // Import progress tracking
  const [importProgress, setImportProgress] = useState({
    status: 'idle',
    current: 0,
    total: 0,
    currentItem: ''
  })
  const [importLog, setImportLog] = useState([])
  const [importStep, setImportStep] = useState(1)

  // ========== HELPER FUNCTIONS ==========

  /**
   * Add a log entry to the import log
   */
  const addImportLog = useCallback((type, message) => {
    setImportLog(prev => [...prev, {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    }])
  }, [])

  /**
   * Reset all import state to initial values
   */
  const resetTeamsImport = useCallback(() => {
    setTeamsAuthState('idle')
    setTeamsAccessToken(null)
    setTeamsUser(null)
    setAvailableTeams([])
    setSelectedTeamsToImport([])
    setTeamsChannels({})
    setSelectedChannelsToImport([])
    setImportProgress({ status: 'idle', current: 0, total: 0, currentItem: '' })
    setImportLog([])
    setImportStep(1)
  }, [])

  // ========== API FUNCTIONS ==========

  /**
   * Fetch authenticated user info from Microsoft Graph
   */
  const fetchTeamsUser = useCallback(async (token) => {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const user = await response.json()
        setTeamsUser(user)
        addImportLog('success', `Autenticado como ${user.displayName}`)
      }
    } catch (error) {
      addImportLog('error', 'Erro ao obter informacoes do utilizador')
    }
  }, [addImportLog])

  /**
   * Fetch available Teams the user has joined
   */
  const fetchAvailableTeams = useCallback(async (token) => {
    try {
      addImportLog('info', 'A carregar Teams...')
      const response = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableTeams(data.value || [])
        addImportLog('success', `Encontrados ${data.value?.length || 0} Teams`)
      } else {
        throw new Error('Failed to fetch teams')
      }
    } catch (error) {
      addImportLog('error', 'Erro ao carregar Teams. Verifique as permissoes.')
      setTeamsAuthState('error')
    }
  }, [addImportLog])

  /**
   * Fetch channels for a specific team
   */
  const fetchTeamChannels = useCallback(async (teamId, token = null) => {
    const accessToken = token || teamsAccessToken
    if (!accessToken) return []

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setTeamsChannels(prev => ({ ...prev, [teamId]: data.value || [] }))
        return data.value || []
      }
    } catch (error) {
      addImportLog('error', `Erro ao carregar canais do Team ${teamId}`)
    }
    return []
  }, [teamsAccessToken, addImportLog])

  /**
   * Fetch messages from a channel
   */
  const fetchChannelMessages = useCallback(async (teamId, channelId) => {
    if (!teamsAccessToken) return []

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=50`,
        { headers: { Authorization: `Bearer ${teamsAccessToken}` } }
      )

      if (response.ok) {
        const data = await response.json()
        return data.value || []
      }
    } catch (error) {
      // Silent fail - will return empty array
    }
    return []
  }, [teamsAccessToken])

  // ========== AUTHENTICATION ==========

  /**
   * Start Microsoft OAuth login flow
   */
  const startTeamsAuth = useCallback(() => {
    setTeamsAuthState('authenticating')

    // Clear any previous OAuth data from localStorage
    localStorage.removeItem('teams_oauth_token')
    localStorage.removeItem('teams_oauth_error')
    localStorage.removeItem('teams_oauth_timestamp')

    // Build OAuth URL
    const authUrl = new URL(`${MS_GRAPH_CONFIG.authority}/oauth2/v2.0/authorize`)
    authUrl.searchParams.set('client_id', MS_GRAPH_CONFIG.clientId)
    authUrl.searchParams.set('response_type', 'token')
    authUrl.searchParams.set('redirect_uri', MS_GRAPH_CONFIG.redirectUri)
    authUrl.searchParams.set('scope', MS_GRAPH_CONFIG.scopes.join(' '))
    authUrl.searchParams.set('response_mode', 'fragment')
    authUrl.searchParams.set('state', 'teams_import')

    // Open popup for auth
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    window.open(
      authUrl.toString(),
      'Microsoft Login',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    let authCompleted = false

    // Function to handle successful auth
    const handleAuthSuccess = (token) => {
      if (authCompleted) return
      authCompleted = true

      // Process the token first
      setTeamsAccessToken(token)
      setTeamsAuthState('authenticated')
      fetchTeamsUser(token)
      fetchAvailableTeams(token)
      setImportStep(2)

      // Clean up localStorage much later to avoid any interference
      setTimeout(() => {
        try {
          localStorage.removeItem('ms_teams_oauth_token')
          localStorage.removeItem('ms_teams_oauth_error')
        } catch (e) { /* ignore */ }
      }, 10000)
    }

    // Function to handle auth error
    const handleAuthError = (error) => {
      if (authCompleted) return
      authCompleted = true

      setTeamsAuthState('error')
      addImportLog('error', error || 'Erro de autenticacao')

      setTimeout(() => {
        try {
          localStorage.removeItem('ms_teams_oauth_token')
          localStorage.removeItem('ms_teams_oauth_error')
        } catch (e) { /* ignore */ }
      }, 10000)
    }

    // Only use polling - avoid storage events which can interfere with Supabase
    const checkStorage = setInterval(() => {
      if (authCompleted) {
        clearInterval(checkStorage)
        return
      }

      // Use unique prefixed keys to avoid conflicts
      const token = localStorage.getItem('ms_teams_oauth_token')
      const error = localStorage.getItem('ms_teams_oauth_error')

      if (token) {
        clearInterval(checkStorage)
        handleAuthSuccess(token)
      } else if (error) {
        clearInterval(checkStorage)
        handleAuthError(error)
      }
    }, 500)

    // Timeout after 2 minutes
    setTimeout(() => {
      if (!authCompleted) {
        clearInterval(checkStorage)
        setTeamsAuthState('error')
        addImportLog('error', 'Autenticacao expirou. Tente novamente.')
      }
    }, 120000)
  }, [fetchTeamsUser, fetchAvailableTeams, addImportLog])

  // ========== SELECTION FUNCTIONS ==========

  /**
   * Toggle team selection for import
   */
  const toggleTeamSelection = useCallback(async (team) => {
    const isSelected = selectedTeamsToImport.some(t => t.id === team.id)

    if (isSelected) {
      setSelectedTeamsToImport(prev => prev.filter(t => t.id !== team.id))
      setSelectedChannelsToImport(prev => prev.filter(c => c.teamId !== team.id))
    } else {
      setSelectedTeamsToImport(prev => [...prev, team])
      // Fetch channels for this team if not already loaded
      if (!teamsChannels[team.id]) {
        await fetchTeamChannels(team.id)
      }
    }
  }, [selectedTeamsToImport, teamsChannels, fetchTeamChannels])

  /**
   * Toggle channel selection for import
   */
  const toggleChannelSelection = useCallback((channel, teamId) => {
    const channelWithTeam = { ...channel, teamId }
    const isSelected = selectedChannelsToImport.some(c => c.id === channel.id)

    if (isSelected) {
      setSelectedChannelsToImport(prev => prev.filter(c => c.id !== channel.id))
    } else {
      setSelectedChannelsToImport(prev => [...prev, channelWithTeam])
    }
  }, [selectedChannelsToImport])

  // ========== IMPORT FUNCTIONS ==========

  /**
   * Start the import process for selected channels
   */
  const startTeamsImport = useCallback(async () => {
    if (selectedChannelsToImport.length === 0) {
      throw new Error('Selecione pelo menos um canal para importar')
    }

    setImportStep(4)
    setImportProgress({
      status: 'importing',
      current: 0,
      total: selectedChannelsToImport.length,
      currentItem: ''
    })
    addImportLog('info', `Iniciando importacao de ${selectedChannelsToImport.length} canais...`)

    const importedChannels = []

    for (let i = 0; i < selectedChannelsToImport.length; i++) {
      const channel = selectedChannelsToImport[i]
      const team = selectedTeamsToImport.find(t => t.id === channel.teamId)

      setImportProgress(prev => ({
        ...prev,
        current: i + 1,
        currentItem: `${team?.displayName} > ${channel.displayName}`
      }))

      addImportLog('info', `Importando: ${channel.displayName}`)

      try {
        // Fetch messages from this channel
        const messages = await fetchChannelMessages(channel.teamId, channel.id)

        // Create local channel/project mapping
        const localChannel = {
          id: `imported-${channel.id}`,
          codigo: channel.displayName.substring(0, 10).toUpperCase().replace(/\s/g, ''),
          nome: channel.displayName,
          equipa: 'arch',
          importedFrom: 'teams',
          teamsTeamId: channel.teamId,
          teamsChannelId: channel.id,
          unreadCount: 0,
          lastActivity: new Date().toISOString()
        }

        // Import messages
        let importedPosts = []
        if (messages.length > 0) {
          importedPosts = messages.map(msg => ({
            id: `imported-${msg.id}`,
            conteudo: msg.body?.content?.replace(/<[^>]*>/g, '') || '',
            autor: {
              id: msg.from?.user?.id || 'unknown',
              nome: msg.from?.user?.displayName || 'Utilizador Teams',
              avatar_url: null,
              funcao: 'Importado do Teams'
            },
            created_at: msg.createdDateTime,
            reacoes: [],
            replyCount: msg.replies?.length || 0,
            importedFrom: 'teams',
            canal_id: localChannel.id
          }))

          addImportLog('success', `Importadas ${importedPosts.length} mensagens de "${channel.displayName}"`)
        }

        // Add to imported channels list
        importedChannels.push({
          channel: localChannel,
          messages: importedPosts,
          originalChannel: channel,
          team: team
        })

        // Call the callback if provided
        if (onChannelImported) {
          onChannelImported(localChannel, importedPosts)
        }

        addImportLog('success', `Canal "${channel.displayName}" importado com sucesso`)

      } catch (error) {
        addImportLog('error', `Erro ao importar "${channel.displayName}": ${error.message}`)
      }

      // Small delay between channels
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setImportProgress(prev => ({ ...prev, status: 'complete' }))
    setImportStep(5)
    addImportLog('success', 'Importacao concluida!')

    return importedChannels
  }, [
    selectedChannelsToImport,
    selectedTeamsToImport,
    fetchChannelMessages,
    addImportLog,
    onChannelImported
  ])

  // ========== MODAL FUNCTIONS ==========

  /**
   * Open the Teams import modal
   */
  const openTeamsImport = useCallback(() => {
    setShowTeamsImport(true)
  }, [])

  /**
   * Close the Teams import modal
   */
  const closeTeamsImport = useCallback(() => {
    setShowTeamsImport(false)
    if (importStep === 5) {
      resetTeamsImport()
    }
  }, [importStep, resetTeamsImport])

  /**
   * Go to a specific import step
   */
  const goToStep = useCallback((step) => {
    setImportStep(step)
  }, [])

  // ========== RETURN ==========

  return {
    // Modal state
    showTeamsImport,
    setShowTeamsImport,
    openTeamsImport,
    closeTeamsImport,

    // Authentication state
    teamsAuthState,
    teamsAccessToken,
    teamsUser,

    // Teams and channels data
    availableTeams,
    selectedTeamsToImport,
    teamsChannels,
    selectedChannelsToImport,

    // Import progress
    importProgress,
    importLog,
    importStep,

    // Authentication functions
    startTeamsAuth,

    // Data fetching functions
    fetchTeamsUser,
    fetchAvailableTeams,
    fetchTeamChannels,
    fetchChannelMessages,

    // Selection functions
    toggleTeamSelection,
    toggleChannelSelection,

    // Import functions
    startTeamsImport,
    addImportLog,
    resetTeamsImport,
    goToStep
  }
}

export default useTeamsImport
