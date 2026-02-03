import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { EQUIPAS_GAVINHO, DEFAULT_TOPICS } from '../constants'

// Initial State
const initialState = {
  // Loading
  loading: true,

  // Teams & Channels
  equipas: EQUIPAS_GAVINHO,
  equipaAtiva: null,
  equipasExpanded: {},
  canais: [],
  canalAtivo: null,

  // Topics
  channelTopics: {},
  activeTopic: 'geral',

  // Tabs
  activeTab: 'publicacoes',

  // Messages
  posts: [],
  activeThread: null,
  threadReplies: {},

  // Members
  membros: [],
  onlineUsers: {},

  // Favorites & Muted
  favoriteChannels: [],
  mutedChannels: [],

  // Saved & Pinned
  savedMessages: [],
  channelPinnedMessages: {},

  // Filters
  searchQuery: '',
  activeFilter: 'all',
  searchFilters: {
    author: '',
    dateFrom: '',
    dateTo: '',
    hasAttachments: false,
    hasMentions: false
  },

  // Tags
  messageTags: {},

  // User Status
  userStatus: 'available',
  customStatusMessage: '',
  dndEnabled: false,
  dndSchedule: { start: '22:00', end: '08:00' },

  // Notifications
  soundEnabled: true,
  notificationsEnabled: false,

  // Direct Messages
  directMessages: [],
  activeDM: null,
  dmMessages: {},

  // Calls
  activeCall: null,
  callType: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,

  // Reminders
  reminders: [],

  // Analytics
  channelAnalytics: {
    totalMessages: 0,
    messagesThisWeek: 0,
    activeUsers: 0,
    topContributors: [],
    activityByDay: [],
    popularTopics: []
  },

  // Private & Archived Channels
  privateChannels: [],
  archivedChannels: [],

  // Webhooks
  webhooks: [],

  // AI Assistant
  aiMessages: [],
  aiLoading: false,

  // Activity Log
  activityLog: [],

  // Teams Import
  teamsAuthState: 'idle',
  teamsAccessToken: null,
  teamsUser: null,
  availableTeams: [],
  selectedTeamsToImport: [],
  teamsChannels: {},
  selectedChannelsToImport: [],
  importProgress: { status: 'idle', current: 0, total: 0, currentItem: '' },
  importLog: [],
  importStep: 1
}

