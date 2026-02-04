// =====================================================
// WORKSPACE CONTEXT - Consolidated State Management
// =====================================================

import React, { createContext, useContext, useReducer, useCallback } from 'react'

// Initial State
const initialState = {
  // UI Panels & Modals
  ui: {
    showSearch: false,
    showSavedMessages: false,
    showFilters: false,
    showAdvancedSearch: false,
    showCreateTaskModal: false,
    showForwardModal: false,
    showKeyboardShortcuts: false,
    showActivityLog: false,
    showDMPanel: false,
    showNewDMModal: false,
    showCallModal: false,
    showScheduleMeetingModal: false,
    showAIAssistant: false,
    showCreatePrivateChannel: false,
    showArchivedChannels: false,
    showAnalytics: false,
    showProfileCard: null,
    showExportModal: false,
    showWebhookSettings: false,
    showEmailSettings: false,
    isDragging: false,
    linkCopied: false
  },

  // Search & Filters
  search: {
    query: '',
    activeFilter: 'all',
    filterByTag: null,
    filters: {
      dateFrom: '',
      dateTo: '',
      author: '',
      hasAttachments: false
    }
  },

  // Activity
  activity: {
    filter: 'all',
    log: []
  },

  // Direct Messages
  dm: {
    messages: [],
    activeDM: null,
    dmMessages: {}
  },

  // Calls
  call: {
    type: null,
    active: null,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false
  },

  // Meeting
  meeting: {
    title: '',
    date: '',
    time: '',
    participants: []
  },

  // AI Assistant
  ai: {
    messages: [],
    input: '',
    isLoading: false
  },

  // Private Channels
  privateChannels: {
    list: [],
    newChannel: { name: '', members: [] },
    archived: []
  },

  // Analytics
  analytics: {
    messagesCount: 0,
    activeMembers: 0,
    filesShared: 0,
    reactionsCount: 0
  },

  // Settings
  settings: {
    notificationsEnabled: false,
    notificationPermission: 'default',
    emailSyncEnabled: false,
    emailDigestFrequency: 'daily'
  },

  // Export
  export: {
    format: 'pdf',
    dateRange: { from: '', to: '' }
  },

  // Webhooks
  webhooks: {
    list: [],
    newWebhook: { url: '', events: [] }
  },

  // Task from message
  taskFromMessage: null,
  messageToForward: null,
  expandedProfile: null,
  pinnedMessages: []
}

// Action Types
const ActionTypes = {
  // UI Actions
  TOGGLE_UI: 'TOGGLE_UI',
  SET_UI: 'SET_UI',
  CLOSE_ALL_MODALS: 'CLOSE_ALL_MODALS',

  // Search Actions
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_SEARCH_FILTER: 'SET_SEARCH_FILTER',
  SET_SEARCH_FILTERS: 'SET_SEARCH_FILTERS',
  CLEAR_SEARCH: 'CLEAR_SEARCH',

  // Activity Actions
  SET_ACTIVITY_FILTER: 'SET_ACTIVITY_FILTER',
  SET_ACTIVITY_LOG: 'SET_ACTIVITY_LOG',
  ADD_ACTIVITY: 'ADD_ACTIVITY',

  // DM Actions
  SET_ACTIVE_DM: 'SET_ACTIVE_DM',
  SET_DM_MESSAGES: 'SET_DM_MESSAGES',
  ADD_DM_MESSAGE: 'ADD_DM_MESSAGE',

  // Call Actions
  START_CALL: 'START_CALL',
  END_CALL: 'END_CALL',
  TOGGLE_MUTE: 'TOGGLE_MUTE',
  TOGGLE_VIDEO: 'TOGGLE_VIDEO',
  TOGGLE_SCREEN_SHARE: 'TOGGLE_SCREEN_SHARE',

  // AI Actions
  SET_AI_INPUT: 'SET_AI_INPUT',
  ADD_AI_MESSAGE: 'ADD_AI_MESSAGE',
  SET_AI_LOADING: 'SET_AI_LOADING',
  CLEAR_AI_MESSAGES: 'CLEAR_AI_MESSAGES',

  // Meeting Actions
  SET_MEETING_DETAILS: 'SET_MEETING_DETAILS',
  CLEAR_MEETING: 'CLEAR_MEETING',

  // Analytics Actions
  SET_ANALYTICS: 'SET_ANALYTICS',

  // Settings Actions
  SET_SETTING: 'SET_SETTING',

  // Export Actions
  SET_EXPORT_FORMAT: 'SET_EXPORT_FORMAT',
  SET_EXPORT_DATE_RANGE: 'SET_EXPORT_DATE_RANGE',

  // Webhook Actions
  SET_WEBHOOKS: 'SET_WEBHOOKS',
  ADD_WEBHOOK: 'ADD_WEBHOOK',
  REMOVE_WEBHOOK: 'REMOVE_WEBHOOK',

  // Other Actions
  SET_TASK_FROM_MESSAGE: 'SET_TASK_FROM_MESSAGE',
  SET_MESSAGE_TO_FORWARD: 'SET_MESSAGE_TO_FORWARD',
  SET_PINNED_MESSAGES: 'SET_PINNED_MESSAGES',
  TOGGLE_PIN_MESSAGE: 'TOGGLE_PIN_MESSAGE',

  // Bulk Actions
  RESET_STATE: 'RESET_STATE'
}

