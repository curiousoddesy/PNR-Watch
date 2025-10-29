// Tests for offline indicator component

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OfflineIndicator, OfflineStatusBadge, useOfflineState } from '../OfflineIndicator'
import { renderHook, act } from '@testing-library/react'

// Mock offline manager
const mockOfflineManager = {
  getState: vi.fn(),
  onStateChange: vi.fn(),
  forceSync: vi.fn(),
  clearOfflineData: vi.fn(),
}

vi.mock('../../../services/offlineManager', () => ({
  offlineManager: mockOfflineManager,
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

const mockOfflineState = {
  isOnline: true,
  isConnected: true,
  lastOnline: Date.now(),
  pendingActions: 0,
  syncInProgress: false,
}

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOfflineManager.getState.mockReturnValue(mockOfflineState)
    mockOfflineManager.onStateChange.mockReturnValue(() => {}) // cleanup function
    mockOfflineManager.forceSync.mockResolvedValue({ synced: 0, conflicts: 0, errors: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should not render when online and showWhenOnline is false', () => {
    render(<OfflineIndicator showWhenOnline={false} />)
    
    expect(screen.queryByText('Online')).not.toBeInTheDocument()
  })

  it('should render when offline', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: false,
    })
    
    render(<OfflineIndicator />)
    
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('should render when online and showWhenOnline is true', () => {
    render(<OfflineIndicator showWhenOnline={true} />)
    
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('should show pending actions count', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: false,
      pendingActions: 3,
    })
    
    render(<OfflineIndicator />)
    
    expect(screen.getByText('3 pending')).toBeInTheDocument()
  })

  it('should show sync in progress indicator', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: false,
      syncInProgress: true,
    })
    
    render(<OfflineIndicator />)
    
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
  })

  it('should show sync button when online with pending actions', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: true,
      pendingActions: 2,
    })
    
    render(<OfflineIndicator showWhenOnline={true} />)
    
    expect(screen.getByText('Sync Now')).toBeInTheDocument()
  })

  it('should call forceSync when sync button is clicked', async () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: true,
      pendingActions: 2,
    })
    
    render(<OfflineIndicator showWhenOnline={true} />)
    
    fireEvent.click(screen.getByText('Sync Now'))
    
    expect(mockOfflineManager.forceSync).toHaveBeenCalled()
  })

  it('should show syncing state during sync operation', async () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: true,
      pendingActions: 2,
    })
    
    mockOfflineManager.forceSync.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ synced: 1, conflicts: 0, errors: 0 }), 100))
    )
    
    render(<OfflineIndicator showWhenOnline={true} />)
    
    fireEvent.click(screen.getByText('Sync Now'))
    
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByText('Syncing...')).not.toBeInTheDocument()
    })
  })

  it('should register state change listener', () => {
    render(<OfflineIndicator />)
    
    expect(mockOfflineManager.onStateChange).toHaveBeenCalled()
  })

  it('should cleanup state change listener on unmount', () => {
    const cleanup = vi.fn()
    mockOfflineManager.onStateChange.mockReturnValue(cleanup)
    
    const { unmount } = render(<OfflineIndicator />)
    
    unmount()
    
    expect(cleanup).toHaveBeenCalled()
  })

  it('should apply custom className', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: false,
    })
    
    render(<OfflineIndicator className="custom-class" />)
    
    const indicator = screen.getByText('Offline').closest('div')
    expect(indicator).toHaveClass('custom-class')
  })

  it('should position at bottom when specified', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: false,
    })
    
    render(<OfflineIndicator position="bottom" />)
    
    const indicator = screen.getByText('Offline').closest('div')
    expect(indicator).toHaveClass('bottom-4')
  })
})

describe('OfflineStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOfflineManager.getState.mockReturnValue(mockOfflineState)
    mockOfflineManager.onStateChange.mockReturnValue(() => {})
  })

  it('should render online status', () => {
    render(<OfflineStatusBadge />)
    
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('should render offline status', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: false,
    })
    
    render(<OfflineStatusBadge />)
    
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('should show pending actions count in badge', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      pendingActions: 5,
    })
    
    render(<OfflineStatusBadge />)
    
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('should apply correct styling for online state', () => {
    render(<OfflineStatusBadge />)
    
    const badge = screen.getByText('Online').closest('div')
    expect(badge).toHaveClass('bg-green-100', 'text-green-700')
  })

  it('should apply correct styling for offline state', () => {
    mockOfflineManager.getState.mockReturnValue({
      ...mockOfflineState,
      isConnected: false,
    })
    
    render(<OfflineStatusBadge />)
    
    const badge = screen.getByText('Offline').closest('div')
    expect(badge).toHaveClass('bg-orange-100', 'text-orange-700')
  })

  it('should apply custom className', () => {
    render(<OfflineStatusBadge className="custom-badge" />)
    
    const badge = screen.getByText('Online').closest('div')
    expect(badge).toHaveClass('custom-badge')
  })
})

describe('useOfflineState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOfflineManager.getState.mockReturnValue(mockOfflineState)
    mockOfflineManager.onStateChange.mockReturnValue(() => {})
  })

  it('should return offline state', () => {
    const { result } = renderHook(() => useOfflineState())
    
    expect(result.current.isOnline).toBe(true)
    expect(result.current.isConnected).toBe(true)
    expect(result.current.pendingActions).toBe(0)
    expect(result.current.syncInProgress).toBe(false)
  })

  it('should provide forceSync function', () => {
    const { result } = renderHook(() => useOfflineState())
    
    expect(typeof result.current.forceSync).toBe('function')
  })

  it('should provide clearOfflineData function', () => {
    const { result } = renderHook(() => useOfflineState())
    
    expect(typeof result.current.clearOfflineData).toBe('function')
  })

  it('should call forceSync when forceSync is invoked', async () => {
    const { result } = renderHook(() => useOfflineState())
    
    await act(async () => {
      await result.current.forceSync()
    })
    
    expect(mockOfflineManager.forceSync).toHaveBeenCalled()
  })

  it('should call clearOfflineData when clearOfflineData is invoked', async () => {
    const { result } = renderHook(() => useOfflineState())
    
    await act(async () => {
      await result.current.clearOfflineData()
    })
    
    expect(mockOfflineManager.clearOfflineData).toHaveBeenCalled()
  })

  it('should update state when offline manager state changes', () => {
    let stateChangeCallback: (state: any) => void
    mockOfflineManager.onStateChange.mockImplementation((callback) => {
      stateChangeCallback = callback
      return () => {}
    })
    
    const { result } = renderHook(() => useOfflineState())
    
    expect(result.current.isConnected).toBe(true)
    
    // Simulate state change
    act(() => {
      stateChangeCallback({
        ...mockOfflineState,
        isConnected: false,
      })
    })
    
    expect(result.current.isConnected).toBe(false)
  })

  it('should cleanup state change listener on unmount', () => {
    const cleanup = vi.fn()
    mockOfflineManager.onStateChange.mockReturnValue(cleanup)
    
    const { unmount } = renderHook(() => useOfflineState())
    
    unmount()
    
    expect(cleanup).toHaveBeenCalled()
  })
})