// Action Types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_CANAIS: 'SET_CANAIS',
  SET_CANAL_ATIVO: 'SET_CANAL_ATIVO',
  SET_EQUIPA_ATIVA: 'SET_EQUIPA_ATIVA',
  TOGGLE_EQUIPA_EXPANDED: 'TOGGLE_EQUIPA_EXPANDED',
  SET_POSTS: 'SET_POSTS',
  ADD_POST: 'ADD_POST',
  UPDATE_POST: 'UPDATE_POST',
  DELETE_POST: 'DELETE_POST',
  SET_ACTIVE_THREAD: 'SET_ACTIVE_THREAD',
  SET_THREAD_REPLIES: 'SET_THREAD_REPLIES',
  ADD_THREAD_REPLY: 'ADD_THREAD_REPLY',
  SET_MEMBROS: 'SET_MEMBROS',
  SET_ONLINE_USERS: 'SET_ONLINE_USERS',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  SET_ACTIVE_TOPIC: 'SET_ACTIVE_TOPIC',
  SET_CHANNEL_TOPICS: 'SET_CHANNEL_TOPICS',
  ADD_CHANNEL_TOPIC: 'ADD_CHANNEL_TOPIC',
  REMOVE_CHANNEL_TOPIC: 'REMOVE_CHANNEL_TOPIC',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_ACTIVE_FILTER: 'SET_ACTIVE_FILTER',
  SET_SEARCH_FILTERS: 'SET_SEARCH_FILTERS',
  TOGGLE_FAVORITE_CHANNEL: 'TOGGLE_FAVORITE_CHANNEL',
  TOGGLE_MUTE_CHANNEL: 'TOGGLE_MUTE_CHANNEL',
  TOGGLE_SAVE_MESSAGE: 'TOGGLE_SAVE_MESSAGE',
  TOGGLE_PIN_MESSAGE: 'TOGGLE_PIN_MESSAGE',
  SET_MESSAGE_TAGS: 'SET_MESSAGE_TAGS',
  ADD_MESSAGE_TAG: 'ADD_MESSAGE_TAG',
  REMOVE_MESSAGE_TAG: 'REMOVE_MESSAGE_TAG',
  SET_USER_STATUS: 'SET_USER_STATUS',
  TOGGLE_DND: 'TOGGLE_DND',
  SET_DND_SCHEDULE: 'SET_DND_SCHEDULE',
  TOGGLE_SOUND: 'TOGGLE_SOUND',
  SET_NOTIFICATIONS_ENABLED: 'SET_NOTIFICATIONS_ENABLED',
  SET_DIRECT_MESSAGES: 'SET_DIRECT_MESSAGES',
  ADD_DIRECT_MESSAGE: 'ADD_DIRECT_MESSAGE',
  SET_ACTIVE_DM: 'SET_ACTIVE_DM',
  ADD_DM_MESSAGE: 'ADD_DM_MESSAGE',
  START_CALL: 'START_CALL',
  END_CALL: 'END_CALL',
  TOGGLE_MUTE: 'TOGGLE_MUTE',
  TOGGLE_VIDEO: 'TOGGLE_VIDEO',
  TOGGLE_SCREEN_SHARE: 'TOGGLE_SCREEN_SHARE',
  ADD_REMINDER: 'ADD_REMINDER',
  DELETE_REMINDER: 'DELETE_REMINDER',
  SET_CHANNEL_ANALYTICS: 'SET_CHANNEL_ANALYTICS',
  ADD_PRIVATE_CHANNEL: 'ADD_PRIVATE_CHANNEL',
  ARCHIVE_CHANNEL: 'ARCHIVE_CHANNEL',
  RESTORE_CHANNEL: 'RESTORE_CHANNEL',
  ADD_WEBHOOK: 'ADD_WEBHOOK',
  DELETE_WEBHOOK: 'DELETE_WEBHOOK',
  SET_AI_MESSAGES: 'SET_AI_MESSAGES',
  ADD_AI_MESSAGE: 'ADD_AI_MESSAGE',
  SET_AI_LOADING: 'SET_AI_LOADING',
  SET_ACTIVITY_LOG: 'SET_ACTIVITY_LOG',
  ADD_ACTIVITY: 'ADD_ACTIVITY',
  MARK_ACTIVITY_READ: 'MARK_ACTIVITY_READ',
  // Teams Import
  SET_TEAMS_AUTH_STATE: 'SET_TEAMS_AUTH_STATE',
  SET_TEAMS_ACCESS_TOKEN: 'SET_TEAMS_ACCESS_TOKEN',
  SET_TEAMS_USER: 'SET_TEAMS_USER',
  SET_AVAILABLE_TEAMS: 'SET_AVAILABLE_TEAMS',
  SET_SELECTED_TEAMS: 'SET_SELECTED_TEAMS',
  SET_TEAMS_CHANNELS: 'SET_TEAMS_CHANNELS',
  SET_SELECTED_CHANNELS: 'SET_SELECTED_CHANNELS',
  SET_IMPORT_PROGRESS: 'SET_IMPORT_PROGRESS',
  ADD_IMPORT_LOG: 'ADD_IMPORT_LOG',
  SET_IMPORT_STEP: 'SET_IMPORT_STEP',
  RESET_TEAMS_IMPORT: 'RESET_TEAMS_IMPORT',
  HANDLE_REACTION: 'HANDLE_REACTION'
}

