import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  GPUAnimation, 
  VirtualizedList, 
  OptimizedScroll,
  LazyAnimation,
  useReducedMotion,
  AccessibleAnimation,
  useAnimationPerformance
} from '../PerformanceOptimized'
import { renderHook } from '@testing-library/react'

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    motion: {
      div: vi.fn(({ children, style, onScroll, animate, ...props }) => (
        <div 
          style={style}
          onScroll={onScroll}
          {...props}
        >
          {children}
        </div>
      ))
    },
    useMotionValue: vi.fn(() => ({
      get: vi.fn(() => 0),
      set: vi.fn()
    })),
    useTransform: vi.fn((value, transform) => ({
      get: () => transform ? transform(0) : 0
    })),
    useSpring: vi.fn((value) => ({
      get: () => typeof value === 'object' ? value.get() : value
    }))
  }
})

// Mock Intersection Observer
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
})
window.IntersectionObserver = mockIntersectionObserver

// Mock matchMedia for reduced motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('GPUAnimation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies GPU acceleration styles', () => {
    const { motion } = require('framer-motion')
    
    render(
      <GPUAnimation>
        <div>GPU accelerated content</div>
      </GPUAnimation>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.objectContaining({
          transform: 'translateZ(0)',
          willChange: 'transform, opacity'
        })
      }),
      expect.anything()
    )
  })

  it('preserves existing transform styles', () => {
    const { motion } = require('framer-motion')
    
    render(
      <GPUAnimation style={{ transform: 'scale(1.5)' }}>
        <div>Existing transform</div>
      </GPUAnimation>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.objectContaining({
          transform: 'scale(1.5) translateZ(0)'
        })
      }),
      expect.anything()
    )
  })

  it('renders children correctly', () => {
    render(
      <GPUAnimation>
        <div>GPU content</div>
      </GPUAnimation>
    )
    
    expect(screen.getByText('GPU content')).toBeInTheDocument()
  })
})

describe('VirtualizedList', () => {
  const mockItems = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
  const mockRenderItem = (item: any) => <div key={item.id}>{item.name}</div>

  it('renders only visible items', () => {
    render(
      <VirtualizedList
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    )
    
    // Should not render all 1000 items
    expect(screen.queryByText('Item 100')).not.toBeInTheDocument()
    expect(screen.queryByText('Item 500')).not.toBeInTheDocument()
  })

  it('handles scroll events', () => {
    const { motion } = require('framer-motion')
    
    render(
      <VirtualizedList
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    )
    
    // Check that onScroll handler is attached
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        onScroll: expect.any(Function)
      }),
      expect.anything()
    )
  })

  it('calculates correct container height', () => {
    render(
      <VirtualizedList
        items={mockItems}
        renderItem={mockRenderItem}
        itemHeight={50}
        containerHeight={300}
      />
    )
    
    // Inner container should have height of all items
    const innerContainer = screen.getByRole('generic')
    expect(innerContainer).toHaveStyle({ height: '50000px' }) // 1000 * 50
  })
})

describe('OptimizedScroll', () => {
  it('attaches scroll handler with will-change optimization', () => {
    const onScroll = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <OptimizedScroll onScroll={onScroll}>
        <div>Scrollable content</div>
      </OptimizedScroll>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        onScroll: expect.any(Function),
        style: expect.objectContaining({
          willChange: 'scroll-position'
        })
      }),
      expect.anything()
    )
  })

  it('calls onScroll callback', () => {
    const onScroll = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <OptimizedScroll onScroll={onScroll}>
        <div>Scrollable content</div>
      </OptimizedScroll>
    )
    
    // Get the scroll handler
    const scrollHandler = motion.div.mock.calls[0][0].onScroll
    
    // Simulate scroll event
    scrollHandler({ currentTarget: { scrollTop: 100 } })
    
    expect(onScroll).toHaveBeenCalledWith(100)
  })
})

