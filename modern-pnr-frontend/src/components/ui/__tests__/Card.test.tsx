import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card'

describe('Card', () => {
  it('renders with default props', () => {
    render(<Card>Card content</Card>)
    const card = screen.getByText('Card content')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('bg-white', 'dark:bg-secondary-800')
  })

  it('renders different variants correctly', () => {
    const { rerender } = render(<Card variant="elevated">Elevated</Card>)
    expect(screen.getByText('Elevated')).toHaveClass('shadow-lg')

    rerender(<Card variant="outlined">Outlined</Card>)
    expect(screen.getByText('Outlined')).toHaveClass('border')

    rerender(<Card variant="ghost">Ghost</Card>)
    expect(screen.getByText('Ghost')).toHaveClass('bg-transparent')
  })

  it('renders different padding sizes correctly', () => {
    const { rerender } = render(<Card padding="sm">Small padding</Card>)
    expect(screen.getByText('Small padding')).toHaveClass('p-3')

    rerender(<Card padding="lg">Large padding</Card>)
    expect(screen.getByText('Large padding')).toHaveClass('p-6')

    rerender(<Card padding="none">No padding</Card>)
    expect(screen.getByText('No padding')).not.toHaveClass('p-3', 'p-4', 'p-6', 'p-8')
  })

  it('handles hoverable state correctly', () => {
    render(<Card hoverable>Hoverable card</Card>)
    const card = screen.getByText('Hoverable card')
    expect(card).toHaveClass('cursor-pointer')
  })

  it('handles click events when hoverable', () => {
    const handleClick = vi.fn()
    render(<Card hoverable onClick={handleClick}>Clickable card</Card>)
    
    fireEvent.click(screen.getByText('Clickable card'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<Card className="custom-class">Custom card</Card>)
    expect(screen.getByText('Custom card')).toHaveClass('custom-class')
  })
})

describe('CardHeader', () => {
  it('renders correctly', () => {
    render(<CardHeader>Header content</CardHeader>)
    const header = screen.getByText('Header content')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'pb-4')
  })
})

describe('CardTitle', () => {
  it('renders correctly', () => {
    render(<CardTitle>Card Title</CardTitle>)
    const title = screen.getByText('Card Title')
    expect(title).toBeInTheDocument()
    expect(title.tagName).toBe('H3')
    expect(title).toHaveClass('text-lg', 'font-semibold')
  })
})

describe('CardDescription', () => {
  it('renders correctly', () => {
    render(<CardDescription>Card description</CardDescription>)
    const description = screen.getByText('Card description')
    expect(description).toBeInTheDocument()
    expect(description.tagName).toBe('P')
    expect(description).toHaveClass('text-sm', 'text-secondary-600')
  })
})

describe('CardContent', () => {
  it('renders correctly', () => {
    render(<CardContent>Card content</CardContent>)
    const content = screen.getByText('Card content')
    expect(content).toBeInTheDocument()
  })
})

describe('CardFooter', () => {
  it('renders correctly', () => {
    render(<CardFooter>Footer content</CardFooter>)
    const footer = screen.getByText('Footer content')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveClass('flex', 'items-center', 'pt-4')
  })
})