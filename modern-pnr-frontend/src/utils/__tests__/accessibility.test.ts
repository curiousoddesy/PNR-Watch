import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  FocusManager,
  ScreenReaderAnnouncer,
  KeyboardNavigation,
  generateId,
  prefersReducedMotion,
  prefersHighContrast,
  getPreferredColorScheme,
  validateAriaLabel,
  validateColorContrast,
  initializeAccessibility
} from '../accessibility'

// Mock DOM methods
const mockFocus = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

// Mock elements
const createMockElement = (options: Partial<HTMLElement> = {}) => ({
  focus: mockFocus,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  offsetWidth: 100,
  offsetHeight: 50,
  hidden: false,
  hasAttribute: vi.fn(),
  getAttribute: vi.fn(),
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  textContent: 'Mock element',
  ...options
} as unknown as HTMLElement)

// Mock document methods
Object.defineProperty(document, 'activeElement', {
  value: createMockElement(),
  writable: true
})

Object.defineProperty(document, 'body', {
  value: createMockElement(),
  writable: true
})

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => createMockElement()),
  writable: true
})

Object.defineProperty(document, 'querySelectorAll', {
  value: vi.fn(() => []),
  writable: true
})

// Mock matchMedia
const matchMediaMock = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock
})

describe('generateId', () => {
  it('generates unique IDs with prefix', () => {
    const id1 = generateId('test')
    const id2 = generateId('test')

    expect(id1).toMatch(/^test-\d+$/)
    expect(id2).toMatch(/^test-\d+$/)
    expect(id1).not.toBe(id2)
  })

  it('uses default prefix when none provided', () => {
    const id = generateId()
    expect(id).toMatch(/^id-\d+$/)
  })
})

describe('FocusManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset focus stack
    FocusManager['focusStack'] = []
    FocusManager['trapStack'] = []
  })

  describe('saveFocus and restoreFocus', () => {
    it('saves and restores focus correctly', () => {
      const mockActiveElement = createMockElement()
      document.activeElement = mockActiveElement

      FocusManager.saveFocus()
      FocusManager.restoreFocus()

      expect(mockFocus).toHaveBeenCalledWith({ preventScroll: true })
    })

    it('does not save focus on body element', () => {
      document.activeElement = document.body

      FocusManager.saveFocus()
      FocusManager.restoreFocus()

      expect(mockFocus).not.toHaveBeenCalled()
    })
  })

  describe('focusElement', () => {
    it('focuses element with default options', () => {
      const element = createMockElement()

      FocusManager.focusElement(element)

      expect(mockFocus).toHaveBeenCalledWith({ preventScroll: undefined })
    })

    it('focuses element with preventScroll option', () => {
      const element = createMockElement()

      FocusManager.focusElement(element, { preventScroll: true })

      expect(mockFocus).toHaveBeenCalledWith({ preventScroll: true })
    })

    it('saves focus when restoreFocus option is true', () => {
      const mockActiveElement = createMockElement()
      document.activeElement = mockActiveElement
      const element = createMockElement()

      FocusManager.focusElement(element, { restoreFocus: true })

      expect(mockFocus).toHaveBeenCalled()
    })

    it('does nothing when element is null', () => {
      FocusManager.focusElement(null)

      expect(mockFocus).not.toHaveBeenCalled()
    })
  })

  describe('getFocusableElements', () => {
    it('returns focusable elements', () => {
      const mockElements = [
        createMockElement({ tagName: 'BUTTON' }),
        createMockElement({ tagName: 'INPUT' }),
        createMockElement({ tagName: 'A', getAttribute: vi.fn(() => '#') })
      ]

      document.querySelectorAll = vi.fn(() => mockElements as any)

      const focusableElements = FocusManager.getFocusableElements()

      expect(document.querySelectorAll).toHaveBeenCalledWith(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      )
      expect(focusableElements).toEqual(mockElements)
    })

    it('filters out hidden elements', () => {
      const visibleElement = createMockElement({ offsetWidth: 100, offsetHeight: 50 })
      const hiddenElement = createMockElement({ offsetWidth: 0, offsetHeight: 0 })

      document.querySelectorAll = vi.fn(() => [visibleElement, hiddenElement] as any)

      const focusableElements = FocusManager.getFocusableElements()

      expect(focusableElements).toEqual([visibleElement])
    })
  })
})

