import React from 'react'
import { motion } from 'framer-motion'
import { useThemeContext } from '../../contexts/ThemeContext'
import { Button } from './Button'

interface ThemeSwitcherProps {
  className?: string
  showLabels?: boolean
}

export function ThemeSwitcher({ className = '', showLabels = true }: ThemeSwitcherProps) {
  const { theme, currentMode, setThemeMode } = useThemeContext()

  const themes = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'auto' as const, label: 'Auto', icon: '🔄' },
  ]

  return (
    <div className={`flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
      {themes.map((themeOption) => (
        <motion.div key={themeOption.value} className="relative">
          <Button
            variant={theme.mode === themeOption.value ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setThemeMode(themeOption.value)}
            className="relative px-3 py-2 text-sm font-medium transition-colors"
            aria-label={`Switch to ${themeOption.label} theme`}
          >
            <span className="mr-2">{themeOption.icon}</span>
            {showLabels && themeOption.label}
          </Button>
          {theme.mode === themeOption.value && (
            <motion.div
              layoutId="theme-indicator"
              className="absolute inset-0 bg-white dark:bg-gray-700 rounded-md shadow-sm"
              style={{ zIndex: -1 }}
              initial={false}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}

interface AccessibilityControlsProps {
  className?: string
}

export function AccessibilityControls({ className = '' }: AccessibilityControlsProps) {
  const { theme, setAccessibilityPreference } = useThemeContext()

  const fontSizes = [
    { value: 'small' as const, label: 'Small', size: '14px' },
    { value: 'medium' as const, label: 'Medium', size: '16px' },
    { value: 'large' as const, label: 'Large', size: '18px' },
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Accessibility Settings
        </h3>
        
        <div className="space-y-3">
          {/* High Contrast Toggle */}
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              High Contrast
            </span>
            <motion.button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme.accessibility.highContrast
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
              onClick={() =>
                setAccessibilityPreference('highContrast', !theme.accessibility.highContrast)
              }
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg"
                animate={{
                  x: theme.accessibility.highContrast ? 24 : 4,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </label>

          {/* Reduced Motion Toggle */}
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Reduce Motion
            </span>
            <motion.button
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme.accessibility.reducedMotion
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
              onClick={() =>
                setAccessibilityPreference('reducedMotion', !theme.accessibility.reducedMotion)
              }
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg"
                animate={{
                  x: theme.accessibility.reducedMotion ? 24 : 4,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </motion.button>
          </label>

          {/* Font Size Selection */}
          <div>
            <span className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
              Font Size
            </span>
            <div className="flex gap-1">
              {fontSizes.map((size) => (
                <Button
                  key={size.value}
                  variant={theme.accessibility.fontSize === size.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setAccessibilityPreference('fontSize', size.value)}
                  className="text-xs"
                  style={{ fontSize: size.size }}
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ColorCustomizerProps {
  className?: string
}

export function ColorCustomizer({ className = '' }: ColorCustomizerProps) {
  const { theme, setCustomColors } = useThemeContext()

  const colorKeys = [
    { key: 'primary', label: 'Primary' },
    { key: 'secondary', label: 'Secondary' },
    { key: 'accent', label: 'Accent' },
  ] as const

  const handleColorChange = (key: string, value: string) => {
    setCustomColors({ [key]: value })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        Custom Colors
      </h3>
      
      <div className="grid grid-cols-1 gap-3">
        {colorKeys.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              {label}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={theme.customColors[key] || '#3b82f6'}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleColorChange(key, '')}
                className="text-xs"
              >
                Reset
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}