// Reducer
const workspaceReducer = (state, action) => {
  switch (action.type) {
    // UI Actions
    case ActionTypes.TOGGLE_UI:
      return {
        ...state,
        ui: {
          ...state.ui,
          [action.payload]: !state.ui[action.payload]
        }
      }

    case ActionTypes.SET_UI:
      return {
        ...state,
        ui: {
          ...state.ui,
          [action.payload.key]: action.payload.value
        }
      }

    case ActionTypes.CLOSE_ALL_MODALS:
      return {
        ...state,
        ui: {
          ...initialState.ui,
          isDragging: state.ui.isDragging
        }
      }

    // Search Actions
    case ActionTypes.SET_SEARCH_QUERY:
      return {
        ...state,
        search: { ...state.search, query: action.payload }
      }

    case ActionTypes.SET_SEARCH_FILTER:
      return {
        ...state,
        search: { ...state.search, activeFilter: action.payload }
      }

    case ActionTypes.SET_SEARCH_FILTERS:
      return {
        ...state,
        search: {
          ...state.search,
          filters: { ...state.search.filters, ...action.payload }
        }
      }

    case ActionTypes.CLEAR_SEARCH:
      return {
        ...state,
        search: initialState.search
      }

    // Activity Actions
    case ActionTypes.SET_ACTIVITY_FILTER:
      return {
        ...state,
        activity: { ...state.activity, filter: action.payload }
      }

    case ActionTypes.SET_ACTIVITY_LOG:
      return {
        ...state,
        activity: { ...state.activity, log: action.payload }
      }

    case ActionTypes.ADD_ACTIVITY:
      return {
        ...state,
        activity: {
          ...state.activity,
          log: [action.payload, ...state.activity.log]
        }
      }

    // DM Actions
    case ActionTypes.SET_ACTIVE_DM:
      return {
        ...state,
        dm: { ...state.dm, activeDM: action.payload }
      }

    case ActionTypes.SET_DM_MESSAGES:
      return {
        ...state,
        dm: {
          ...state.dm,
          dmMessages: {
            ...state.dm.dmMessages,
            [action.payload.id]: action.payload.messages
          }
        }
      }

    // Call Actions
    case ActionTypes.START_CALL:
      return {
        ...state,
        call: {
          ...state.call,
          type: action.payload.type,
          active: action.payload.active
        },
        ui: { ...state.ui, showCallModal: true }
      }

    case ActionTypes.END_CALL:
      return {
        ...state,
        call: initialState.call,
        ui: { ...state.ui, showCallModal: false }
      }

    case ActionTypes.TOGGLE_MUTE:
      return {
        ...state,
        call: { ...state.call, isMuted: !state.call.isMuted }
      }

    case ActionTypes.TOGGLE_VIDEO:
      return {
        ...state,
        call: { ...state.call, isVideoOff: !state.call.isVideoOff }
      }

    case ActionTypes.TOGGLE_SCREEN_SHARE:
      return {
        ...state,
        call: { ...state.call, isScreenSharing: !state.call.isScreenSharing }
      }

    // AI Actions
    case ActionTypes.SET_AI_INPUT:
      return {
        ...state,
        ai: { ...state.ai, input: action.payload }
      }

    case ActionTypes.ADD_AI_MESSAGE:
      return {
        ...state,
        ai: {
          ...state.ai,
          messages: [...state.ai.messages, action.payload]
        }
      }

    case ActionTypes.SET_AI_LOADING:
      return {
        ...state,
        ai: { ...state.ai, isLoading: action.payload }
      }

    case ActionTypes.CLEAR_AI_MESSAGES:
      return {
        ...state,
        ai: { ...state.ai, messages: [], input: '' }
      }

    // Meeting Actions
    case ActionTypes.SET_MEETING_DETAILS:
      return {
        ...state,
        meeting: { ...state.meeting, ...action.payload }
      }

    case ActionTypes.CLEAR_MEETING:
      return {
        ...state,
        meeting: initialState.meeting
      }

    // Analytics Actions
    case ActionTypes.SET_ANALYTICS:
      return {
        ...state,
        analytics: { ...state.analytics, ...action.payload }
      }

    // Settings Actions
    case ActionTypes.SET_SETTING:
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.key]: action.payload.value
        }
      }

    // Export Actions
    case ActionTypes.SET_EXPORT_FORMAT:
      return {
        ...state,
        export: { ...state.export, format: action.payload }
      }

    case ActionTypes.SET_EXPORT_DATE_RANGE:
      return {
        ...state,
        export: { ...state.export, dateRange: action.payload }
      }

    // Webhook Actions
    case ActionTypes.SET_WEBHOOKS:
      return {
        ...state,
        webhooks: { ...state.webhooks, list: action.payload }
      }

    case ActionTypes.ADD_WEBHOOK:
      return {
        ...state,
        webhooks: {
          ...state.webhooks,
          list: [...state.webhooks.list, action.payload]
        }
      }

    case ActionTypes.REMOVE_WEBHOOK:
      return {
        ...state,
        webhooks: {
          ...state.webhooks,
          list: state.webhooks.list.filter(w => w.id !== action.payload)
        }
      }

    // Other Actions
    case ActionTypes.SET_TASK_FROM_MESSAGE:
      return { ...state, taskFromMessage: action.payload }

    case ActionTypes.SET_MESSAGE_TO_FORWARD:
      return { ...state, messageToForward: action.payload }

    case ActionTypes.SET_PINNED_MESSAGES:
      return { ...state, pinnedMessages: action.payload }

    case ActionTypes.TOGGLE_PIN_MESSAGE:
      const isPinned = state.pinnedMessages.some(m => m.id === action.payload.id)
      return {
        ...state,
        pinnedMessages: isPinned
          ? state.pinnedMessages.filter(m => m.id !== action.payload.id)
          : [...state.pinnedMessages, action.payload]
      }

    case ActionTypes.RESET_STATE:
      return initialState

    default:
      return state
  }
}

