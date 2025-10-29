import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, useThemeContext } from '../ThemeContext'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock matchMedia
const matchMediaMock = vi.fn()
Object.defineProperty(window, 'matchMedia', {
  value: matchMediaMock
})

// Test component that uses the theme context
function TestComponent() {
  const { 
    theme, 
    currentMode, 
    setThemeMode, 
    setCustomColors, 
    setAccessibilityPreference,
    resetTheme 
  } = useThemeContext()

  return (
    <div>
      <div data-testid="current-mode">{currentMode}</div>
      <div data-testid="theme-mode">{theme.mode}</div>
      <div data-testid="high-contrast">{theme.accessibility.highContrast.toString()}</div>
      <div data-testid="reduced-motion">{theme.accessibility.reducedMotion.toString()}</div>
      <div data-testid="font-size">{theme.accessibility.fontSize}</div>
      
      <button onClick={() => setThemeMode('dark')} data-testid="set-dark">
        Set Dark
      </button>
      <button onClick={() => setThemeMode('light')} data-testid="set-light">
        Set Light
      </button>
      <button onClick={() => setThemeMode('auto')} data-testid="set-auto">
        Set Auto
      </button>
      <button 
        onClick={() => setAccessibilityPreference('highContrast', true)} 
        data-testid="set-high-contrast"
      >
        Set High Contrast
      </button>
      <button 
        onClick={() => setAccessibilityPreference('reducedMotion', true)} 
        data-testid="set-reduced-motion"
      >
        Set Reduced Motion
      </button>
      <button 
        onClick={() => setAccessibilityPreference('fontSize', 'large')} 
        data-testid="set-large-font"
      >
        Set Large Font
      </button>
      <button 
        onClick={() => setCustomColors({ primary: '#ff0000' })} 
        data-testid="set-custom-color"
      >
        Set Custom Color
      </button>
      <button onClick={resetTheme} data-testid="reset-theme">
        Reset Theme
      </button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    
    // Reset document classes
    document.documentElement.className = ''
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    document.documentElement.className = ''
    document.documentElement.style.cssText = ''
  })

  it('provides default theme values', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('auto')
    expect(screen.getByTestId('high-contrast')).toHaveTextContent('false')
    expect(screen.getByTestId('reduced-motion')).toHaveTextContent('false')
    expect(screen.getByTestId('font-size')).toHaveTextContent('medium')
  })

  it('determines current mode based on system preference when auto', () => {
    matchMediaMock.mockReturnValue({
      matches: true, // Dark mode preferred
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('current-mode')).toHaveTextContent('dark')
  })

  it('applies dark class when current mode is dark', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('changes theme mode when setThemeMode is called', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByTestId('set-dark'))

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark')
      expect(screen.getByTestId('current-mode')).toHaveTextContent('dark')
    })
  })

  it('applies accessibility preferences to DOM', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByTestId('set-high-contrast'))
    fireEvent.click(screen.getByTestId('set-reduced-motion'))
    fireEvent.click(screen.getByTestId('set-large-font'))

    await waitFor(() => {
      expect(document.documentElement.classList.contains('high-contrast')).toBe(true)
      expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)
      expect(document.documentElement.style.fontSize).toBe('18px')
    })
  })

  it('applies custom colors as CSS variables', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByTestId('set-custom-color'))

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#ff0000')
    })
  })

  it('saves theme to localStorage', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    fireEvent.click(screen.getByTestId('set-dark'))

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'theme-config',
        expect.stringContaining('"mode":"dark"')
      )
    })
  })

  it('loads theme from localStorage', () => {
    const savedTheme = JSON.stringify({
      mode: 'dark',
      customColors: { primary: '#ff0000' },
      accessibility: {
        reducedMotion: true,
        highContrast: false,
        fontSize: 'large',
        screenReader: false,
      }
    })
    
    localStorageMock.getItem.mockReturnValue(savedTheme)

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark')
    expect(screen.getByTestId('reduced-motion')).toHaveTextContent('true')
    expect(screen.getByTestId('font-size')).toHaveTextContent('large')
  })

  it('resets theme to defaults', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    // Change some settings
    fireEvent.click(screen.getByTestId('set-dark'))
    fireEvent.click(screen.getByTestId('set-high-contrast'))

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark')
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('true')
    })

    // Reset theme
    fireEvent.click(screen.getByTestId('reset-theme'))

    await waitFor(() => {
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('auto')
      expect(screen.getByTestId('high-contrast')).toHaveTextContent('false')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('theme-config')
    })
  })

  it('listens for system theme changes', () => {
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    })

    const { unmount } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )

    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('throws error when useThemeContext is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useThemeContext must be used within a ThemeProvider')

    consoleSpy.mockRestore()
  })

  it('uses custom default theme', () => {
    const customDefault = {
      mode: 'dark' as const,
      accessibility: {
        fontSize: 'large' as const
      }
    }

    render(
      <ThemeProvider defaultTheme={customDefault}>
        <TestComponent />
      </ThemeProvider>
    )

    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark')
    expect(screen.getByTestId('font-size')).toHaveTextContent('large')
  })
})