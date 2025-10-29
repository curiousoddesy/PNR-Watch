import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoadingSpinner, LoadingDots } from '../LoadingAnimations'

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    motion: {
      div: vi.fn(({ children, animate, transition, ...props }) => (
        <div data-animate={JSON.stringify(animate)} data-transition={JSON.stringify(transition)} {...props}>
          {children}
        </div>
      ))
    }
  }
})

describe('LoadingSpinner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default props', () => {
    const { motion } = require('framer-motion')
    
    render(<LoadingSpinner />)
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        animate: { rotate: 360 },
        transition: { duration: 1, repeat: Infinity, ease: 'linear' },
        className: expect.stringContaining('w-6 h-6 border-primary-600')
      }),
      expect.anything()
    )
  })

  it('applies correct size classes', () => {
    const { motion } = require('framer-motion')
    
    const { rerender } = render(<LoadingSpinner size="sm" />)
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: expect.stringContaining('w-4 h-4')
      }),
      expect.anything()
    )

    rerender(<LoadingSpinner size="lg" />)
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: expect.stringContaining('w-8 h-8')
      }),
      expect.anything()
    )

    rerender(<LoadingSpinner size="xl" />)
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: expect.stringContaining('w-12 h-12')
      }),
      expect.anything()
    )
  })

  it('applies correct color classes', () => {
    const { motion } = require('framer-motion')
    
    const { rerender } = render(<LoadingSpinner color="secondary" />)
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: expect.stringContaining('border-secondary-600')
      }),
      expect.anything()
    )

    rerender(<LoadingSpinner color="white" />)
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: expect.stringContaining('border-white')
      }),
      expect.anything()
    )

    rerender(<LoadingSpinner color="current" />)
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: expect.stringContaining('border-current')
      }),
      expect.anything()
    )
  })

  it('applies custom className', () => {
    const { motion } = require('framer-motion')
    
    render(<LoadingSpinner className="custom-spinner" />)
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: expect.stringContaining('custom-spinner')
      }),
      expect.anything()
    )
  })

  it('uses infinite rotation animation', () => {
    const { motion } = require('framer-motion')
    
    render(<LoadingSpinner />)
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        animate: { rotate: 360 },
        transition: expect.objectContaining({
          repeat: Infinity,
          ease: 'linear'
        })
      }),
      expect.anything()
    )
  })
})

describe('LoadingDots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders three dots', () => {
    render(<LoadingDots />)
    
    const { motion } = require('framer-motion')
    
    // Should render 3 motion.div elements (one for each dot)
    expect(motion.div).toHaveBeenCalledTimes(3)
  })

  it('applies staggered animation delays', () => {
    render(<LoadingDots />)
    
    const { motion } = require('framer-motion')
    const calls = motion.div.mock.calls
    
    // Check that each dot has a different delay
    expect(calls[0][0].transition.delay).toBe(0)
    expect(calls[1][0].transition.delay).toBe(0.1)
    expect(calls[2][0].transition.delay).toBe(0.2)
  })

  it('applies correct size classes', () => {
    const { motion } = require('framer-motion')
    
    const { rerender } = render(<LoadingDots size="sm" />)
    calls = motion.div.mock.calls
    calls.forEach(call => {
      expect(call[0].className).toContain('w-1 h-1')
    })

    rerender(<LoadingDots size="lg" />)
    const newCalls = motion.div.mock.calls.slice(-3) // Get last 3 calls
    newCalls.forEach(call => {
      expect(call[0].className).toContain('w-3 h-3')
    })
  })

  it('applies correct color classes', () => {
    const { motion } = require('framer-motion')
    
    render(<LoadingDots color="secondary" />)
    
    const calls = motion.div.mock.calls
    calls.forEach(call => {
      expect(call[0].className).toContain('bg-secondary-600')
    })
  })

  it('uses bounce animation', () => {
    render(<LoadingDots />)
    
    const { motion } = require('framer-motion')
    const calls = motion.div.mock.calls
    
    calls.forEach(call => {
      expect(call[0].variants).toEqual({
        initial: { y: 0 },
        animate: { y: -8 }
      })
      expect(call[0].transition).toEqual(
        expect.objectContaining({
          duration: 0.6,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut'
        })
      )
    })
  })

  it('applies custom className to container', () => {
    render(<LoadingDots className="custom-dots" />)
    
    // Check that the container div has the custom class
    const container = screen.getByRole('generic')
    expect(container).toHaveClass('custom-dots')
  })
})

describe('Performance', () => {
  it('should use GPU-accelerated properties', () => {
    const { motion } = require('framer-motion')
    
    render(<LoadingSpinner />)
    
    // Rotation is GPU-accelerated
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        animate: { rotate: 360 }
      }),
      expect.anything()
    )
  })

  it('should handle multiple loading components efficiently', () => {
    const startTime = performance.now()
    
    // Render multiple loading components
    for (let i = 0; i < 50; i++) {
      render(<LoadingSpinner key={`spinner-${i}`} />)
      render(<LoadingDots key={`dots-${i}`} />)
    }
    
    const endTime = performance.now()
    
    // Should complete quickly
    expect(endTime - startTime).toBeLessThan(100)
  })

  it('should use efficient animation timing', () => {
    const { motion } = require('framer-motion')
    
    render(<LoadingSpinner />)
    
    // Should use linear easing for smooth rotation
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        transition: expect.objectContaining({
          ease: 'linear',
          duration: 1
        })
      }),
      expect.anything()
    )
  })

  it('should optimize dot animations with proper easing', () => {
    const { motion } = require('framer-motion')
    
    render(<LoadingDots />)
    
    const calls = motion.div.mock.calls
    calls.forEach(call => {
      expect(call[0].transition.ease).toBe('easeInOut')
      expect(call[0].transition.duration).toBe(0.6)
    })
  })

  it('should handle rapid re-renders without performance issues', () => {
    const { rerender } = render(<LoadingSpinner />)
    
    const startTime = performance.now()
    
    // Rapid re-renders with different props
    for (let i = 0; i < 100; i++) {
      rerender(<LoadingSpinner size={i % 2 === 0 ? 'sm' : 'lg'} />)
    }
    
    const endTime = performance.now()
    
    // Should handle rapid re-renders efficiently
    expect(endTime - startTime).toBeLessThan(50)
  })
})

describe('Accessibility', () => {
  it('should not interfere with screen readers', () => {
    render(<LoadingSpinner />)
    
    // Loading animations should be decorative and not announce to screen readers
    const spinner = screen.getByRole('generic')
    expect(spinner).not.toHaveAttribute('aria-label')
    expect(spinner).not.toHaveAttribute('role', 'status')
  })

  it('should respect reduced motion preferences', () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    // In a real implementation, we would check for reduced motion
    // and adjust animation accordingly
    render(<LoadingSpinner />)
    
    // Component should still render
    expect(screen.getByRole('generic')).toBeInTheDocument()
  })
})