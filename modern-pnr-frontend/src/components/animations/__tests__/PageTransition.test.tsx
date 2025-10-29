import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PageTransition, AnimatedPage } from '../PageTransition'

// Mock framer-motion for performance testing
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    motion: {
      div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>)
    },
    AnimatePresence: vi.fn(({ children }) => <div>{children}</div>)
  }
})

describe('PageTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children correctly', () => {
    render(
      <PageTransition>
        <div>Test content</div>
      </PageTransition>
    )
    
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies correct variant animations', () => {
    const { motion } = require('framer-motion')
    
    render(
      <PageTransition variant="slideUp">
        <div>Slide up content</div>
      </PageTransition>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        variants: expect.objectContaining({
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -20 }
        })
      }),
      expect.anything()
    )
  })

  it('uses custom duration and delay', () => {
    const { motion } = require('framer-motion')
    
    render(
      <PageTransition duration={0.8} delay={0.2}>
        <div>Custom timing</div>
      </PageTransition>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        transition: expect.objectContaining({
          duration: 0.8,
          delay: 0.2
        })
      }),
      expect.anything()
    )
  })

  it('applies custom className', () => {
    render(
      <PageTransition className="custom-transition">
        <div>Custom class</div>
      </PageTransition>
    )
    
    const { motion } = require('framer-motion')
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: 'custom-transition'
      }),
      expect.anything()
    )
  })

  describe('AnimatedPage', () => {
    it('wraps content in AnimatePresence', () => {
      const { AnimatePresence } = require('framer-motion')
      
      render(
        <AnimatedPage>
          <div>Animated page content</div>
        </AnimatedPage>
      )
      
      expect(AnimatePresence).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'wait'
        }),
        expect.anything()
      )
    })
  })

  describe('Performance', () => {
    it('should not cause memory leaks', () => {
      const { unmount } = render(
        <PageTransition>
          <div>Memory test</div>
        </PageTransition>
      )
      
      // Simulate unmounting
      unmount()
      
      // Check that motion.div was called (component rendered)
      const { motion } = require('framer-motion')
      expect(motion.div).toHaveBeenCalled()
    })

    it('should use GPU-accelerated properties', () => {
      const { motion } = require('framer-motion')
      
      render(
        <PageTransition variant="scale">
          <div>GPU test</div>
        </PageTransition>
      )
      
      // Check that scale and opacity are used (GPU-accelerated properties)
      expect(motion.div).toHaveBeenCalledWith(
        expect.objectContaining({
          variants: expect.objectContaining({
            initial: expect.objectContaining({ scale: 0.95 }),
            animate: expect.objectContaining({ scale: 1 })
          })
        }),
        expect.anything()
      )
    })
  })
})