// Tests for PWA install prompt component

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PWAInstallPrompt, PWAInstallButton } from '../PWAInstallPrompt'

// Mock the PWA hook
const mockUsePWA = {
  canInstall: true,
  isInstalled: false,
  install: vi.fn(),
}

vi.mock('../../../utils/pwa', () => ({
  usePWA: () => mockUsePWA,
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePWA.canInstall = true
    mockUsePWA.isInstalled = false
    mockUsePWA.install.mockResolvedValue(true)
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Banner variant', () => {
    it('should render banner when conditions are met', async () => {
      render(<PWAInstallPrompt variant="banner" autoShow={true} showDelay={0} />)
      
      await waitFor(() => {
        expect(screen.getByText('Install PNR Tracker')).toBeInTheDocument()
        expect(screen.getByText('Get quick access from your home screen')).toBeInTheDocument()
      })
    })

    it('should not render when app is already installed', () => {
      mockUsePWA.isInstalled = true
      
      render(<PWAInstallPrompt variant="banner" autoShow={true} showDelay={0} />)
      
      expect(screen.queryByText('Install PNR Tracker')).not.toBeInTheDocument()
    })

    it('should not render when install is not available', () => {
      mockUsePWA.canInstall = false
      
      render(<PWAInstallPrompt variant="banner" autoShow={true} showDelay={0} />)
      
      expect(screen.queryByText('Install PNR Tracker')).not.toBeInTheDocument()
    })

    it('should not render when previously dismissed', () => {
      localStorageMock.getItem.mockReturnValue('1234567890')
      
      render(<PWAInstallPrompt variant="banner" autoShow={true} showDelay={0} />)
      
      expect(screen.queryByText('Install PNR Tracker')).not.toBeInTheDocument()
    })

    it('should call install function when install button is clicked', async () => {
      render(<PWAInstallPrompt variant="banner" autoShow={true} showDelay={0} />)
      
      await waitFor(() => {
        expect(screen.getByText('Install')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Install'))
      
      expect(mockUsePWA.install).toHaveBeenCalled()
    })

    it('should dismiss and store preference when close button is clicked', async () => {
      render(<PWAInstallPrompt variant="banner" autoShow={true} showDelay={0} />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByRole('button', { name: /close/i }))
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pwa-install-dismissed',
        expect.any(String)
      )
    })

    it('should show installing state during installation', async () => {
      mockUsePWA.install.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
      
      render(<PWAInstallPrompt variant="banner" autoShow={true} showDelay={0} />)
      
      await waitFor(() => {
        expect(screen.getByText('Install')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Install'))
      
      expect(screen.getByText('Installing...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.queryByText('Installing...')).not.toBeInTheDocument()
      })
    })
  })

  describe('Modal variant', () => {
    it('should render modal with features list', async () => {
      render(<PWAInstallPrompt variant="modal" autoShow={true} showDelay={0} />)
      
      await waitFor(() => {
        expect(screen.getByText('Install PNR Tracker')).toBeInTheDocument()
        expect(screen.getByText('Works offline')).toBeInTheDocument()
        expect(screen.getByText('Push notifications')).toBeInTheDocument()
        expect(screen.getByText('Fast loading')).toBeInTheDocument()
        expect(screen.getByText('Home screen access')).toBeInTheDocument()
      })
    })

    it('should have install and dismiss buttons', async () => {
      render(<PWAInstallPrompt variant="modal" autoShow={true} showDelay={0} />)
      
      await waitFor(() => {
        expect(screen.getByText('Install App')).toBeInTheDocument()
        expect(screen.getByText('Not Now')).toBeInTheDocument()
      })
    })
  })

  describe('Card variant', () => {
    it('should render card with gradient background', async () => {
      render(<PWAInstallPrompt variant="card" autoShow={true} showDelay={0} />)
      
      await waitFor(() => {
        expect(screen.getByText('Install PNR Tracker')).toBeInTheDocument()
        expect(screen.getByText('Get the full app experience with offline support and notifications.')).toBeInTheDocument()
      })
    })

    it('should have install and maybe later buttons', async () => {
      render(<PWAInstallPrompt variant="card" autoShow={true} showDelay={0} />)
      
      await waitFor(() => {
        expect(screen.getByText('Install')).toBeInTheDocument()
        expect(screen.getByText('Maybe Later')).toBeInTheDocument()
      })
    })
  })

  describe('Auto-show behavior', () => {
    it('should not auto-show when autoShow is false', () => {
      render(<PWAInstallPrompt variant="banner" autoShow={false} />)
      
      expect(screen.queryByText('Install PNR Tracker')).not.toBeInTheDocument()
    })

    it('should respect show delay', async () => {
      render(<PWAInstallPrompt variant="banner" autoShow={true} showDelay={100} />)
      
      // Should not be visible immediately
      expect(screen.queryByText('Install PNR Tracker')).not.toBeInTheDocument()
      
      // Should be visible after delay
      await waitFor(() => {
        expect(screen.getByText('Install PNR Tracker')).toBeInTheDocument()
      }, { timeout: 200 })
    })
  })
})

describe('PWAInstallButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePWA.canInstall = true
    mockUsePWA.isInstalled = false
    mockUsePWA.install.mockResolvedValue(true)
  })

  it('should render install button when conditions are met', () => {
    render(<PWAInstallButton />)
    
    expect(screen.getByText('Install App')).toBeInTheDocument()
  })

  it('should not render when app is already installed', () => {
    mockUsePWA.isInstalled = true
    
    render(<PWAInstallButton />)
    
    expect(screen.queryByText('Install App')).not.toBeInTheDocument()
  })

  it('should not render when install is not available', () => {
    mockUsePWA.canInstall = false
    
    render(<PWAInstallButton />)
    
    expect(screen.queryByText('Install App')).not.toBeInTheDocument()
  })

  it('should call install function when clicked', () => {
    render(<PWAInstallButton />)
    
    fireEvent.click(screen.getByText('Install App'))
    
    expect(mockUsePWA.install).toHaveBeenCalled()
  })

  it('should show installing state during installation', async () => {
    mockUsePWA.install.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
    
    render(<PWAInstallButton />)
    
    fireEvent.click(screen.getByText('Install App'))
    
    expect(screen.getByText('Installing...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Installing...')).not.toBeInTheDocument()
    })
  })

  it('should render custom children', () => {
    render(<PWAInstallButton>Custom Install Text</PWAInstallButton>)
    
    expect(screen.getByText('Custom Install Text')).toBeInTheDocument()
  })

  it('should apply different variants', () => {
    const { rerender } = render(<PWAInstallButton variant="primary" />)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600')
    
    rerender(<PWAInstallButton variant="secondary" />)
    expect(screen.getByRole('button')).toHaveClass('bg-gray-600')
    
    rerender(<PWAInstallButton variant="outline" />)
    expect(screen.getByRole('button')).toHaveClass('border')
  })

  it('should be disabled during installation', async () => {
    mockUsePWA.install.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
    
    render(<PWAInstallButton />)
    
    const button = screen.getByText('Install App')
    fireEvent.click(button)
    
    expect(button).toBeDisabled()
    
    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })
})