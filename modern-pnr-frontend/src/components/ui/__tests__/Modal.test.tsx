import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from '../Modal'

describe('Modal', () => {
  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        Modal content
      </Modal>
    )
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        Modal content
      </Modal>
    )
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('renders with title and description', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={vi.fn()} 
        title="Modal Title" 
        description="Modal description"
      >
        Modal content
      </Modal>
    )
    expect(screen.getByText('Modal Title')).toBeInTheDocument()
    expect(screen.getByText('Modal description')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        Modal content
      </Modal>
    )
    
    const closeButton = screen.getByLabelText('Close modal')
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        Modal content
      </Modal>
    )
    
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on escape when closeOnEscape is false', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} closeOnEscape={false}>
        Modal content
      </Modal>
    )
    
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose}>
        Modal content
      </Modal>
    )
    
    // Click on the backdrop
    const backdrop = screen.getByText('Modal content').closest('[role="dialog"]')?.parentElement
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })

  it('does not close on overlay click when closeOnOverlayClick is false', () => {
    const onClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onClose} closeOnOverlayClick={false}>
        Modal content
      </Modal>
    )
    
    const backdrop = screen.getByText('Modal content').closest('[role="dialog"]')?.parentElement
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).not.toHaveBeenCalled()
    }
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} size="sm">
        Small modal
      </Modal>
    )
    expect(screen.getByRole('dialog')).toHaveClass('max-w-md')

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} size="lg">
        Large modal
      </Modal>
    )
    expect(screen.getByRole('dialog')).toHaveClass('max-w-2xl')
  })

  it('has proper accessibility attributes', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={vi.fn()} 
        title="Accessible Modal"
        description="Modal description"
      >
        Modal content
      </Modal>
    )
    
    const modal = screen.getByRole('dialog')
    expect(modal).toHaveAttribute('aria-modal', 'true')
    expect(modal).toHaveAttribute('aria-labelledby')
    expect(modal).toHaveAttribute('aria-describedby')
  })
})