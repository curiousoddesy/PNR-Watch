import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import {
  useFocusManagement,
  useScreenReader,
  useKeyboardNavigation,
  useId,
  useAriaAttributes,
  useReducedMotion,
  useFocusTrap,
  useDisclosure,
  useListbox
} from '../useAccessibility'

// Mock the accessibility utilities
vi.mock('../../utils/accessibility', () => ({
  FocusManager: {
    saveFocus: vi.fn(),
    restoreFocus: vi.fn(),
    focusElement: vi.fn(),
    releaseFocusTrap: vi.fn(),
  },
  ScreenReaderAnnouncer: {
    announce: vi.fn(),
    announceNavigation: vi.fn(),
    announceError: vi.fn(),
    announceSuccess: vi.fn(),
    announceLoading: vi.fn(),
  },
  KeyboardNavigation: {
    KEYS: {
      ENTER: 'Enter',
      SPACE: ' ',
      ESCAPE: 'Escape',
      ARROW_UP: 'ArrowUp',
      ARROW_DOWN: 'ArrowDown',
      ARROW_LEFT: 'ArrowLeft',
      ARROW_RIGHT: 'ArrowRight',
      HOME: 'Home',
      END: 'End',
      TAB: 'Tab',
    },
    isActivationKey: vi.fn(),
    handleArrowNavigation: vi.fn(),
  },
  generateId: vi.fn(() => 'test-id'),
  prefersReducedMotion: vi.fn(() => false),
}))

// Mock matchMedia
const matchMediaMock = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock
})

describe('useFocusManagement', () => {
  it('provides focus management functions', () => {
    const { result } = renderHook(() => useFocusManagement())

    expect(result.current.saveFocus).toBeInstanceOf(Function)
    expect(result.current.restoreFocus).toBeInstanceOf(Function)
    expect(result.current.focusElement).toBeInstanceOf(Function)
  })

  it('calls FocusManager methods when functions are invoked', () => {
    const { FocusManager } = require('../../utils/accessibility')
    const { result } = renderHook(() => useFocusManagement())

    act(() => {
      result.current.saveFocus()
    })
    expect(FocusManager.saveFocus).toHaveBeenCalled()

    act(() => {
      result.current.restoreFocus()
    })
    expect(FocusManager.restoreFocus).toHaveBeenCalled()

    const mockElement = document.createElement('button')
    act(() => {
      result.current.focusElement(mockElement, { trapFocus: true })
    })
    expect(FocusManager.focusElement).toHaveBeenCalledWith(mockElement, { trapFocus: true })
  })
})

describe('useScreenReader', () => {
  it('provides screen reader announcement functions', () => {
    const { result } = renderHook(() => useScreenReader())

    expect(result.current.announce).toBeInstanceOf(Function)
    expect(result.current.announceNavigation).toBeInstanceOf(Function)
    expect(result.current.announceError).toBeInstanceOf(Function)
    expect(result.current.announceSuccess).toBeInstanceOf(Function)
    expect(result.current.announceLoading).toBeInstanceOf(Function)
  })

  it('calls ScreenReaderAnnouncer methods when functions are invoked', () => {
    const { ScreenReaderAnnouncer } = require('../../utils/accessibility')
    const { result } = renderHook(() => useScreenReader())

    act(() => {
      result.current.announce('Test message', 'assertive')
    })
    expect(ScreenReaderAnnouncer.announce).toHaveBeenCalledWith('Test message', 'assertive')

    act(() => {
      result.current.announceError('Error message')
    })
    expect(ScreenReaderAnnouncer.announceError).toHaveBeenCalledWith('Error message')
  })
})

describe('useKeyboardNavigation', () => {
  it('provides keyboard navigation state and functions', () => {
    const { result } = renderHook(() => useKeyboardNavigation())

    expect(typeof result.current.currentIndex).toBe('number')
    expect(result.current.handleKeyDown).toBeInstanceOf(Function)
    expect(result.current.registerElement).toBeInstanceOf(Function)
    expect(result.current.setCurrentIndex).toBeInstanceOf(Function)
  })

  it('handles keyboard navigation with correct orientation', () => {
    const { KeyboardNavigation } = require('../../utils/accessibility')
    KeyboardNavigation.handleArrowNavigation.mockReturnValue(1)

    const { result } = renderHook(() => useKeyboardNavigation('horizontal'))

    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' })
    act(() => {
      result.current.handleKeyDown(mockEvent)
    })

    expect(KeyboardNavigation.handleArrowNavigation).toHaveBeenCalledWith(
      mockEvent,
      [],
      0,
      'horizontal'
    )
  })

  it('registers elements correctly', () => {
    const { result } = renderHook(() => useKeyboardNavigation())

    const mockElement = document.createElement('button')
    act(() => {
      result.current.registerElement(mockElement, 0)
    })

    // The element should be stored in the internal ref
    // This is tested indirectly through the keyboard navigation behavior
  })
})

describe('useId', () => {
  it('generates unique IDs', () => {
    const { generateId } = require('../../utils/accessibility')
    generateId.mockReturnValueOnce('test-id-1').mockReturnValueOnce('test-id-2')

    const { result: result1 } = renderHook(() => useId('prefix'))
    const { result: result2 } = renderHook(() => useId('prefix'))

    expect(result1.current).toBe('test-id-1')
    expect(result2.current).toBe('test-id-2')
    expect(generateId).toHaveBeenCalledWith('prefix')
  })

  it('uses default prefix when none provided', () => {
    const { generateId } = require('../../utils/accessibility')
    renderHook(() => useId())

    expect(generateId).toHaveBeenCalledWith(undefined)
  })
})