// Create Context
const WorkspaceContext = createContext(null)
const WorkspaceDispatchContext = createContext(null)

// Provider Component
export const WorkspaceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)

  return (
    <WorkspaceContext.Provider value={state}>
      <WorkspaceDispatchContext.Provider value={dispatch}>
        {children}
      </WorkspaceDispatchContext.Provider>
    </WorkspaceContext.Provider>
  )
}

// Custom Hooks
export const useWorkspaceState = () => {
  const context = useContext(WorkspaceContext)
  if (context === null) {
    throw new Error('useWorkspaceState must be used within a WorkspaceProvider')
  }
  return context
}

export const useWorkspaceDispatch = () => {
  const context = useContext(WorkspaceDispatchContext)
  if (context === null) {
    throw new Error('useWorkspaceDispatch must be used within a WorkspaceProvider')
  }
  return context
}

// Combined hook with action helpers
export const useWorkspace = () => {
  const state = useWorkspaceState()
  const dispatch = useWorkspaceDispatch()

  const actions = {
    // UI Actions
    toggleUI: useCallback((key) => {
      dispatch({ type: ActionTypes.TOGGLE_UI, payload: key })
    }, [dispatch]),

    setUI: useCallback((key, value) => {
      dispatch({ type: ActionTypes.SET_UI, payload: { key, value } })
    }, [dispatch]),

    closeAllModals: useCallback(() => {
      dispatch({ type: ActionTypes.CLOSE_ALL_MODALS })
    }, [dispatch]),

    // Search Actions
    setSearchQuery: useCallback((query) => {
      dispatch({ type: ActionTypes.SET_SEARCH_QUERY, payload: query })
    }, [dispatch]),

    setSearchFilter: useCallback((filter) => {
      dispatch({ type: ActionTypes.SET_SEARCH_FILTER, payload: filter })
    }, [dispatch]),

    clearSearch: useCallback(() => {
      dispatch({ type: ActionTypes.CLEAR_SEARCH })
    }, [dispatch]),

    // Activity Actions
    setActivityFilter: useCallback((filter) => {
      dispatch({ type: ActionTypes.SET_ACTIVITY_FILTER, payload: filter })
    }, [dispatch]),

    addActivity: useCallback((activity) => {
      dispatch({ type: ActionTypes.ADD_ACTIVITY, payload: activity })
    }, [dispatch]),

    // Call Actions
    startCall: useCallback((type, channelInfo) => {
      dispatch({ type: ActionTypes.START_CALL, payload: { type, active: channelInfo } })
    }, [dispatch]),

    endCall: useCallback(() => {
      dispatch({ type: ActionTypes.END_CALL })
    }, [dispatch]),

    toggleMute: useCallback(() => {
      dispatch({ type: ActionTypes.TOGGLE_MUTE })
    }, [dispatch]),

    toggleVideo: useCallback(() => {
      dispatch({ type: ActionTypes.TOGGLE_VIDEO })
    }, [dispatch]),

    // AI Actions
    setAIInput: useCallback((input) => {
      dispatch({ type: ActionTypes.SET_AI_INPUT, payload: input })
    }, [dispatch]),

    addAIMessage: useCallback((message) => {
      dispatch({ type: ActionTypes.ADD_AI_MESSAGE, payload: message })
    }, [dispatch]),

    setAILoading: useCallback((loading) => {
      dispatch({ type: ActionTypes.SET_AI_LOADING, payload: loading })
    }, [dispatch]),

    // Meeting Actions
    setMeetingDetails: useCallback((details) => {
      dispatch({ type: ActionTypes.SET_MEETING_DETAILS, payload: details })
    }, [dispatch]),

    // Analytics
    setAnalytics: useCallback((analytics) => {
      dispatch({ type: ActionTypes.SET_ANALYTICS, payload: analytics })
    }, [dispatch]),

    // Settings
    setSetting: useCallback((key, value) => {
      dispatch({ type: ActionTypes.SET_SETTING, payload: { key, value } })
    }, [dispatch]),

    // Task/Forward
    setTaskFromMessage: useCallback((message) => {
      dispatch({ type: ActionTypes.SET_TASK_FROM_MESSAGE, payload: message })
    }, [dispatch]),

    setMessageToForward: useCallback((message) => {
      dispatch({ type: ActionTypes.SET_MESSAGE_TO_FORWARD, payload: message })
    }, [dispatch]),

    // Pinned Messages
    togglePinMessage: useCallback((message) => {
      dispatch({ type: ActionTypes.TOGGLE_PIN_MESSAGE, payload: message })
    }, [dispatch])
  }

  return { state, dispatch, actions, ActionTypes }
}

export { ActionTypes }
export default WorkspaceContext
