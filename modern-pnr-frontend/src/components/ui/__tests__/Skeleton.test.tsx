import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Skeleton, SkeletonText, SkeletonCircle, SkeletonCard, SkeletonList } from '../Skeleton'

describe('Skeleton', () => {
  it('renders with default props', () => {
    render(<Skeleton data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('bg-secondary-200', 'dark:bg-secondary-700')
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Skeleton variant="text" data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('h-4', 'rounded')

    rerender(<Skeleton variant="circular" data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-full')

    rerender(<Skeleton variant="rectangular" data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-none')

    rerender(<Skeleton variant="rounded" data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('rounded-md')
  })

  it('renders multiple lines for text variant', () => {
    const { container } = render(<Skeleton variant="text" lines={3} />)
    const skeletonContainer = container.firstChild as HTMLElement
    expect(skeletonContainer).toBeInTheDocument()
    expect(skeletonContainer).toHaveClass('space-y-2')
    
    // Should have 3 skeleton lines (direct children)
    const skeletonLines = skeletonContainer.children
    expect(skeletonLines).toHaveLength(3)
  })

  it('applies custom width and height', () => {
    render(<Skeleton width="200px" height="100px" data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveStyle({ width: '200px', height: '100px' })
  })

  it('can disable animation', () => {
    render(<Skeleton animate={false} data-testid="skeleton" />)
    const skeleton = screen.getByTestId('skeleton')
    // Should not have the shimmer animation element
    expect(skeleton.querySelector('.absolute')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Skeleton className="custom-class" data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('custom-class')
  })
})

describe('SkeletonText', () => {
  it('renders as text variant', () => {
    render(<SkeletonText data-testid="skeleton-text" />)
    const skeleton = screen.getByTestId('skeleton-text')
    expect(skeleton).toHaveClass('h-4', 'rounded')
  })
})

describe('SkeletonCircle', () => {
  it('renders as circular variant', () => {
    render(<SkeletonCircle data-testid="skeleton-circle" />)
    const skeleton = screen.getByTestId('skeleton-circle')
    expect(skeleton).toHaveClass('rounded-full')
  })
})

describe('SkeletonCard', () => {
  it('renders card skeleton structure', () => {
    const { container } = render(<SkeletonCard />)
    const card = container.firstChild as HTMLElement
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('p-4', 'space-y-3')
  })
})

describe('SkeletonList', () => {
  it('renders default number of items', () => {
    const { container } = render(<SkeletonList />)
    const list = container.firstChild as HTMLElement
    expect(list).toBeInTheDocument()
    expect(list).toHaveClass('space-y-4')
    
    // Should have 3 items by default
    const items = list.querySelectorAll('.flex.items-center')
    expect(items).toHaveLength(3)
  })

  it('renders custom number of items', () => {
    const { container } = render(<SkeletonList items={5} />)
    const list = container.firstChild as HTMLElement
    const items = list.querySelectorAll('.flex.items-center')
    expect(items).toHaveLength(5)
  })

  it('can hide avatars', () => {
    const { container } = render(<SkeletonList showAvatar={false} />)
    const list = container.firstChild as HTMLElement
    // Should not have circular skeletons (avatars)
    const avatars = list.querySelectorAll('.rounded-full')
    expect(avatars).toHaveLength(0)
  })
})