// Reducer
function workspaceReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload }

    case ActionTypes.SET_CANAIS:
      return { ...state, canais: action.payload }

    case ActionTypes.SET_CANAL_ATIVO:
      return { ...state, canalAtivo: action.payload, activeThread: null }

    case ActionTypes.SET_EQUIPA_ATIVA:
      return { ...state, equipaAtiva: action.payload }

    case ActionTypes.TOGGLE_EQUIPA_EXPANDED:
      return {
        ...state,
        equipasExpanded: {
          ...state.equipasExpanded,
          [action.payload]: !state.equipasExpanded[action.payload]
        },
        equipaAtiva: action.payload
      }

    case ActionTypes.SET_POSTS:
      return { ...state, posts: action.payload }

    case ActionTypes.ADD_POST:
      return { ...state, posts: [...state.posts, action.payload] }

    case ActionTypes.UPDATE_POST:
      return {
        ...state,
        posts: state.posts.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p)
      }

    case ActionTypes.DELETE_POST:
      return { ...state, posts: state.posts.filter(p => p.id !== action.payload) }

    case ActionTypes.SET_ACTIVE_THREAD:
      return { ...state, activeThread: action.payload }

    case ActionTypes.SET_THREAD_REPLIES:
      return {
        ...state,
        threadReplies: { ...state.threadReplies, [action.payload.postId]: action.payload.replies }
      }

    case ActionTypes.ADD_THREAD_REPLY:
      return {
        ...state,
        threadReplies: {
          ...state.threadReplies,
          [action.payload.postId]: [...(state.threadReplies[action.payload.postId] || []), action.payload.reply]
        },
        posts: state.posts.map(p =>
          p.id === action.payload.postId
            ? { ...p, replyCount: (p.replyCount || 0) + 1 }
            : p
        )
      }

    case ActionTypes.SET_MEMBROS:
      return { ...state, membros: action.payload }

    case ActionTypes.SET_ONLINE_USERS:
      return { ...state, onlineUsers: action.payload }

    case ActionTypes.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload }

    case ActionTypes.SET_ACTIVE_TOPIC:
      return { ...state, activeTopic: action.payload }

    case ActionTypes.SET_CHANNEL_TOPICS:
      return {
        ...state,
        channelTopics: { ...state.channelTopics, [action.payload.channelId]: action.payload.topics }
      }

    case ActionTypes.ADD_CHANNEL_TOPIC:
      return {
        ...state,
        channelTopics: {
          ...state.channelTopics,
          [action.payload.channelId]: [
            ...(state.channelTopics[action.payload.channelId] || DEFAULT_TOPICS),
            action.payload.topic
          ]
        }
      }

    case ActionTypes.REMOVE_CHANNEL_TOPIC:
      return {
        ...state,
        channelTopics: {
          ...state.channelTopics,
          [action.payload.channelId]: (state.channelTopics[action.payload.channelId] || DEFAULT_TOPICS)
            .filter(t => t.id !== action.payload.topicId)
        },
        activeTopic: state.activeTopic === action.payload.topicId ? 'geral' : state.activeTopic
      }

    case ActionTypes.SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload }

    case ActionTypes.SET_ACTIVE_FILTER:
      return { ...state, activeFilter: action.payload }

    case ActionTypes.SET_SEARCH_FILTERS:
      return { ...state, searchFilters: { ...state.searchFilters, ...action.payload } }

    case ActionTypes.TOGGLE_FAVORITE_CHANNEL:
      return {
        ...state,
        favoriteChannels: state.favoriteChannels.includes(action.payload)
          ? state.favoriteChannels.filter(id => id !== action.payload)
          : [...state.favoriteChannels, action.payload]
      }

    case ActionTypes.TOGGLE_MUTE_CHANNEL:
      return {
        ...state,
        mutedChannels: state.mutedChannels.includes(action.payload)
          ? state.mutedChannels.filter(id => id !== action.payload)
          : [...state.mutedChannels, action.payload]
      }

    case ActionTypes.TOGGLE_SAVE_MESSAGE:
      const isSaved = state.savedMessages.some(m => m.id === action.payload.id)
      return {
        ...state,
        savedMessages: isSaved
          ? state.savedMessages.filter(m => m.id !== action.payload.id)
          : [...state.savedMessages, { ...action.payload, savedAt: new Date().toISOString() }]
      }

    case ActionTypes.TOGGLE_PIN_MESSAGE:
      const channelId = state.canalAtivo?.id
      if (!channelId) return state
      const isPinned = state.channelPinnedMessages[channelId]?.some(m => m.id === action.payload.id)
      return {
        ...state,
        channelPinnedMessages: {
          ...state.channelPinnedMessages,
          [channelId]: isPinned
            ? (state.channelPinnedMessages[channelId] || []).filter(m => m.id !== action.payload.id)
            : [...(state.channelPinnedMessages[channelId] || []), { ...action.payload, pinnedAt: new Date().toISOString() }]
        }
      }

    case ActionTypes.ADD_MESSAGE_TAG:
      return {
        ...state,
        messageTags: {
          ...state.messageTags,
          [action.payload.messageId]: [...(state.messageTags[action.payload.messageId] || []), action.payload.tagId]
        }
      }

    case ActionTypes.REMOVE_MESSAGE_TAG:
      return {
        ...state,
        messageTags: {
          ...state.messageTags,
          [action.payload.messageId]: (state.messageTags[action.payload.messageId] || [])
            .filter(t => t !== action.payload.tagId)
        }
      }

    case ActionTypes.SET_USER_STATUS:
      return {
        ...state,
        userStatus: action.payload.status,
        customStatusMessage: action.payload.message || state.customStatusMessage
      }

    case ActionTypes.TOGGLE_DND:
      return {
        ...state,
        dndEnabled: !state.dndEnabled,
        userStatus: !state.dndEnabled ? 'dnd' : 'available'
      }

    case ActionTypes.SET_DND_SCHEDULE:
      return { ...state, dndSchedule: action.payload }

    case ActionTypes.TOGGLE_SOUND:
      return { ...state, soundEnabled: !state.soundEnabled }

    case ActionTypes.SET_NOTIFICATIONS_ENABLED:
      return { ...state, notificationsEnabled: action.payload }

    case ActionTypes.ADD_DIRECT_MESSAGE:
      const existingDM = state.directMessages.find(dm =>
        dm.participants.some(p => p.id === action.payload.user.id)
      )
      if (existingDM) {
        return { ...state, activeDM: existingDM }
      }
      const newDM = {
        id: `dm-${Date.now()}`,
        participants: [action.payload.user],
        lastMessage: null,
        unread: 0,
        created_at: new Date().toISOString()
      }
      return {
        ...state,
        directMessages: [...state.directMessages, newDM],
        activeDM: newDM
      }

    case ActionTypes.SET_ACTIVE_DM:
      return { ...state, activeDM: action.payload }

    case ActionTypes.ADD_DM_MESSAGE:
      const newMsg = {
        id: `msg-${Date.now()}`,
        content: action.payload.content,
        sender: action.payload.sender,
        timestamp: new Date().toISOString()
      }
      return {
        ...state,
        dmMessages: {
          ...state.dmMessages,
          [action.payload.dmId]: [...(state.dmMessages[action.payload.dmId] || []), newMsg]
        },
        directMessages: state.directMessages.map(dm =>
          dm.id === action.payload.dmId ? { ...dm, lastMessage: newMsg } : dm
        )
      }

    case ActionTypes.START_CALL:
      return {
        ...state,
        callType: action.payload.type,
        activeCall: {
          id: `call-${Date.now()}`,
          type: action.payload.type,
          participants: action.payload.participants,
          startTime: new Date(),
          status: 'connecting'
        }
      }

    case ActionTypes.END_CALL:
      return {
        ...state,
        activeCall: null,
        callType: null,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false
      }

    case ActionTypes.TOGGLE_MUTE:
      return { ...state, isMuted: !state.isMuted }

    case ActionTypes.TOGGLE_VIDEO:
      return { ...state, isVideoOff: !state.isVideoOff }

    case ActionTypes.TOGGLE_SCREEN_SHARE:
      return { ...state, isScreenSharing: !state.isScreenSharing }

    case ActionTypes.ADD_REMINDER:
      return {
        ...state,
        reminders: [...state.reminders, {
          id: `reminder-${Date.now()}`,
          message: action.payload.message,
          reminderTime: action.payload.reminderTime,
          created: new Date().toISOString()
        }]
      }

    case ActionTypes.DELETE_REMINDER:
      return {
        ...state,
        reminders: state.reminders.filter(r => r.id !== action.payload)
      }

    case ActionTypes.SET_CHANNEL_ANALYTICS:
      return { ...state, channelAnalytics: action.payload }

    case ActionTypes.ADD_PRIVATE_CHANNEL:
      return {
        ...state,
        privateChannels: [...state.privateChannels, {
          ...action.payload,
          id: `private-${Date.now()}`,
          isPrivate: true,
          created_at: new Date().toISOString()
        }]
      }

    case ActionTypes.ARCHIVE_CHANNEL:
      const channelToArchive = state.canais.find(c => c.id === action.payload)
      if (!channelToArchive) return state
      return {
        ...state,
        archivedChannels: [...state.archivedChannels, { ...channelToArchive, archivedAt: new Date().toISOString() }],
        canais: state.canais.filter(c => c.id !== action.payload),
        canalAtivo: state.canalAtivo?.id === action.payload ? (state.canais[0] || null) : state.canalAtivo
      }

    case ActionTypes.RESTORE_CHANNEL:
      const channelToRestore = state.archivedChannels.find(c => c.id === action.payload)
      if (!channelToRestore) return state
      return {
        ...state,
        canais: [...state.canais, channelToRestore],
        archivedChannels: state.archivedChannels.filter(c => c.id !== action.payload)
      }

    case ActionTypes.ADD_WEBHOOK:
      return {
        ...state,
        webhooks: [...state.webhooks, {
          id: `webhook-${Date.now()}`,
          ...action.payload,
          created_at: new Date().toISOString(),
          active: true
        }]
      }

    case ActionTypes.DELETE_WEBHOOK:
      return {
        ...state,
        webhooks: state.webhooks.filter(w => w.id !== action.payload)
      }

    case ActionTypes.ADD_AI_MESSAGE:
      return {
        ...state,
        aiMessages: [...state.aiMessages, { ...action.payload, timestamp: new Date().toISOString() }]
      }

    case ActionTypes.SET_AI_LOADING:
      return { ...state, aiLoading: action.payload }

    case ActionTypes.ADD_ACTIVITY:
      return {
        ...state,
        activityLog: [...state.activityLog, {
          id: `activity-${Date.now()}`,
          ...action.payload,
          unread: true,
          timestamp: new Date().toISOString()
        }]
      }

    case ActionTypes.MARK_ACTIVITY_READ:
      return {
        ...state,
        activityLog: state.activityLog.map(a =>
          a.id === action.payload ? { ...a, unread: false } : a
        )
      }

    // Teams Import Actions
    case ActionTypes.SET_TEAMS_AUTH_STATE:
      return { ...state, teamsAuthState: action.payload }

    case ActionTypes.SET_TEAMS_ACCESS_TOKEN:
      return { ...state, teamsAccessToken: action.payload }

    case ActionTypes.SET_TEAMS_USER:
      return { ...state, teamsUser: action.payload }

    case ActionTypes.SET_AVAILABLE_TEAMS:
      return { ...state, availableTeams: action.payload }

    case ActionTypes.SET_SELECTED_TEAMS:
      return { ...state, selectedTeamsToImport: action.payload }

    case ActionTypes.SET_TEAMS_CHANNELS:
      return {
        ...state,
        teamsChannels: { ...state.teamsChannels, [action.payload.teamId]: action.payload.channels }
      }

    case ActionTypes.SET_SELECTED_CHANNELS:
      return { ...state, selectedChannelsToImport: action.payload }

    case ActionTypes.SET_IMPORT_PROGRESS:
      return { ...state, importProgress: action.payload }

    case ActionTypes.ADD_IMPORT_LOG:
      return {
        ...state,
        importLog: [...state.importLog, {
          id: Date.now(),
          ...action.payload,
          timestamp: new Date().toISOString()
        }]
      }

    case ActionTypes.SET_IMPORT_STEP:
      return { ...state, importStep: action.payload }

    case ActionTypes.RESET_TEAMS_IMPORT:
      return {
        ...state,
        teamsAuthState: 'idle',
        teamsAccessToken: null,
        teamsUser: null,
        availableTeams: [],
        selectedTeamsToImport: [],
        teamsChannels: {},
        selectedChannelsToImport: [],
        importProgress: { status: 'idle', current: 0, total: 0, currentItem: '' },
        importLog: [],
        importStep: 1
      }

    case ActionTypes.HANDLE_REACTION:
      const { postId, emoji, isReply, replyId, userName } = action.payload
      if (isReply && replyId) {
        return {
          ...state,
          threadReplies: {
            ...state.threadReplies,
            [postId]: state.threadReplies[postId]?.map(reply => {
              if (reply.id === replyId) {
                const existingReaction = reply.reacoes?.find(r => r.emoji === emoji)
                if (existingReaction) {
                  return { ...reply, reacoes: reply.reacoes.filter(r => r.emoji !== emoji) }
                }
                return {
                  ...reply,
                  reacoes: [...(reply.reacoes || []), { emoji, users: [userName] }]
                }
              }
              return reply
            })
          }
        }
      }
      return {
        ...state,
        posts: state.posts.map(post => {
          if (post.id === postId) {
            const existingReaction = post.reacoes?.find(r => r.emoji === emoji)
            if (existingReaction) {
              const updatedUsers = existingReaction.users.includes(userName)
                ? existingReaction.users.filter(u => u !== userName)
                : [...existingReaction.users, userName]
              if (updatedUsers.length === 0) {
                return { ...post, reacoes: post.reacoes.filter(r => r.emoji !== emoji) }
              }
              return {
                ...post,
                reacoes: post.reacoes.map(r => r.emoji === emoji ? { ...r, users: updatedUsers } : r)
              }
            }
            return {
              ...post,
              reacoes: [...(post.reacoes || []), { emoji, users: [userName] }]
            }
          }
          return post
        })
      }

    default:
      return state
  }
}