describe('ScreenReaderAnnouncer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ScreenReaderAnnouncer['liveRegion'] = null
    document.body.appendChild = vi.fn()
  })

  it('initializes live region', () => {
    ScreenReaderAnnouncer.initialize()

    expect(document.createElement).toHaveBeenCalledWith('div')
    expect(document.body.appendChild).toHaveBeenCalled()
  })

  it('announces messages', () => {
    const mockLiveRegion = createMockElement()
    ScreenReaderAnnouncer['liveRegion'] = mockLiveRegion

    ScreenReaderAnnouncer.announce('Test message', 'assertive')

    expect(mockLiveRegion.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive')
    expect(mockLiveRegion.textContent).toBe('Test message')
  })

  it('announces navigation changes', () => {
    const mockLiveRegion = createMockElement()
    ScreenReaderAnnouncer['liveRegion'] = mockLiveRegion

    ScreenReaderAnnouncer.announceNavigation('Home Page')

    expect(mockLiveRegion.textContent).toBe('Navigated to Home Page')
  })

  it('announces errors with assertive priority', () => {
    const mockLiveRegion = createMockElement()
    ScreenReaderAnnouncer['liveRegion'] = mockLiveRegion

    ScreenReaderAnnouncer.announceError('Something went wrong')

    expect(mockLiveRegion.setAttribute).toHaveBeenCalledWith('aria-live', 'assertive')
    expect(mockLiveRegion.textContent).toBe('Error: Something went wrong')
  })

  it('announces loading states', () => {
    const mockLiveRegion = createMockElement()
    ScreenReaderAnnouncer['liveRegion'] = mockLiveRegion

    ScreenReaderAnnouncer.announceLoading(true)
    expect(mockLiveRegion.textContent).toBe('Loading content, please wait')

    ScreenReaderAnnouncer.announceLoading(false)
    expect(mockLiveRegion.textContent).toBe('Content loaded')
  })
})

describe('KeyboardNavigation', () => {
  describe('isActivationKey', () => {
    it('returns true for Enter key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      expect(KeyboardNavigation.isActivationKey(event)).toBe(true)
    })

    it('returns true for Space key', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' })
      expect(KeyboardNavigation.isActivationKey(event)).toBe(true)
    })

    it('returns false for other keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' })
      expect(KeyboardNavigation.isActivationKey(event)).toBe(false)
    })
  })

  describe('handleArrowNavigation', () => {
    const mockElements = [
      createMockElement(),
      createMockElement(),
      createMockElement()
    ]

    it('handles vertical navigation down', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      event.preventDefault = vi.fn()

      const newIndex = KeyboardNavigation.handleArrowNavigation(event, mockElements, 0, 'vertical')

      expect(event.preventDefault).toHaveBeenCalled()
      expect(newIndex).toBe(1)
      expect(mockFocus).toHaveBeenCalled()
    })

    it('handles vertical navigation up', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      event.preventDefault = vi.fn()

      const newIndex = KeyboardNavigation.handleArrowNavigation(event, mockElements, 1, 'vertical')

      expect(event.preventDefault).toHaveBeenCalled()
      expect(newIndex).toBe(0)
      expect(mockFocus).toHaveBeenCalled()
    })

    it('wraps around at boundaries', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      event.preventDefault = vi.fn()

      const newIndex = KeyboardNavigation.handleArrowNavigation(event, mockElements, 2, 'vertical')

      expect(newIndex).toBe(0) // Wraps to first element
    })

    it('handles Home key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Home' })
      event.preventDefault = vi.fn()

      const newIndex = KeyboardNavigation.handleArrowNavigation(event, mockElements, 2, 'vertical')

      expect(event.preventDefault).toHaveBeenCalled()
      expect(newIndex).toBe(0)
    })

    it('handles End key', () => {
      const event = new KeyboardEvent('keydown', { key: 'End' })
      event.preventDefault = vi.fn()

      const newIndex = KeyboardNavigation.handleArrowNavigation(event, mockElements, 0, 'vertical')

      expect(event.preventDefault).toHaveBeenCalled()
      expect(newIndex).toBe(2)
    })

    it('handles horizontal navigation', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      event.preventDefault = vi.fn()

      const newIndex = KeyboardNavigation.handleArrowNavigation(event, mockElements, 0, 'horizontal')

      expect(event.preventDefault).toHaveBeenCalled()
      expect(newIndex).toBe(1)
    })
  })
})