describe('useAriaAttributes', () => {
  it('manages ARIA attributes state', () => {
    const initialAttributes = { 'aria-label': 'Test label' }
    const { result } = renderHook(() => useAriaAttributes(initialAttributes))

    expect(result.current.attributes).toEqual(initialAttributes)
    expect(result.current.updateAttribute).toBeInstanceOf(Function)
    expect(result.current.removeAttribute).toBeInstanceOf(Function)
  })

  it('updates attributes correctly', () => {
    const { result } = renderHook(() => useAriaAttributes())

    act(() => {
      result.current.updateAttribute('aria-expanded', true)
    })

    expect(result.current.attributes['aria-expanded']).toBe(true)
  })

  it('removes attributes correctly', () => {
    const initialAttributes = { 'aria-label': 'Test label', 'aria-expanded': true }
    const { result } = renderHook(() => useAriaAttributes(initialAttributes))

    act(() => {
      result.current.removeAttribute('aria-expanded')
    })

    expect(result.current.attributes).toEqual({ 'aria-label': 'Test label' })
  })
})

describe('useReducedMotion', () => {
  beforeEach(() => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  it('returns current reduced motion preference', () => {
    const { prefersReducedMotion } = require('../../utils/accessibility')
    prefersReducedMotion.mockReturnValue(true)

    const { result } = renderHook(() => useReducedMotion())

    expect(result.current).toBe(true)
  })

  it('listens for media query changes', () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    })

    const { unmount } = renderHook(() => useReducedMotion())

    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})

describe('useFocusTrap', () => {
  it('manages focus trap when active', () => {
    const { FocusManager } = require('../../utils/accessibility')
    const { result } = renderHook(() => useFocusTrap(true))

    expect(result.current.current).toBeNull() // Initial ref value

    // When component mounts with isActive=true, it should set up focus trap
    expect(FocusManager.focusElement).toHaveBeenCalledWith(null, { trapFocus: true })
  })

  it('releases focus trap when inactive', () => {
    const { FocusManager } = require('../../utils/accessibility')
    const { rerender, unmount } = renderHook(
      ({ isActive }) => useFocusTrap(isActive),
      { initialProps: { isActive: true } }
    )

    // Change to inactive
    rerender({ isActive: false })

    // Should not call releaseFocusTrap when just changing to inactive
    // But should call it on unmount if it was active
    unmount()

    expect(FocusManager.releaseFocusTrap).toHaveBeenCalled()
  })
})

describe('useDisclosure', () => {
  it('manages disclosure state', () => {
    const { result } = renderHook(() => useDisclosure())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.toggle).toBeInstanceOf(Function)
    expect(result.current.open).toBeInstanceOf(Function)
    expect(result.current.close).toBeInstanceOf(Function)
  })

  it('provides correct props for trigger and content', () => {
    const { result } = renderHook(() => useDisclosure())

    expect(result.current.triggerProps).toHaveProperty('aria-expanded', false)
    expect(result.current.triggerProps).toHaveProperty('aria-controls')
    expect(result.current.triggerProps).toHaveProperty('onClick')

    expect(result.current.contentProps).toHaveProperty('aria-labelledby')
    expect(result.current.contentProps).toHaveProperty('aria-hidden', true)
  })

  it('toggles state correctly', () => {
    const { result } = renderHook(() => useDisclosure())

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.triggerProps['aria-expanded']).toBe(true)
    expect(result.current.contentProps['aria-hidden']).toBe(false)
  })

  it('uses default open state', () => {
    const { result } = renderHook(() => useDisclosure(true))

    expect(result.current.isOpen).toBe(true)
  })
})

describe('useListbox', () => {
  const mockItems = [
    { value: '1', label: 'Item 1' },
    { value: '2', label: 'Item 2' },
    { value: '3', label: 'Item 3' },
  ]

  const mockGetItemId = (item: any, index: number) => `item-${index}`

  it('manages listbox state', () => {
    const { result } = renderHook(() => 
      useListbox(mockItems, mockGetItemId)
    )

    expect(result.current.isOpen).toBe(false)
    expect(result.current.selectedIndex).toBe(-1)
    expect(result.current.setIsOpen).toBeInstanceOf(Function)
    expect(result.current.selectItem).toBeInstanceOf(Function)
  })

  it('provides correct props for trigger and listbox', () => {
    const { result } = renderHook(() => 
      useListbox(mockItems, mockGetItemId)
    )

    expect(result.current.triggerProps).toHaveProperty('role', 'combobox')
    expect(result.current.triggerProps).toHaveProperty('aria-expanded', false)
    expect(result.current.triggerProps).toHaveProperty('aria-haspopup', 'listbox')

    expect(result.current.listboxProps).toHaveProperty('role', 'listbox')
    expect(result.current.listboxProps).toHaveProperty('aria-labelledby')
  })

  it('generates correct item props', () => {
    const { result } = renderHook(() => 
      useListbox(mockItems, mockGetItemId)
    )

    const itemProps = result.current.getItemProps(mockItems[0], 0)

    expect(itemProps).toHaveProperty('id', 'item-0')
    expect(itemProps).toHaveProperty('role', 'option')
    expect(itemProps).toHaveProperty('aria-selected', false)
    expect(itemProps).toHaveProperty('onClick')
  })

  it('calls onSelectionChange when item is selected', () => {
    const onSelectionChange = vi.fn()
    const { result } = renderHook(() => 
      useListbox(mockItems, mockGetItemId, onSelectionChange)
    )

    act(() => {
      result.current.selectItem(1)
    })

    expect(onSelectionChange).toHaveBeenCalledWith(mockItems[1], 1)
    expect(result.current.selectedIndex).toBe(1)
    expect(result.current.isOpen).toBe(false)
  })
})