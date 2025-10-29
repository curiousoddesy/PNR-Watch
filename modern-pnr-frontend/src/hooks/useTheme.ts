import { useThemeContext } from '../contexts/ThemeContext'

export function useTheme() {
  const { theme, currentMode, setThemeMode, setAccessibilityPreference } = useThemeContext()

  return {
    theme: theme.mode,
    currentMode,
    setTheme: setThemeMode,
    accessibility: theme.accessibility,
    setAccessibilityPreference,
  }
}