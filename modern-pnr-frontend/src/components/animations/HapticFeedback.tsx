import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

export interface HapticFeedbackProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  pattern?: HapticPattern
  trigger?: 'tap' | 'hover' | 'focus' | 'manual'
  disabled?: boolean
  onHaptic?: (pattern: HapticPattern) => void
}

// Haptic patterns mapped to vibration durations/patterns
const hapticPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 50,
  heavy: 100,
  success: [50, 50, 50],
  warning: [100, 50, 100],
  error: [200, 100, 200],
  selection: 25
}

// Check if haptic feedback is supported
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator && typeof navigator.vibrate === 'function'
}

// Trigger haptic feedback
export const triggerHaptic = (pattern: HapticPattern): void => {
  if (!isHapticSupported()) return
  
  const vibrationPattern = hapticPatterns[pattern]
  navigator.vibrate(vibrationPattern)
}

// Check if device supports advanced haptics (iOS Safari)
export const isAdvancedHapticSupported = (): boolean => {
  return 'DeviceMotionEvent' in window && 'requestPermission' in (DeviceMotionEvent as any)
}

// Advanced haptic feedback for iOS devices
export const triggerAdvancedHaptic = async (type: 'impact' | 'notification' | 'selection' = 'impact'): Promise<void> => {
  // This would require iOS Safari's Haptic API which is not directly accessible
  // For now, fall back to basic vibration
  const patternMap = {
    impact: 'medium' as HapticPattern,
    notification: 'success' as HapticPattern,
    selection: 'selection' as HapticPattern
  }
  
  triggerHaptic(patternMap[type])
}

export const HapticFeedback: React.FC<HapticFeedbackProps> = ({
  children,
  pattern = 'light',
  trigger = 'tap',
  disabled = false,
  onHaptic,
  ...props
}) => {
  const handleHaptic = React.useCallback(() => {
    if (disabled) return
    
    triggerHaptic(pattern)
    onHaptic?.(pattern)
  }, [pattern, disabled, onHaptic])

  const motionProps: any = { ...props }

  // Add appropriate event handlers based on trigger type
  switch (trigger) {
    case 'tap':
      motionProps.onTap = (event: any) => {
        handleHaptic()
        props.onTap?.(event)
      }
      motionProps.whileTap = { scale: 0.98 }
      break
    case 'hover':
      motionProps.onHoverStart = (event: any) => {
        handleHaptic()
        props.onHoverStart?.(event)
      }
      break
    case 'focus':
      motionProps.onFocus = (event: any) => {
        handleHaptic()
        props.onFocus?.(event)
      }
      break
    case 'manual':
      // No automatic triggers, haptic must be triggered manually
      break
  }

  return (
    <motion.div {...motionProps}>
      {children}
    </motion.div>
  )
}

// Specialized haptic components
export interface HapticButtonProps extends Omit<HapticFeedbackProps, 'trigger'> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
}

export const HapticButton: React.FC<HapticButtonProps> = ({
  variant = 'primary',
  pattern,
  ...props
}) => {
  // Map button variants to haptic patterns if not explicitly provided
  const defaultPattern = pattern || {
    primary: 'medium',
    secondary: 'light',
    success: 'success',
    warning: 'warning',
    error: 'error'
  }[variant] as HapticPattern

  return (
    <HapticFeedback
      trigger="tap"
      pattern={defaultPattern}
      {...props}
    />
  )
}

export interface HapticCardProps extends Omit<HapticFeedbackProps, 'trigger'> {
  interactive?: boolean
}

export const HapticCard: React.FC<HapticCardProps> = ({
  interactive = true,
  pattern = 'light',
  ...props
}) => {
  return (
    <HapticFeedback
      trigger={interactive ? 'tap' : 'manual'}
      pattern={pattern}
      {...props}
    />
  )
}

// Hook for manual haptic control
export const useHaptic = () => {
  const trigger = React.useCallback((pattern: HapticPattern) => {
    triggerHaptic(pattern)
  }, [])

  const triggerAdvanced = React.useCallback(async (type: 'impact' | 'notification' | 'selection' = 'impact') => {
    await triggerAdvancedHaptic(type)
  }, [])

  return {
    trigger,
    triggerAdvanced,
    isSupported: isHapticSupported(),
    isAdvancedSupported: isAdvancedHapticSupported()
  }
}

// Context for global haptic settings
export interface HapticContextValue {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  globalIntensity: number
  setGlobalIntensity: (intensity: number) => void
}

export const HapticContext = React.createContext<HapticContextValue | null>(null)

export interface HapticProviderProps {
  children: React.ReactNode
  defaultEnabled?: boolean
  defaultIntensity?: number
}

export const HapticProvider: React.FC<HapticProviderProps> = ({
  children,
  defaultEnabled = true,
  defaultIntensity = 1
}) => {
  const [enabled, setEnabled] = React.useState(defaultEnabled)
  const [globalIntensity, setGlobalIntensity] = React.useState(defaultIntensity)

  const value = React.useMemo(() => ({
    enabled,
    setEnabled,
    globalIntensity,
    setGlobalIntensity
  }), [enabled, globalIntensity])

  return (
    <HapticContext.Provider value={value}>
      {children}
    </HapticContext.Provider>
  )
}

export const useHapticContext = () => {
  const context = React.useContext(HapticContext)
  if (!context) {
    throw new Error('useHapticContext must be used within a HapticProvider')
  }
  return context
}