describe('LazyAnimation', () => {
  it('sets up intersection observer', () => {
    render(
      <LazyAnimation>
        <div>Lazy animated content</div>
      </LazyAnimation>
    )
    
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ threshold: 0.1 })
    )
  })

  it('uses custom threshold', () => {
    render(
      <LazyAnimation threshold={0.5}>
        <div>Custom threshold</div>
      </LazyAnimation>
    )
    
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ threshold: 0.5 })
    )
  })

  it('applies will-change optimization when visible', () => {
    const { motion } = require('framer-motion')
    
    render(
      <LazyAnimation>
        <div>Lazy content</div>
      </LazyAnimation>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.objectContaining({
          willChange: 'auto'
        })
      }),
      expect.anything()
    )
  })
})

describe('useReducedMotion', () => {
  it('returns false when reduced motion is not preferred', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when reduced motion is preferred', () => {
    // Mock matchMedia to return reduced motion preference
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })
})

describe('AccessibleAnimation', () => {
  it('uses reduced animation when preferred', () => {
    // Mock reduced motion preference
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { motion } = require('framer-motion')
    
    render(
      <AccessibleAnimation 
        animation={{ scale: [0, 1] }}
        reducedAnimation={{ opacity: [0, 1] }}
      >
        <div>Accessible animation</div>
      </AccessibleAnimation>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        animate: { opacity: [0, 1] },
        transition: expect.objectContaining({
          duration: 0.1
        })
      }),
      expect.anything()
    )
  })

  it('uses full animation when reduced motion is not preferred', () => {
    // Reset matchMedia mock
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { motion } = require('framer-motion')
    
    render(
      <AccessibleAnimation 
        animation={{ scale: [0, 1] }}
        reducedAnimation={{ opacity: [0, 1] }}
      >
        <div>Accessible animation</div>
      </AccessibleAnimation>
    )
    
    expect(motion.div).toHaveBeenCalledWith(
      expect.objectContaining({
        animate: { scale: [0, 1] },
        transition: expect.objectContaining({
          duration: 0.6
        })
      }),
      expect.anything()
    )
  })
})

describe('useAnimationPerformance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Mock performance.now
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now())
    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 16) // ~60fps
      return 1
    })
    global.cancelAnimationFrame = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('measures FPS correctly', () => {
    const { result } = renderHook(() => useAnimationPerformance())
    
    // Initial FPS should be 60
    expect(result.current.fps).toBe(60)
    expect(result.current.isPerformant).toBe(true)
  })

  it('detects poor performance', () => {
    // Mock slower frame rate
    global.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(cb, 50) // ~20fps
      return 1
    })

    const { result } = renderHook(() => useAnimationPerformance())
    
    // Advance time to trigger FPS calculation
    vi.advanceTimersByTime(1000)
    
    expect(result.current.isPerformant).toBe(false)
  })
})

describe('Performance Benchmarks', () => {
  it('should handle large numbers of animations efficiently', () => {
    const startTime = performance.now()
    
    // Render many GPU animations
    for (let i = 0; i < 100; i++) {
      render(
        <GPUAnimation key={i}>
          <div>Animation {i}</div>
        </GPUAnimation>
      )
    }
    
    const endTime = performance.now()
    
    // Should complete quickly (less than 100ms for 100 animations)
    expect(endTime - startTime).toBeLessThan(100)
  })

  it('should optimize memory usage with virtualized lists', () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({ id: i }))
    
    const { container } = render(
      <VirtualizedList
        items={largeDataset}
        renderItem={(item) => <div key={item.id}>Item {item.id}</div>}
        itemHeight={50}
        containerHeight={500}
      />
    )
    
    // Should only render visible items, not all 10000
    const renderedItems = container.querySelectorAll('div')
    expect(renderedItems.length).toBeLessThan(50) // Much less than 10000
  })

  it('should handle rapid scroll events without performance issues', () => {
    const onScroll = vi.fn()
    const { motion } = require('framer-motion')
    
    render(
      <OptimizedScroll onScroll={onScroll}>
        <div>Scrollable content</div>
      </OptimizedScroll>
    )
    
    const scrollHandler = motion.div.mock.calls[0][0].onScroll
    
    // Simulate rapid scroll events
    const startTime = performance.now()
    for (let i = 0; i < 1000; i++) {
      scrollHandler({ currentTarget: { scrollTop: i } })
    }
    const endTime = performance.now()
    
    // Should handle 1000 scroll events quickly
    expect(endTime - startTime).toBeLessThan(50)
    expect(onScroll).toHaveBeenCalledTimes(1000)
  })
})