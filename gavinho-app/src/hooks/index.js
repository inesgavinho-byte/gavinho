// =====================================================
// HOOKS INDEX
// Exporta todos os custom hooks reutilizáveis
// =====================================================

// Modal management
export { useModal } from './useModal'

// Form management
export { useForm } from './useForm'

// Data fetching
export { useFetch, useFetchAll } from './useFetch'

// Async operations
export { useAsync, useDebouncedAsync } from './useAsync'

// Notifications (unified system)
export { default as useUnifiedNotifications, formatRelativeTime, groupNotificationsByDate, NOTIFICATION_CONFIG } from './useUnifiedNotifications'
