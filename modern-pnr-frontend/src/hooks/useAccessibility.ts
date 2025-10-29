import { useEffect, useRef, useState, useCallback } from 'react'
import { 
  FocusManager, 
  ScreenReaderAnnouncer, 
  KeyboardNavigation,
  generateId,
  prefersReducedMotion,
  type AriaAttributes,
  type FocusManagementOptions
} from '../utils/accessibility'

// Hook for managing focus
export function useFocusManagement() {
  const saveFocus = useCallback(() => FocusManager.saveFocus(), [])
  const restoreFocus = useCallback(() => FocusManager.restoreFocus(), [])
  const focusElement = useCallback((element: HTMLElement | null, options?: FocusManagementOptions) => {
    FocusManager.focusElement(element, options)
  }, [])

  return { saveFocus, restoreFocus, focusElement }
}

// Hook for screen reader announcements
export function useScreenReader() {
  const announce = useCallback((message: string, priority?: 'polite' | 'assertive') => {
    ScreenReaderAnnouncer.announce(message, priority)
  }, [])

  const announceNavigation = useCallback((pageName: string) => {
    ScreenReaderAnnouncer.announceNavigation(pageName)
  }, [])

  const announceError = useCallback((error: string) => {
    ScreenReaderAnnouncer.announceError(error)
  }, [])

  const announceSuccess = useCallback((message: string) => {
    ScreenReaderAnnouncer.announceSuccess(message)
  }, [])

  const announceLoading = useCallback((isLoading: boolean) => {
    ScreenReaderAnnouncer.announceLoading(isLoading)
  }, [])

  return {
    announce,
    announceNavigation,
    announceError,
    announceSuccess,
    announceLoading
  }
}

// Hook for keyboard navigation
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>(
  orientation: 'horizontal' | 'vertical' = 'vertical'
) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const elementsRef = useRef<T[]>([])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const newIndex = KeyboardNavigation.handleArrowNavigation(
      event,
      elementsRef.current,
      currentIndex,
      orientation
    )
    setCurrentIndex(newIndex)
  }, [currentIndex, orientation])

  const registerElement = useCallback((element: T | null, index: number) => {
    if (element) {
      elementsRef.current[index] = element
    }
  }, [])

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
    registerElement,
    isActivationKey: KeyboardNavigation.isActivationKey
  }
}

// Hook for generating unique IDs
export function useId(prefix?: string): string {
  const [id] = useState(() => generateId(prefix))
  return id
}

// Hook for ARIA attributes management
export function useAriaAttributes(baseAttributes: AriaAttributes = {}) {
  const [attributes, setAttributes] = useState<AriaAttributes>(baseAttributes)

  const updateAttribute = useCallback(<K extends keyof AriaAttributes>(
    key: K,
    value: AriaAttributes[K]
  ) => {
    setAttributes(prev => ({ ...prev, [key]: value }))
  }, [])

  const removeAttribute = useCallback((key: keyof AriaAttributes) => {
    setAttributes(prev => {
      const { [key]: removed, ...rest } = prev
      return rest
    })
  }, [])

  return {
    attributes,
    updateAttribute,
    removeAttribute
  }
}

// Hook for reduced motion preferences
export function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setPrefersReduced(mediaQuery.matches)
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReduced
}

// Hook for focus trap management
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    FocusManager.focusElement(containerRef.current, { trapFocus: true })

    return () => {
      FocusManager.releaseFocusTrap()
    }
  }, [isActive])

  return containerRef
}

// Hook for live region announcements
export function useLiveRegion() {
  const regionRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (regionRef.current) {
      regionRef.current.setAttribute('aria-live', priority)
      regionRef.current.textContent = message
      
      // Clear after announcement
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = ''
        }
      }, 1000)
    }
  }, [])

  return { regionRef, announce }
}

// Hook for skip links
export function useSkipLinks() {
  const skipLinksRef = useRef<HTMLElement>(null)

  const addSkipLink = useCallback((targetId: string, label: string) => {
    if (!skipLinksRef.current) return

    const link = document.createElement('a')
    link.href = `#${targetId}`
    link.textContent = label
    link.className = 'skip-link'
    skipLinksRef.current.appendChild(link)
  }, [])

  return { skipLinksRef, addSkipLink }
}

// Hook for managing disclosure widgets (collapsible content)
export function useDisclosure(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const triggerId = useId('disclosure-trigger')
  const contentId = useId('disclosure-content')

  const toggle = useCallback(() => setIsOpen(prev => !prev), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const triggerProps = {
    id: triggerId,
    'aria-expanded': isOpen,
    'aria-controls': contentId,
    onClick: toggle
  }

  const contentProps = {
    id: contentId,
    'aria-labelledby': triggerId,
    'aria-hidden': !isOpen
  }

  return {
    isOpen,
    toggle,
    open,
    close,
    triggerProps,
    contentProps
  }
}

// Hook for managing listbox/combobox components
export function useListbox<T>(
  items: T[],
  getItemId: (item: T, index: number) => string,
  onSelectionChange?: (item: T, index: number) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const listboxId = useId('listbox')
  const triggerId = useId('listbox-trigger')

  const { handleKeyDown } = useKeyboardNavigation('vertical')

  const selectItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setSelectedIndex(index)
      onSelectionChange?.(items[index], index)
      setIsOpen(false)
    }
  }, [items, onSelectionChange])

  const handleTriggerKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case KeyboardNavigation.KEYS.ARROW_DOWN:
      case KeyboardNavigation.KEYS.ARROW_UP:
        event.preventDefault()
        setIsOpen(true)
        setSelectedIndex(0)
        break
      case KeyboardNavigation.KEYS.ENTER:
      case KeyboardNavigation.KEYS.SPACE:
        event.preventDefault()
        setIsOpen(!isOpen)
        break
      case KeyboardNavigation.KEYS.ESCAPE:
        setIsOpen(false)
        break
    }
  }, [isOpen])

  const handleListKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case KeyboardNavigation.KEYS.ENTER:
      case KeyboardNavigation.KEYS.SPACE:
        event.preventDefault()
        selectItem(selectedIndex)
        break
      case KeyboardNavigation.KEYS.ESCAPE:
        setIsOpen(false)
        break
      default:
        handleKeyDown(event)
    }
  }, [selectedIndex, selectItem, handleKeyDown])

  const triggerProps = {
    id: triggerId,
    role: 'combobox',
    'aria-expanded': isOpen,
    'aria-controls': listboxId,
    'aria-haspopup': 'listbox' as const,
    onKeyDown: handleTriggerKeyDown
  }

  const listboxProps = {
    id: listboxId,
    role: 'listbox',
    'aria-labelledby': triggerId,
    onKeyDown: handleListKeyDown
  }

  const getItemProps = (item: T, index: number) => ({
    id: getItemId(item, index),
    role: 'option',
    'aria-selected': index === selectedIndex,
    onClick: () => selectItem(index)
  })

  return {
    isOpen,
    selectedIndex,
    setIsOpen,
    selectItem,
    triggerProps,
    listboxProps,
    getItemProps
  }
}