// Context
const WorkspaceContext = createContext(null)

// Provider
export function WorkspaceProvider({ children }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const presenceIntervalRef = useRef(null)

  // Actions
  const actions = {
    setLoading: (loading) => dispatch({ type: ActionTypes.SET_LOADING, payload: loading }),
    setCanais: (canais) => dispatch({ type: ActionTypes.SET_CANAIS, payload: canais }),
    setCanalAtivo: (canal) => {
      dispatch({ type: ActionTypes.SET_CANAL_ATIVO, payload: canal })
      if (canal) setSearchParams({ canal: canal.codigo })
    },
    setEquipaAtiva: (equipa) => dispatch({ type: ActionTypes.SET_EQUIPA_ATIVA, payload: equipa }),
    toggleEquipaExpanded: (equipaId) => dispatch({ type: ActionTypes.TOGGLE_EQUIPA_EXPANDED, payload: equipaId }),
    setPosts: (posts) => dispatch({ type: ActionTypes.SET_POSTS, payload: posts }),
    addPost: (post) => dispatch({ type: ActionTypes.ADD_POST, payload: post }),
    updatePost: (post) => dispatch({ type: ActionTypes.UPDATE_POST, payload: post }),
    deletePost: (postId) => dispatch({ type: ActionTypes.DELETE_POST, payload: postId }),
    setActiveThread: (thread) => dispatch({ type: ActionTypes.SET_ACTIVE_THREAD, payload: thread }),
    setThreadReplies: (postId, replies) => dispatch({ type: ActionTypes.SET_THREAD_REPLIES, payload: { postId, replies } }),
    addThreadReply: (postId, reply) => dispatch({ type: ActionTypes.ADD_THREAD_REPLY, payload: { postId, reply } }),
    setMembros: (membros) => dispatch({ type: ActionTypes.SET_MEMBROS, payload: membros }),
    setOnlineUsers: (users) => dispatch({ type: ActionTypes.SET_ONLINE_USERS, payload: users }),
    setActiveTab: (tab) => dispatch({ type: ActionTypes.SET_ACTIVE_TAB, payload: tab }),
    setActiveTopic: (topic) => dispatch({ type: ActionTypes.SET_ACTIVE_TOPIC, payload: topic }),
    addChannelTopic: (channelId, topic) => dispatch({ type: ActionTypes.ADD_CHANNEL_TOPIC, payload: { channelId, topic } }),
    removeChannelTopic: (channelId, topicId) => dispatch({ type: ActionTypes.REMOVE_CHANNEL_TOPIC, payload: { channelId, topicId } }),
    setSearchQuery: (query) => dispatch({ type: ActionTypes.SET_SEARCH_QUERY, payload: query }),
    setActiveFilter: (filter) => dispatch({ type: ActionTypes.SET_ACTIVE_FILTER, payload: filter }),
    setSearchFilters: (filters) => dispatch({ type: ActionTypes.SET_SEARCH_FILTERS, payload: filters }),
    toggleFavoriteChannel: (channelId) => dispatch({ type: ActionTypes.TOGGLE_FAVORITE_CHANNEL, payload: channelId }),
    toggleMuteChannel: (channelId) => dispatch({ type: ActionTypes.TOGGLE_MUTE_CHANNEL, payload: channelId }),
    toggleSaveMessage: (message) => dispatch({ type: ActionTypes.TOGGLE_SAVE_MESSAGE, payload: message }),
    togglePinMessage: (message) => dispatch({ type: ActionTypes.TOGGLE_PIN_MESSAGE, payload: message }),
    addMessageTag: (messageId, tagId) => dispatch({ type: ActionTypes.ADD_MESSAGE_TAG, payload: { messageId, tagId } }),
    removeMessageTag: (messageId, tagId) => dispatch({ type: ActionTypes.REMOVE_MESSAGE_TAG, payload: { messageId, tagId } }),
    setUserStatus: (status, message) => dispatch({ type: ActionTypes.SET_USER_STATUS, payload: { status, message } }),
    toggleDnd: () => dispatch({ type: ActionTypes.TOGGLE_DND }),
    setDndSchedule: (schedule) => dispatch({ type: ActionTypes.SET_DND_SCHEDULE, payload: schedule }),
    toggleSound: () => dispatch({ type: ActionTypes.TOGGLE_SOUND }),
    setNotificationsEnabled: (enabled) => dispatch({ type: ActionTypes.SET_NOTIFICATIONS_ENABLED, payload: enabled }),
    startDM: (user) => dispatch({ type: ActionTypes.ADD_DIRECT_MESSAGE, payload: { user } }),
    setActiveDM: (dm) => dispatch({ type: ActionTypes.SET_ACTIVE_DM, payload: dm }),
    sendDMMessage: (dmId, content, sender) => dispatch({ type: ActionTypes.ADD_DM_MESSAGE, payload: { dmId, content, sender } }),
    startCall: (type, participants) => dispatch({ type: ActionTypes.START_CALL, payload: { type, participants } }),
    endCall: () => dispatch({ type: ActionTypes.END_CALL }),
    toggleMute: () => dispatch({ type: ActionTypes.TOGGLE_MUTE }),
    toggleVideo: () => dispatch({ type: ActionTypes.TOGGLE_VIDEO }),
    toggleScreenShare: () => dispatch({ type: ActionTypes.TOGGLE_SCREEN_SHARE }),
    addReminder: (message, reminderTime) => dispatch({ type: ActionTypes.ADD_REMINDER, payload: { message, reminderTime } }),
    deleteReminder: (reminderId) => dispatch({ type: ActionTypes.DELETE_REMINDER, payload: reminderId }),
    setChannelAnalytics: (analytics) => dispatch({ type: ActionTypes.SET_CHANNEL_ANALYTICS, payload: analytics }),
    addPrivateChannel: (channel) => dispatch({ type: ActionTypes.ADD_PRIVATE_CHANNEL, payload: channel }),
    archiveChannel: (channelId) => dispatch({ type: ActionTypes.ARCHIVE_CHANNEL, payload: channelId }),
    restoreChannel: (channelId) => dispatch({ type: ActionTypes.RESTORE_CHANNEL, payload: channelId }),
    addWebhook: (webhook) => dispatch({ type: ActionTypes.ADD_WEBHOOK, payload: webhook }),
    deleteWebhook: (webhookId) => dispatch({ type: ActionTypes.DELETE_WEBHOOK, payload: webhookId }),
    addAiMessage: (message) => dispatch({ type: ActionTypes.ADD_AI_MESSAGE, payload: message }),
    setAiLoading: (loading) => dispatch({ type: ActionTypes.SET_AI_LOADING, payload: loading }),
    addActivity: (activity) => dispatch({ type: ActionTypes.ADD_ACTIVITY, payload: activity }),
    markActivityRead: (activityId) => dispatch({ type: ActionTypes.MARK_ACTIVITY_READ, payload: activityId }),
    handleReaction: (postId, emoji, isReply = false, replyId = null) => {
      dispatch({
        type: ActionTypes.HANDLE_REACTION,
        payload: { postId, emoji, isReply, replyId, userName: profile?.nome || 'Eu' }
      })
    },
    // Teams Import
    setTeamsAuthState: (authState) => dispatch({ type: ActionTypes.SET_TEAMS_AUTH_STATE, payload: authState }),
    setTeamsAccessToken: (token) => dispatch({ type: ActionTypes.SET_TEAMS_ACCESS_TOKEN, payload: token }),
    setTeamsUser: (user) => dispatch({ type: ActionTypes.SET_TEAMS_USER, payload: user }),
    setAvailableTeams: (teams) => dispatch({ type: ActionTypes.SET_AVAILABLE_TEAMS, payload: teams }),
    setSelectedTeams: (teams) => dispatch({ type: ActionTypes.SET_SELECTED_TEAMS, payload: teams }),
    setTeamsChannels: (teamId, channels) => dispatch({ type: ActionTypes.SET_TEAMS_CHANNELS, payload: { teamId, channels } }),
    setSelectedChannels: (channels) => dispatch({ type: ActionTypes.SET_SELECTED_CHANNELS, payload: channels }),
    setImportProgress: (progress) => dispatch({ type: ActionTypes.SET_IMPORT_PROGRESS, payload: progress }),
    addImportLog: (type, message) => dispatch({ type: ActionTypes.ADD_IMPORT_LOG, payload: { type, message } }),
    setImportStep: (step) => dispatch({ type: ActionTypes.SET_IMPORT_STEP, payload: step }),
    resetTeamsImport: () => dispatch({ type: ActionTypes.RESET_TEAMS_IMPORT })
  }

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      actions.setLoading(true)
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

        actions.setCanais(canaisComEquipa)

        // Check URL for canal parameter
        const canalParam = searchParams.get('canal')
        const tabParam = searchParams.get('tab')

        if (canalParam) {
          const canalFromUrl = canaisComEquipa.find(c =>
            c.codigo === canalParam || c.id === canalParam
          )
          if (canalFromUrl) {
            actions.setEquipaAtiva(canalFromUrl.equipa)
            dispatch({ type: ActionTypes.TOGGLE_EQUIPA_EXPANDED, payload: canalFromUrl.equipa })
            actions.setCanalAtivo(canalFromUrl)
            if (tabParam) actions.setActiveTab(tabParam)
            actions.setLoading(false)
            return
          }
        }

        // Default: select first canal
        if (canaisComEquipa.length > 0) {
          const primeiraEquipa = canaisComEquipa[0].equipa
          actions.setEquipaAtiva(primeiraEquipa)
          dispatch({ type: ActionTypes.TOGGLE_EQUIPA_EXPANDED, payload: primeiraEquipa })
          actions.setCanalAtivo(canaisComEquipa[0])
        }
      }

      if (membrosRes.data) {
        actions.setMembros(membrosRes.data)
      }
    } catch (err) {
      // Silent fail - will show empty state
    } finally {
      actions.setLoading(false)
    }
  }, [searchParams])

  // Load posts for channel
  const loadPosts = useCallback(async (canalId) => {
    try {
      const { data, error } = await supabase
        .from('chat_mensagens')
        .select(`*, autor:autor_id(id, nome, avatar_url, funcao)`)
        .eq('canal_id', canalId)
        .is('parent_id', null)
        .eq('eliminado', false)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        actions.setPosts([])
        return
      }

      if (data && data.length > 0) {
        const postsWithReplies = await Promise.all(data.map(async (post) => {
          const { count } = await supabase
            .from('chat_mensagens')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', post.id)
            .eq('eliminado', false)

          let attachments = []
          if (post.ficheiro_url) {
            const isImage = post.tipo === 'imagem' || post.ficheiro_nome?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
            attachments.push({
              name: post.ficheiro_nome || 'Ficheiro',
              url: post.ficheiro_url,
              type: isImage ? 'image' : 'file',
              size: post.ficheiro_tamanho ? `${Math.round(post.ficheiro_tamanho / 1024)} KB` : ''
            })
          }

          const { data: extraAnexos } = await supabase
            .from('chat_anexos')
            .select('*')
            .eq('mensagem_id', post.id)

          if (extraAnexos && extraAnexos.length > 0) {
            extraAnexos.forEach(anexo => {
              const isImage = anexo.nome?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
              attachments.push({
                name: anexo.nome || 'Ficheiro',
                url: anexo.url,
                type: isImage ? 'image' : 'file',
                size: anexo.tamanho ? `${Math.round(anexo.tamanho / 1024)} KB` : ''
              })
            })
          }

          return { ...post, replyCount: count || 0, attachments: attachments.length > 0 ? attachments : undefined }
        }))

        actions.setPosts(postsWithReplies)
      } else {
        actions.setPosts([])
      }
    } catch (err) {
      actions.setPosts([])
    }
  }, [])

  // Load thread replies
  const loadThreadReplies = useCallback(async (postId) => {
    if (state.threadReplies[postId]) return

    try {
      const { data } = await supabase
        .from('chat_mensagens')
        .select(`*, autor:autor_id(id, nome, avatar_url, funcao)`)
        .eq('parent_id', postId)
        .eq('eliminado', false)
        .order('created_at', { ascending: true })

      if (data) {
        actions.setThreadReplies(postId, data)
      }
    } catch (err) {
      // Silent fail
    }
  }, [state.threadReplies])

  // Update presence
  const updateMyPresence = useCallback(async () => {
    if (!profile?.id) return

    try {
      await supabase.from('chat_presenca').upsert({
        utilizador_id: profile.id,
        estado: 'online',
        ultima_actividade: new Date().toISOString(),
        dispositivo: 'web'
      }, { onConflict: 'utilizador_id' })
    } catch (err) {
      // Silent fail
    }
  }, [profile?.id])

  // Load online users
  const loadOnlineUsers = useCallback(async () => {
    if (!state.membros.length) return

    try {
      const { data } = await supabase
        .from('chat_presenca')
        .select('utilizador_id, estado, ultima_actividade')
        .in('utilizador_id', state.membros.map(m => m.id))

      const map = {}
      data?.forEach(p => {
        const lastActive = new Date(p.ultima_actividade)
        const diffMinutes = (Date.now() - lastActive.getTime()) / 60000

        if (diffMinutes > 15) {
          map[p.utilizador_id] = 'offline'
        } else if (diffMinutes > 5) {
          map[p.utilizador_id] = 'away'
        } else {
          map[p.utilizador_id] = p.estado
        }
      })

      actions.setOnlineUsers(map)
    } catch (err) {
      // Silent fail
    }
  }, [state.membros])

  // Subscribe to channel
  const subscribeToChannel = useCallback((canalId) => {
    const channel = supabase
      .channel(`chat-${canalId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensagens',
        filter: `canal_id=eq.${canalId}`
      }, (payload) => {
        if (!payload.new.parent_id) {
          actions.addPost({ ...payload.new, replyCount: 0 })
        } else if (state.activeThread?.id === payload.new.parent_id) {
          actions.addThreadReply(payload.new.parent_id, payload.new)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [state.activeThread?.id])

  // Effects
  useEffect(() => {
    loadData()
    updateMyPresence()
    presenceIntervalRef.current = setInterval(updateMyPresence, 60000)

    return () => {
      clearInterval(presenceIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (state.canalAtivo) {
      loadPosts(state.canalAtivo.id)
      const unsubscribe = subscribeToChannel(state.canalAtivo.id)
      return unsubscribe
    }
  }, [state.canalAtivo?.id])

  useEffect(() => {
    if (state.membros.length > 0) {
      loadOnlineUsers()
      const interval = setInterval(loadOnlineUsers, 30000)
      return () => clearInterval(interval)
    }
  }, [state.membros])

  // Utility functions
  const utils = {
    getEquipaCanais: (equipaId) => state.canais.filter(c => c.equipa === equipaId),
    isFavoriteChannel: (channelId) => state.favoriteChannels.includes(channelId),
    isMutedChannel: (channelId) => state.mutedChannels.includes(channelId),
    isMessageSaved: (postId) => state.savedMessages.some(m => m.id === postId),
    isMessagePinned: (postId) => state.canalAtivo ? state.channelPinnedMessages[state.canalAtivo.id]?.some(m => m.id === postId) : false,
    getMessageTags: (messageId) => (state.messageTags[messageId] || []),
    isUserOnline: (userId) => state.onlineUsers[userId] === 'online',
    getPresenceColor: (userId) => {
      const estado = state.onlineUsers[userId]
      if (estado === 'online') return '#22c55e'
      if (estado === 'away') return '#eab308'
      return '#9ca3af'
    },
    getCurrentChannelTopics: () => state.canalAtivo ? (state.channelTopics[state.canalAtivo.id] || DEFAULT_TOPICS) : DEFAULT_TOPICS,
    getCurrentChannelPinnedMessages: () => state.canalAtivo ? (state.channelPinnedMessages[state.canalAtivo.id] || []) : [],
    getUnreadActivityCount: () => state.activityLog.filter(a => a.unread).length,
    getMentionCount: () => state.activityLog.filter(a => a.type === 'mention' && a.unread).length,
    getTotalUnreadCount: () => state.canais.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    sortedCanais: [...state.canais].sort((a, b) => {
      const aFav = state.favoriteChannels.includes(a.id)
      const bFav = state.favoriteChannels.includes(b.id)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1
      return 0
    }),
    loadPosts,
    loadThreadReplies,
    updateMyPresence,
    loadOnlineUsers
  }

  return (
    <WorkspaceContext.Provider value={{ state, actions, utils, profile }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

// Hook
export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}

export { ActionTypes }
