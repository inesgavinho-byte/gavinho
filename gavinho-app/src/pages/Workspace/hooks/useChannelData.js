// =====================================================
// USE CHANNEL DATA HOOK
// Gestão de canais, tópicos, equipas
// =====================================================

import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { EQUIPAS_GAVINHO, DEFAULT_TOPICS } from '../utils/constants'

export default function useChannelData() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)

  // Equipas
  const [equipas] = useState(EQUIPAS_GAVINHO)
  const [equipaAtiva, setEquipaAtiva] = useState(null)
  const [equipasExpanded, setEquipasExpanded] = useState({})

  // Canais
  const [canais, setCanais] = useState([])
  const [canalAtivo, setCanalAtivo] = useState(null)

  // Tópicos
  const [channelTopics, setChannelTopics] = useState({})
  const [activeTopic, setActiveTopic] = useState('geral')
  const [showAddTopic, setShowAddTopic] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')

  // Tab ativa
  const [activeTab, setActiveTab] = useState('publicacoes')

  // Membros
  const [membros, setMembros] = useState([])

  // Favoritos
  const [favoriteChannels, setFavoriteChannels] = useState([])

  // ========== LOAD DATA ==========
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [projetosRes, membrosRes] = await Promise.all([
        supabase
          .from('projetos')
          .select('id, codigo, nome, tipologia, status')
          .eq('arquivado', false)
          .order('codigo', { ascending: false }),
        supabase
          .from('utilizadores')
          .select('id, nome, avatar_url, funcao')
          .eq('ativo', true)
          .order('nome')
      ])

      if (projetosRes.data) {
        const canaisComEquipa = projetosRes.data.map(p => ({
          ...p,
          equipa: p.tipologia?.toLowerCase().includes('hosp') ? 'hosp' :
                  p.tipologia?.toLowerCase().includes('signature') ? 'signature' : 'arch',
          unreadCount: 0,
          lastActivity: new Date().toISOString()
        }))

        setCanais(canaisComEquipa)

        // Check URL for canal parameter
        const canalParam = searchParams.get('canal')
        const tabParam = searchParams.get('tab')

        if (canalParam) {
          const canalFromUrl = canaisComEquipa.find(c =>
            c.codigo === canalParam || c.id === canalParam
          )
          if (canalFromUrl) {
            setEquipaAtiva(canalFromUrl.equipa)
            setEquipasExpanded({ [canalFromUrl.equipa]: true })
            setCanalAtivo(canalFromUrl)
            if (tabParam) setActiveTab(tabParam)
            return canaisComEquipa
          }
        }

        // Default: select first canal
        if (canaisComEquipa.length > 0) {
          const primeiraEquipa = canaisComEquipa[0].equipa
          setEquipaAtiva(primeiraEquipa)
          setEquipasExpanded({ [primeiraEquipa]: true })
          setCanalAtivo(canaisComEquipa[0])
        }

        return canaisComEquipa
      }

      if (membrosRes.data) {
        setMembros(membrosRes.data)
      }

      return []
    } catch (err) {
      // Silent error - could be sent to error tracking service in production
      return []
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  // ========== LOAD TOPICS ==========
  const loadTopics = useCallback(async (canalId) => {
    if (!canalId) return

    try {
      const { data } = await supabase
        .from('chat_topicos')
        .select('*')
        .eq('canal_id', canalId)
        .eq('arquivado', false)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setChannelTopics(prev => ({
          ...prev,
          [canalId]: data
        }))
        // Set first topic as active if 'geral' not found
        const geralTopic = data.find(t => t.nome.toLowerCase() === 'geral')
        setActiveTopic(geralTopic ? geralTopic.id : data[0].id)
      } else {
        // Create default topics if none exist
        const defaultTopics = DEFAULT_TOPICS.map(nome => ({
          canal_id: canalId,
          nome,
          created_at: new Date().toISOString()
        }))

        const { data: created } = await supabase
          .from('chat_topicos')
          .insert(defaultTopics)
          .select()

        if (created) {
          setChannelTopics(prev => ({
            ...prev,
            [canalId]: created
          }))
          const geralTopic = created.find(t => t.nome.toLowerCase() === 'geral')
          setActiveTopic(geralTopic ? geralTopic.id : created[0].id)
        }
      }
    } catch (err) {
      // Silent error - could be sent to error tracking service in production
    }
  }, [])

  // ========== ADD TOPIC ==========
  const addTopic = useCallback(async (canalId, topicName) => {
    if (!topicName.trim() || !canalId) return false

    try {
      const { data, error } = await supabase
        .from('chat_topicos')
        .insert({
          canal_id: canalId,
          nome: topicName.trim()
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setChannelTopics(prev => ({
          ...prev,
          [canalId]: [...(prev[canalId] || []), data]
        }))
        setNewTopicName('')
        setShowAddTopic(false)
        return true
      }
      return false
    } catch (err) {
      // Silent error - could be sent to error tracking service in production
      return false
    }
  }, [])

  // ========== RENAME TOPIC ==========
  const renameTopic = useCallback(async (topicId, newName) => {
    if (!topicId || !newName.trim()) return false

    try {
      const { error } = await supabase
        .from('chat_topicos')
        .update({ nome: newName.trim() })
        .eq('id', topicId)

      if (error) throw error

      // Update local state
      setChannelTopics(prev => {
        const updated = { ...prev }
        for (const canalId in updated) {
          updated[canalId] = updated[canalId].map(topic =>
            topic.id === topicId ? { ...topic, nome: newName.trim() } : topic
          )
        }
        return updated
      })
      return true
    } catch (err) {
      console.error('Error renaming topic:', err)
      return false
    }
  }, [])

  // ========== REMOVE TOPIC ==========
  const removeTopic = useCallback(async (topicId, canalId) => {
    if (!topicId) return false

    try {
      const { error } = await supabase
        .from('chat_topicos')
        .delete()
        .eq('id', topicId)

      if (error) throw error

      // Update local state
      setChannelTopics(prev => ({
        ...prev,
        [canalId]: (prev[canalId] || []).filter(topic => topic.id !== topicId)
      }))

      // Reset to 'geral' if the removed topic was active
      if (activeTopic === topicId) {
        setActiveTopic('geral')
      }

      return true
    } catch (err) {
      console.error('Error removing topic:', err)
      return false
    }
  }, [activeTopic])

  // ========== EQUIPA HELPERS ==========
  const getEquipaCanais = useCallback((equipaId) => {
    return canais.filter(c => c.equipa === equipaId)
  }, [canais])

  const toggleEquipa = useCallback((equipaId) => {
    setEquipasExpanded(prev => ({ ...prev, [equipaId]: !prev[equipaId] }))
    setEquipaAtiva(equipaId)
  }, [])

  // ========== CANAL SELECTION ==========
  const selectCanal = useCallback((canal) => {
    setCanalAtivo(canal)
    setSearchParams({ canal: canal.codigo })
  }, [setSearchParams])

  // ========== FAVORITES ==========
  const toggleFavorite = useCallback((canalId) => {
    setFavoriteChannels(prev =>
      prev.includes(canalId)
        ? prev.filter(id => id !== canalId)
        : [...prev, canalId]
    )
  }, [])

  const isFavorite = useCallback((canalId) => {
    return favoriteChannels.includes(canalId)
  }, [favoriteChannels])

  // ========== CHANNEL LINK ==========
  const getChannelLink = useCallback((canal) => {
    return `${window.location.origin}/chat?canal=${canal.codigo}`
  }, [])

  return {
    // State
    loading,
    equipas,
    equipaAtiva,
    equipasExpanded,
    canais,
    canalAtivo,
    channelTopics,
    activeTopic,
    showAddTopic,
    newTopicName,
    activeTab,
    membros,
    favoriteChannels,

    // Setters
    setEquipaAtiva,
    setEquipasExpanded,
    setCanalAtivo,
    setActiveTopic,
    setShowAddTopic,
    setNewTopicName,
    setActiveTab,
    setMembros,

    // Actions
    loadData,
    loadTopics,
    addTopic,
    renameTopic,
    removeTopic,
    getEquipaCanais,
    toggleEquipa,
    selectCanal,
    toggleFavorite,
    isFavorite,
    getChannelLink
  }
}
