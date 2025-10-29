import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  MicroInteraction, 
  HoverScale, 
  TapScale, 
  PulseAnimation, 
  BounceAnimation 
} from '../MicroInteraction'

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    motion: {
      div: vi.fn(({ children, onMouseEnter, onMouseLeave, onTouchStart, onTouchEnd, ...props }) => (
        <div 
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          {...props}
        >
          {children}
        </div>
      ))
    }
  }
})

describe('MicroInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children correctly', () => {
    render(
      <MicroInteraction>
        <div>Interactive content</div>
      </MicroInteraction>
    )
    
    expect(screen.getByText('Interactive content')).toBeInTheDocument()
  })

  it('applies hover variant correctly', () => {
    const { motion } = require('framer-motion')
    
    render(
      <MicroInteraction variant="hover" intensity="normal">
        <div>Hover me</div>
      </MicroInteraction>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        variants: expect.objectContaining({
          rest: { scale: 1 },
          hover: { scale: 1.02 }
        }),
        whileHover: 'hover'
      }),
      expect.anything()
    )
  })

  it('applies tap variant correctly', () => {
    const { motion } = require('framer-motion')
    
    render(
      <MicroInteraction variant="tap" intensity="strong">
        <div>Tap me</div>
      </MicroInteraction>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        variants: expect.objectContaining({
          rest: { scale: 1 },
          tap: { scale: 0.95 }
        }),
        whileTap: 'tap'
      }),
      expect.anything()
    )
  })

  it('handles disabled state correctly', () => {
    render(
      <MicroInteraction disabled>
        <div>Disabled interaction</div>
      </MicroInteraction>
    )
    
    // Should render as regular div when disabled
    expect(screen.getByText('Disabled interaction')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <MicroInteraction className="custom-interaction">
        <div>Custom class</div>
      </MicroInteraction>
    )
    
    const { motion } = require('framer-motion')
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        className: 'custom-interaction'
      }),
      expect.anything()
    )
  })

  describe('Specialized Components', () => {
    it('HoverScale uses hover variant', () => {
      const { motion } = require('framer-motion')
      
      render(
        <HoverScale>
          <div>Hover scale</div>
        </HoverScale>
      )
      
      expect(motion.div).toHaveBeenCalledWith(
        expect.objectContaining({
          whileHover: 'hover'
        }),
        expect.anything()
      )
    })

    it('TapScale uses tap variant', () => {
      const { motion } = require('framer-motion')
      
      render(
        <TapScale>
          <div>Tap scale</div>
        </TapScale>
      )
      
      expect(motion.div).toHaveBeenCalledWith(
        expect.objectContaining({
          whileTap: 'tap'
        }),
        expect.anything()
      )
    })

    it('PulseAnimation uses pulse variant', () => {
      const { motion } = require('framer-motion')
      
      render(
        <PulseAnimation>
          <div>Pulse animation</div>
        </PulseAnimation>
      )
      
      expect(motion.div).toHaveBeenCalledWith(
        expect.objectContaining({
          animate: 'animate'
        }),
        expect.anything()
      )
    })

    it('BounceAnimation uses bounce variant', () => {
      const { motion } = require('framer-motion')
      
      render(
        <BounceAnimation>
          <div>Bounce animation</div>
        </BounceAnimation>
      )
      
      expect(motion.div).toHaveBeenCalledWith(
        expect.objectContaining({
          animate: 'animate'
        }),
        expect.anything()
      )
    })
  })

  describe('Performance', () => {
    it('should use appropriate transition timing', () => {
      const { motion } = require('framer-motion')
      
      render(
        <MicroInteraction variant="hover">
          <div>Performance test</div>
        </MicroInteraction>
      )
      
      expect(motion.div).toHaveBeenCalledWith(
        expect.objectContaining({
          transition: expect.objectContaining({
            type: 'spring',
            stiffness: 400,
            damping: 17
          })
        }),
        expect.anything()
      )
    })

    it('should handle rapid interactions without performance issues', () => {
      const { motion } = require('framer-motion')
      
      render(
        <MicroInteraction variant="hover">
          <div>Rapid interaction test</div>
        </MicroInteraction>
      )
      
      // Simulate rapid hover events
      const element = screen.getByText('Rapid interaction test')
      
      // Multiple rapid events should not cause issues
      for (let i = 0; i < 10; i++) {
        fireEvent.mouseEnter(element)
        fireEvent.mouseLeave(element)
      }
      
      // Component should still be rendered
      expect(element).toBeInTheDocument()
    })
  })
})