describe('Preference detection functions', () => {
  beforeEach(() => {
    matchMediaMock.mockReturnValue({ matches: false })
  })

  it('detects reduced motion preference', () => {
    matchMediaMock.mockReturnValue({ matches: true })

    const result = prefersReducedMotion()

    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    expect(result).toBe(true)
  })

  it('detects high contrast preference', () => {
    matchMediaMock.mockReturnValue({ matches: true })

    const result = prefersHighContrast()

    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-contrast: high)')
    expect(result).toBe(true)
  })

  it('detects color scheme preference', () => {
    matchMediaMock.mockReturnValue({ matches: true })

    const result = getPreferredColorScheme()

    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    expect(result).toBe('dark')
  })
})

describe('Validation functions', () => {
  describe('validateAriaLabel', () => {
    it('returns true when element has aria-label', () => {
      const element = createMockElement()
      element.hasAttribute = vi.fn((attr) => attr === 'aria-label')

      const result = validateAriaLabel(element)

      expect(result).toBe(true)
    })

    it('returns true when element has aria-labelledby', () => {
      const element = createMockElement()
      element.hasAttribute = vi.fn((attr) => attr === 'aria-labelledby')

      const result = validateAriaLabel(element)

      expect(result).toBe(true)
    })

    it('returns true when element has text content', () => {
      const element = createMockElement()
      element.hasAttribute = vi.fn(() => false)
      element.textContent = 'Button text'

      const result = validateAriaLabel(element)

      expect(result).toBe(true)
    })

    it('returns false when element has no accessible name', () => {
      const element = createMockElement()
      element.hasAttribute = vi.fn(() => false)
      element.textContent = ''

      const result = validateAriaLabel(element)

      expect(result).toBe(false)
    })
  })

  describe('validateColorContrast', () => {
    it('returns contrast validation result', () => {
      const result = validateColorContrast('#000000', '#ffffff')

      expect(result).toHaveProperty('ratio')
      expect(result).toHaveProperty('wcagAA')
      expect(result).toHaveProperty('wcagAAA')
      expect(typeof result.ratio).toBe('number')
      expect(typeof result.wcagAA).toBe('boolean')
      expect(typeof result.wcagAAA).toBe('boolean')
    })
  })
})

describe('initializeAccessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.addEventListener = vi.fn()
  })

  it('initializes accessibility features', () => {
    initializeAccessibility()

    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('sets up global keyboard event listeners', () => {
    let keydownHandler: (event: KeyboardEvent) => void

    document.addEventListener = vi.fn((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler as (event: KeyboardEvent) => void
      }
    })

    initializeAccessibility()

    // Test escape key handling
    const mockModal = createMockElement()
    const mockCloseButton = createMockElement()
    mockCloseButton.click = vi.fn()
    
    document.querySelector = vi.fn((selector) => {
      if (selector === '[role="dialog"][aria-hidden="false"]') {
        return mockModal
      }
      return null
    })
    
    mockModal.querySelector = vi.fn(() => mockCloseButton)

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    keydownHandler!(escapeEvent)

    expect(mockCloseButton.click).toHaveBeenCalled()
  })
})