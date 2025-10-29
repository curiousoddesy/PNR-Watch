// Accessibility utilities and helpers

export interface AriaAttributes {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-live'?: 'off' | 'polite' | 'assertive'
  'aria-atomic'?: boolean
  'aria-busy'?: boolean
  'aria-controls'?: string
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  'aria-disabled'?: boolean
  'aria-invalid'?: boolean | 'grammar' | 'spelling'
  'aria-pressed'?: boolean
  'aria-selected'?: boolean
  'aria-checked'?: boolean | 'mixed'
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  'aria-orientation'?: 'horizontal' | 'vertical'
  'aria-valuemin'?: number
  'aria-valuemax'?: number
  'aria-valuenow'?: number
  'aria-valuetext'?: string
  'aria-level'?: number
  'aria-setsize'?: number
  'aria-posinset'?: number
  role?: string
}

export interface FocusManagementOptions {
  preventScroll?: boolean
  restoreFocus?: boolean
  trapFocus?: boolean
}

// Generate unique IDs for accessibility
let idCounter = 0
export function generateId(prefix = 'id'): string {
  return `${prefix}-${++idCounter}`
}

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = []
  private static trapStack: HTMLElement[] = []

  static saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement)
    }
  }

  static restoreFocus(): void {
    const element = this.focusStack.pop()
    if (element && element.focus) {
      element.focus({ preventScroll: true })
    }
  }

  static focusElement(element: HTMLElement | null, options: FocusManagementOptions = {}): void {
    if (!element) return

    if (options.restoreFocus) {
      this.saveFocus()
    }

    element.focus({ preventScroll: options.preventScroll })

    if (options.trapFocus) {
      this.trapStack.push(element)
      this.setupFocusTrap(element)
    }
  }

  static releaseFocusTrap(): void {
    const element = this.trapStack.pop()
    if (element) {
      this.removeFocusTrap(element)
    }
  }

  private static setupFocusTrap(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    container.setAttribute('data-focus-trap', 'true')
  }

  private static removeFocusTrap(container: HTMLElement): void {
    container.removeAttribute('data-focus-trap')
    // Note: In a real implementation, you'd need to store and remove the specific event listener
  }

  static getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(element => {
        const el = element as HTMLElement
        return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hidden
      }) as HTMLElement[]
  }
}

// Screen reader announcements
export class ScreenReaderAnnouncer {
  private static liveRegion: HTMLElement | null = null

  static initialize(): void {
    if (this.liveRegion) return

    this.liveRegion = document.createElement('div')
    this.liveRegion.setAttribute('aria-live', 'polite')
    this.liveRegion.setAttribute('aria-atomic', 'true')
    this.liveRegion.className = 'sr-only'
    this.liveRegion.id = 'screen-reader-announcements'
    document.body.appendChild(this.liveRegion)
  }

  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.initialize()
    
    if (!this.liveRegion) return

    this.liveRegion.setAttribute('aria-live', priority)
    this.liveRegion.textContent = message

    // Clear after announcement to allow repeated messages
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = ''
      }
    }, 1000)
  }

  static announceNavigation(pageName: string): void {
    this.announce(`Navigated to ${pageName}`)
  }

  static announceError(error: string): void {
    this.announce(`Error: ${error}`, 'assertive')
  }

  static announceSuccess(message: string): void {
    this.announce(`Success: ${message}`)
  }

  static announceLoading(isLoading: boolean): void {
    if (isLoading) {
      this.announce('Loading content, please wait')
    } else {
      this.announce('Content loaded')
    }
  }
}

// Keyboard navigation utilities
export class KeyboardNavigation {
  static readonly KEYS = {
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
  } as const

  static isActivationKey(event: KeyboardEvent): boolean {
    return event.key === this.KEYS.ENTER || event.key === this.KEYS.SPACE
  }

  static handleArrowNavigation(
    event: KeyboardEvent,
    elements: HTMLElement[],
    currentIndex: number,
    orientation: 'horizontal' | 'vertical' = 'vertical'
  ): number {
    const isVertical = orientation === 'vertical'
    const nextKey = isVertical ? this.KEYS.ARROW_DOWN : this.KEYS.ARROW_RIGHT
    const prevKey = isVertical ? this.KEYS.ARROW_UP : this.KEYS.ARROW_LEFT

    let newIndex = currentIndex

    switch (event.key) {
      case nextKey:
        event.preventDefault()
        newIndex = (currentIndex + 1) % elements.length
        break
      case prevKey:
        event.preventDefault()
        newIndex = currentIndex === 0 ? elements.length - 1 : currentIndex - 1
        break
      case this.KEYS.HOME:
        event.preventDefault()
        newIndex = 0
        break
      case this.KEYS.END:
        event.preventDefault()
        newIndex = elements.length - 1
        break
    }

    if (newIndex !== currentIndex && elements[newIndex]) {
      elements[newIndex].focus()
    }

    return newIndex
  }
}

// Reduced motion utilities
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getAnimationDuration(defaultDuration: number): number {
  return prefersReducedMotion() ? 0 : defaultDuration
}

// High contrast detection
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches
}

// Color scheme detection
export function getPreferredColorScheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Accessibility validation utilities
export function validateAriaLabel(element: HTMLElement): boolean {
  const hasAriaLabel = element.hasAttribute('aria-label')
  const hasAriaLabelledBy = element.hasAttribute('aria-labelledby')
  const hasTextContent = element.textContent?.trim().length > 0
  
  return hasAriaLabel || hasAriaLabelledBy || hasTextContent
}

export function validateColorContrast(foreground: string, background: string): {
  ratio: number
  wcagAA: boolean
  wcagAAA: boolean
} {
  // This is a simplified version - in production, use a proper color contrast library
  const ratio = 4.5 // Placeholder - implement actual contrast calculation
  
  return {
    ratio,
    wcagAA: ratio >= 4.5,
    wcagAAA: ratio >= 7
  }
}

// Initialize accessibility features
export function initializeAccessibility(): void {
  ScreenReaderAnnouncer.initialize()
  
  // Add global keyboard event listeners for accessibility
  document.addEventListener('keydown', (event) => {
    // Handle escape key globally
    if (event.key === KeyboardNavigation.KEYS.ESCAPE) {
      const activeModal = document.querySelector('[role="dialog"][aria-hidden="false"]')
      if (activeModal) {
        const closeButton = activeModal.querySelector('[data-close]') as HTMLElement
        if (closeButton) {
          closeButton.click()
        }
      }
    }
  })

  // Announce page changes for single-page applications
  let currentPath = window.location.pathname
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname
      const pageTitle = document.title || 'New page'
      ScreenReaderAnnouncer.announceNavigation(pageTitle)
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}