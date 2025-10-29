import React, { createContext, useContext, useEffect, useState } from 'react'

export interface ColorPalette {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
  info: string
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto'
  customColors: Partial<ColorPalette>
  accessibility: {
    reducedMotion: boolean
    highContrast: boolean
    fontSize: 'small' | 'medium' | 'large'
    screenReader: boolean
  }
}

export interface ThemeContextValue {
  theme: ThemeConfig
  currentMode: 'light' | 'dark'
  setThemeMode: (mode: ThemeConfig['mode']) => void
  setCustomColors: (colors: Partial<ColorPalette>) => void
  setAccessibilityPreference: <K extends keyof ThemeConfig['accessibility']>(
    key: K,
    value: ThemeConfig['accessibility'][K]
  ) => void
  resetTheme: () => void
}

const defaultTheme: ThemeConfig = {
  mode: 'auto',
  customColors: {},
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    screenReader: false,
  },
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Partial<ThemeConfig>
}

export function ThemeProvider({ children, defaultTheme: initialTheme }: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    // Load theme from localStorage
    const stored = localStorage.getItem('theme-config')
    if (stored) {
      try {
        return { ...defaultTheme, ...JSON.parse(stored) }
      } catch {
        return { ...defaultTheme, ...initialTheme }
      }
    }
    return { ...defaultTheme, ...initialTheme }
  })

  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>('light')

  // Determine current mode based on theme.mode and system preference
  useEffect(() => {
    const updateCurrentMode = () => {
      if (theme.mode === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setCurrentMode(prefersDark ? 'dark' : 'light')
      } else {
        setCurrentMode(theme.mode)
      }
    }

    updateCurrentMode()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateCurrentMode)

    return () => mediaQuery.removeEventListener('change', updateCurrentMode)
  }, [theme.mode])

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement

    // Apply theme mode
    if (currentMode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Apply accessibility preferences
    if (theme.accessibility.reducedMotion) {
      root.classList.add('reduce-motion')
      root.style.setProperty('--motion-reduce', '1')
    } else {
      root.classList.remove('reduce-motion')
      root.style.removeProperty('--motion-reduce')
    }

    if (theme.accessibility.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }
    root.style.fontSize = fontSizeMap[theme.accessibility.fontSize]

    // Apply custom colors as CSS variables
    Object.entries(theme.customColors).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--color-${key}`, value)
      }
    })

    // Store theme in localStorage
    localStorage.setItem('theme-config', JSON.stringify(theme))
  }, [theme, currentMode])

  const setThemeMode = (mode: ThemeConfig['mode']) => {
    setTheme(prev => ({ ...prev, mode }))
  }

  const setCustomColors = (colors: Partial<ColorPalette>) => {
    setTheme(prev => ({
      ...prev,
      customColors: { ...prev.customColors, ...colors }
    }))
  }

  const setAccessibilityPreference = <K extends keyof ThemeConfig['accessibility']>(
    key: K,
    value: ThemeConfig['accessibility'][K]
  ) => {
    setTheme(prev => ({
      ...prev,
      accessibility: { ...prev.accessibility, [key]: value }
    }))
  }

  const resetTheme = () => {
    setTheme(defaultTheme)
    localStorage.removeItem('theme-config')
  }

  const value: ThemeContextValue = {
    theme,
    currentMode,
    setThemeMode,
    setCustomColors,
    setAccessibilityPreference,
    resetTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}