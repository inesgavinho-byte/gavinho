// =====================================================
// USE KEYBOARD NAVIGATION HOOK
// Provides keyboard navigation for interactive elements
// =====================================================

import { useCallback, useEffect, useRef } from 'react'

/**
 * Hook for keyboard navigation in lists and menus
 * @param {Object} options - Configuration options
 * @param {boolean} options.isActive - Whether keyboard navigation is active
 * @param {Function} options.onEscape - Callback when Escape is pressed
 * @param {Function} options.onEnter - Callback when Enter is pressed
 * @param {Function} options.onArrowDown - Callback for arrow down navigation
 * @param {Function} options.onArrowUp - Callback for arrow up navigation
 * @param {string[]} options.itemSelector - CSS selector for focusable items
 * @param {HTMLElement} options.containerRef - Reference to container element
 */
export function useKeyboardNavigation({
  isActive = true,
  onEscape,
  onEnter,
  onArrowDown,
  onArrowUp,
  itemSelector = '[role="menuitem"], button, a',
  containerRef
}) {
  const focusedIndexRef = useRef(-1)

  const getFocusableItems = useCallback(() => {
    if (!containerRef?.current) return []
    return Array.from(containerRef.current.querySelectorAll(itemSelector))
  }, [containerRef, itemSelector])

  const focusItem = useCallback((index) => {
    const items = getFocusableItems()
    if (items.length === 0) return

    // Wrap around
    if (index < 0) index = items.length - 1
    if (index >= items.length) index = 0

    focusedIndexRef.current = index
    items[index]?.focus()
  }, [getFocusableItems])

  const handleKeyDown = useCallback((e) => {
    if (!isActive) return

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        onEscape?.()
        break

      case 'Enter':
      case ' ':
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          onEnter?.(e)
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        if (onArrowDown) {
          onArrowDown()
        } else {
          focusItem(focusedIndexRef.current + 1)
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (onArrowUp) {
          onArrowUp()
        } else {
          focusItem(focusedIndexRef.current - 1)
        }
        break

      case 'Home':
        e.preventDefault()
        focusItem(0)
        break

      case 'End':
        e.preventDefault()
        const items = getFocusableItems()
        focusItem(items.length - 1)
        break

      case 'Tab':
        // Allow normal tab behavior but track focus
        break

      default:
        break
    }
  }, [isActive, onEscape, onEnter, onArrowDown, onArrowUp, focusItem, getFocusableItems])

  useEffect(() => {
    if (!isActive) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, handleKeyDown])

  // Reset focused index when deactivated
  useEffect(() => {
    if (!isActive) {
      focusedIndexRef.current = -1
    }
  }, [isActive])

  return {
    focusItem,
    focusedIndex: focusedIndexRef.current,
    getFocusableItems
  }
}

/**
 * Hook for handling Escape key to close modals/menus
 * @param {Function} onClose - Callback when Escape is pressed
 * @param {boolean} isOpen - Whether the modal/menu is open
 */
export function useEscapeKey(onClose, isOpen = true) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
}

/**
 * Hook for focus trapping within a container (for modals)
 * @param {RefObject} containerRef - Reference to the container element
 * @param {boolean} isActive - Whether focus trapping is active
 */
export function useFocusTrap(containerRef, isActive = true) {
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isActive || !containerRef?.current) return

    // Store the previously focused element
    previousFocusRef.current = document.activeElement

    // Get all focusable elements
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusableElements = containerRef.current.querySelectorAll(focusableSelector)
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    // Focus first element
    firstFocusable?.focus()

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to previously focused element
      previousFocusRef.current?.focus()
    }
  }, [isActive, containerRef])
}

/**
 * Hook for announcing messages to screen readers
 * @returns {Function} announce - Function to announce a message
 */
export function useScreenReaderAnnounce() {
  const announceRef = useRef(null)

  useEffect(() => {
    // Create live region for announcements
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('role', 'status')
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `
    document.body.appendChild(liveRegion)
    announceRef.current = liveRegion

    return () => {
      document.body.removeChild(liveRegion)
    }
  }, [])

  const announce = useCallback((message, priority = 'polite') => {
    if (!announceRef.current) return

    announceRef.current.setAttribute('aria-live', priority)
    announceRef.current.textContent = message

    // Clear after announcement
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = ''
      }
    }, 1000)
  }, [])

  return announce
}

export default {
  useKeyboardNavigation,
  useEscapeKey,
  useFocusTrap,
  useScreenReaderAnnounce
}
