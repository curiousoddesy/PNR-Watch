import { ColorPalette } from '../contexts/ThemeContext'

export const lightTheme: ColorPalette = {
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#8b5cf6',
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
}

export const darkTheme: ColorPalette = {
  primary: '#60a5fa',
  secondary: '#94a3b8',
  accent: '#a78bfa',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  border: '#334155',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#22d3ee',
}

export const highContrastLightTheme: ColorPalette = {
  primary: '#0000ff',
  secondary: '#000000',
  accent: '#800080',
  background: '#ffffff',
  surface: '#f0f0f0',
  text: '#000000',
  textSecondary: '#333333',
  border: '#000000',
  success: '#008000',
  warning: '#ff8c00',
  error: '#ff0000',
  info: '#0000ff',
}

export const highContrastDarkTheme: ColorPalette = {
  primary: '#00ffff',
  secondary: '#ffffff',
  accent: '#ff00ff',
  background: '#000000',
  surface: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#cccccc',
  border: '#ffffff',
  success: '#00ff00',
  warning: '#ffff00',
  error: '#ff0000',
  info: '#00ffff',
}

export const themePresets = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast-light': highContrastLightTheme,
  'high-contrast-dark': highContrastDarkTheme,
}

export type ThemePreset = keyof typeof themePresets

export function getThemeColors(mode: 'light' | 'dark', highContrast: boolean): ColorPalette {
  if (highContrast) {
    return mode === 'dark' ? highContrastDarkTheme : highContrastLightTheme
  }
  return mode === 'dark' ? darkTheme : lightTheme
}

export function generateCSSVariables(colors: ColorPalette): Record<string, string> {
  return Object.entries(colors).reduce((acc, [key, value]) => {
    acc[`--color-${key}`] = value
    return acc
  }, {} as Record<string, string>)
}

export function applyThemeToDOM(colors: ColorPalette) {
  const root = document.documentElement
  const cssVars = generateCSSVariables(colors)
  
  Object.entries(cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value)
  })
}

// Utility to detect system preferences
export function getSystemPreferences() {
  return {
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
  }
}

// Color manipulation utilities
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const adjust = (value: number) => {
    const adjusted = Math.round(value * (1 + percent / 100))
    return Math.max(0, Math.min(255, adjusted))
  }

  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b))
}

export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex)
    if (!rgb) return 0

    const sRGB = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
  }

  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)

  return (brightest + 0.05) / (darkest + 0.05)
}

export function isAccessibleContrast(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5
}