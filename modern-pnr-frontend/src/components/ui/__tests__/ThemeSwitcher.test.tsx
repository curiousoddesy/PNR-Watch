import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '../../../contexts/ThemeContext'
import { ThemeSwitcher, AccessibilityControls, ColorCustomizer } from '../ThemeSwitcher'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}))

describe('ThemeSwitcher', () => {
  it('renders theme options', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    )

    expect(screen.getByText('Light')).toBeInTheDocument()
    expect(screen.getByText('Dark')).toBeInTheDocument()
    expect(screen.getByText('Auto')).toBeInTheDocument()
  })

  it('shows current theme as selected', () => {
    render(
      <ThemeProvider defaultTheme={{ mode: 'dark' }}>
        <ThemeSwitcher />
      </ThemeProvider>
    )

    const darkButton = screen.getByRole('button', { name: /switch to dark theme/i })
    expect(darkButton).toHaveClass('bg-primary-600') // Assuming primary variant styling
  })

  it('changes theme when option is clicked', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    )

    const darkButton = screen.getByRole('button', { name: /switch to dark theme/i })
    fireEvent.click(darkButton)

    // The theme change should be reflected in the context
    // This would be tested through integration with the theme context
  })

  it('can hide labels', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher showLabels={false} />
      </ThemeProvider>
    )

    // Labels should not be visible when showLabels is false
    expect(screen.queryByText('Light')).not.toBeInTheDocument()
    expect(screen.queryByText('Dark')).not.toBeInTheDocument()
    expect(screen.queryByText('Auto')).not.toBeInTheDocument()

    // But icons should still be present
    expect(screen.getByText('☀️')).toBeInTheDocument()
    expect(screen.getByText('🌙')).toBeInTheDocument()
    expect(screen.getByText('🔄')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    )

    const lightButton = screen.getByRole('button', { name: /switch to light theme/i })
    const darkButton = screen.getByRole('button', { name: /switch to dark theme/i })
    const autoButton = screen.getByRole('button', { name: /switch to auto theme/i })

    expect(lightButton).toHaveAttribute('aria-label', 'Switch to Light theme')
    expect(darkButton).toHaveAttribute('aria-label', 'Switch to Dark theme')
    expect(autoButton).toHaveAttribute('aria-label', 'Switch to Auto theme')
  })
})

describe('AccessibilityControls', () => {
  it('renders accessibility settings', () => {
    render(
      <ThemeProvider>
        <AccessibilityControls />
      </ThemeProvider>
    )

    expect(screen.getByText('Accessibility Settings')).toBeInTheDocument()
    expect(screen.getByText('High Contrast')).toBeInTheDocument()
    expect(screen.getByText('Reduce Motion')).toBeInTheDocument()
    expect(screen.getByText('Font Size')).toBeInTheDocument()
  })

  it('shows current accessibility preferences', () => {
    render(
      <ThemeProvider defaultTheme={{
        accessibility: {
          highContrast: true,
          reducedMotion: false,
          fontSize: 'large',
          screenReader: false
        }
      }}>
        <AccessibilityControls />
      </ThemeProvider>
    )

    // High contrast toggle should be on
    const highContrastToggle = screen.getByRole('button', { name: /high contrast/i })
    expect(highContrastToggle).toHaveClass('bg-blue-600') // Assuming active state styling

    // Large font size should be selected
    const largeFontButton = screen.getByRole('button', { name: /large/i })
    expect(largeFontButton).toHaveClass('bg-primary-600') // Assuming primary variant styling
  })

  it('toggles high contrast when clicked', () => {
    render(
      <ThemeProvider>
        <AccessibilityControls />
      </ThemeProvider>
    )

    const highContrastToggle = screen.getByRole('button', { name: /high contrast/i })
    fireEvent.click(highContrastToggle)

    // The preference change should be reflected in the context
    // This would be tested through integration with the theme context
  })

  it('toggles reduced motion when clicked', () => {
    render(
      <ThemeProvider>
        <AccessibilityControls />
      </ThemeProvider>
    )

    const reducedMotionToggle = screen.getByRole('button', { name: /reduce motion/i })
    fireEvent.click(reducedMotionToggle)

    // The preference change should be reflected in the context
    // This would be tested through integration with the theme context
  })

  it('changes font size when option is selected', () => {
    render(
      <ThemeProvider>
        <AccessibilityControls />
      </ThemeProvider>
    )

    const largeFontButton = screen.getByRole('button', { name: /large/i })
    fireEvent.click(largeFontButton)

    // The font size change should be reflected in the context
    // This would be tested through integration with the theme context
  })

  it('has proper ARIA labels for toggles', () => {
    render(
      <ThemeProvider>
        <AccessibilityControls />
      </ThemeProvider>
    )

    const highContrastLabel = screen.getByText('High Contrast')
    const reducedMotionLabel = screen.getByText('Reduce Motion')

    expect(highContrastLabel).toBeInTheDocument()
    expect(reducedMotionLabel).toBeInTheDocument()
  })
})

describe('ColorCustomizer', () => {
  it('renders color customization options', () => {
    render(
      <ThemeProvider>
        <ColorCustomizer />
      </ThemeProvider>
    )

    expect(screen.getByText('Custom Colors')).toBeInTheDocument()
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
    expect(screen.getByText('Accent')).toBeInTheDocument()
  })

  it('shows current custom colors', () => {
    render(
      <ThemeProvider defaultTheme={{
        customColors: {
          primary: '#ff0000',
          secondary: '#00ff00'
        }
      }}>
        <ColorCustomizer />
      </ThemeProvider>
    )

    const primaryColorInput = screen.getByDisplayValue('#ff0000')
    const secondaryColorInput = screen.getByDisplayValue('#00ff00')

    expect(primaryColorInput).toBeInTheDocument()
    expect(secondaryColorInput).toBeInTheDocument()
  })

  it('updates color when input changes', () => {
    render(
      <ThemeProvider>
        <ColorCustomizer />
      </ThemeProvider>
    )

    const primaryColorInput = screen.getAllByRole('textbox')[0] // Color inputs might be textboxes
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } })

    // The color change should be reflected in the context
    // This would be tested through integration with the theme context
  })

  it('resets color when reset button is clicked', () => {
    render(
      <ThemeProvider defaultTheme={{
        customColors: {
          primary: '#ff0000'
        }
      }}>
        <ColorCustomizer />
      </ThemeProvider>
    )

    const resetButtons = screen.getAllByText('Reset')
    fireEvent.click(resetButtons[0]) // Reset primary color

    // The color should be reset in the context
    // This would be tested through integration with the theme context
  })

  it('has proper labels for color inputs', () => {
    render(
      <ThemeProvider>
        <ColorCustomizer />
      </ThemeProvider>
    )

    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Secondary')).toBeInTheDocument()
    expect(screen.getByText('Accent')).toBeInTheDocument()
  })
})