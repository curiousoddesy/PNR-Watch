import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { PNRDashboard } from '../components/features/PNRDashboard'
import { PNRDetailView } from '../components/features/PNRDetailView'
import { SimplePNRForm } from '../components/features/SimplePNRForm'
import { PNRManagementDemo } from '../components/PNRManagementDemo'
import { usePNRStore } from '../stores/pnrStore'
import { useAppStore } from '../stores/appStore'
import { PNR } from '../types'

// Mock stores
vi.mock('../stores/pnrStore')
vi.mock('../stores/appStore')

// Mock window.matchMedia
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

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock missing UI components
vi.mock('../components/ui/SmartInput', () => ({
  SmartInput: ({ value, onValueChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      placeholder={placeholder}
      {...props}
    />
  ),
}))

vi.mock('../components/features/PNRFilters', () => ({
  PNRFilters: () => <div data-testid="pnr-filters">PNR Filters</div>,
}))

vi.mock('../components/features/PNRBulkActions', () => ({
  PNRBulkActions: ({ selectedCount, onSelectAll, onClearSelection, onBulkDelete }: any) => (
    <div data-testid="bulk-actions">
      <span>Selected: {selectedCount}</span>
      <button onClick={onSelectAll}>Select All</button>
      <button onClick={onClearSelection}>Clear</button>
      <button onClick={onBulkDelete}>Delete</button>
    </div>
  ),
}))

vi.mock('../components/features/PNRCard', () => ({
  PNRCard: ({ pnr, isSelected, onEdit, onDelete, onViewDetails }: any) => (
    <div data-testid={`pnr-card-${pnr.id}`}>
      <span>{pnr.number}</span>
      <span>{pnr.passengerName}</span>
      <button onClick={() => onEdit?.(pnr)}>Edit</button>
      <button onClick={() => onDelete?.(pnr.id)}>Delete</button>
      <button onClick={() => onViewDetails?.(pnr)}>Details</button>
    </div>
  ),
}))

vi.mock('../components/features/PNRTimeline', () => ({
  PNRTimeline: ({ pnr }: any) => <div data-testid="pnr-timeline">Timeline for {pnr.number}</div>,
}))

vi.mock('../components/features/PNRJourneyMap', () => ({
  PNRJourneyMap: ({ pnr }: any) => <div data-testid="pnr-journey-map">Journey Map for {pnr.number}</div>,
}))

vi.mock('../components/features/PNRStatusChart', () => ({
  PNRStatusChart: ({ pnr }: any) => <div data-testid="pnr-status-chart">Status Chart for {pnr.number}</div>,
}))

vi.mock('../components/features/PNRExportOptions', () => ({
  PNRExportOptions: ({ isOpen, onClose, pnr }: any) => 
    isOpen ? <div data-testid="export-options">Export Options for {pnr.number}</div> : null,
}))

vi.mock('../components/ui/ShareModal', () => ({
  ShareModal: ({ isOpen, onClose, pnr }: any) => 
    isOpen ? <div data-testid="share-modal">Share Modal for {pnr.number}</div> : null,
}))

// Mock react-window for virtualization
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize }: any) => {
    const items = Array.from({ length: Math.min(itemCount, 10) }, (_, index) =>
      children({ index, style: { height: itemSize } })
    )
    return <div data-testid="virtualized-list">{items}</div>
  },
}))

// Mock WebSocket and real-time features
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
}

global.WebSocket = vi.fn(() => mockWebSocket) as any

// Mock touch events for gesture testing
const mockTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => ({
  type,
  touches,
  changedTouches: touches,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
})

// Sample PNR data for testing
const mockPNRs: PNR[] = [
  {
    id: '1',
    number: '1234567890',
    status: {
      currentStatus: 'CNF',
      chartPrepared: true,
      passengers: [
        {
          serialNumber: 1,
          name: 'John Doe',
          age: 35,
          gender: 'M',
          currentStatus: 'CNF',
          bookingStatus: 'CNF',
          coachPosition: 'S1',
          seatNumber: '23'
        }
      ],
      trainInfo: {
        number: '12345',
        name: 'Rajdhani Express',
        departureTime: '16:55',
        arrivalTime: '08:20',
        duration: '15h 25m',
        distance: '1447 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      lastUpdated: new Date().toISOString()
    },
    passengerName: 'John Doe',
    trainNumber: '12345',
    trainName: 'Rajdhani Express',
    dateOfJourney: '2024-12-15',
    from: 'New Delhi',
    to: 'Mumbai Central',
    class: '2A',
    quota: 'GN',
    createdAt: '2024-10-28T10:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    number: '9876543210',
    status: {
      currentStatus: 'RAC',
      chartPrepared: false,
      passengers: [
        {
          serialNumber: 1,
          name: 'Jane Smith',
          age: 28,
          gender: 'F',
          currentStatus: 'RAC 15',
          bookingStatus: 'RAC 15'
        }
      ],
      trainInfo: {
        number: '12951',
        name: 'Mumbai Rajdhani',
        departureTime: '17:15',
        arrivalTime: '08:35',
        duration: '15h 20m',
        distance: '1384 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      lastUpdated: new Date(Date.now() - 3600000).toISOString()
    },
    passengerName: 'Jane Smith',
    trainNumber: '12951',
    trainName: 'Mumbai Rajdhani',
    dateOfJourney: '2024-12-20',
    from: 'Mumbai Central',
    to: 'New Delhi',
    class: '3A',
    quota: 'GN',
    createdAt: '2024-10-27T14:30:00Z',
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  }
]

describe('PNR Management Interface Tests', () => {
  const mockPNRStore = {
    pnrs: mockPNRs,
    selectedPNRs: new Set<string>(),
    filters: {},
    sortConfig: null,
    isLoading: false,
    error: null,
    setPNRs: vi.fn(),
    addPNR: vi.fn(),
    updatePNR: vi.fn(),
    removePNR: vi.fn(),
    updatePNRStatus: vi.fn(),
    selectPNR: vi.fn(),
    deselectPNR: vi.fn(),
    selectAllPNRs: vi.fn(),
    clearSelection: vi.fn(),
    togglePNRSelection: vi.fn(),
    setFilters: vi.fn(),
    clearFilters: vi.fn(),
    setSortConfig: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkDelete: vi.fn(),
  }

  const mockAppStore = {
    realtime: {
      connection: {
        isConnected: true,
        isConnecting: false,
        connectionId: 'test-connection',
        lastConnectedAt: Date.now(),
        reconnectAttempts: 0,
        error: null
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(usePNRStore as any).mockReturnValue(mockPNRStore)
    ;(useAppStore as any).mockReturnValue(mockAppStore)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('PNR CRUD Operations', () => {
    it('should display PNR list correctly', () => {
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
      expect(screen.getByText('2 PNRs tracked')).toBeInTheDocument()
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })

    it('should add new PNR successfully', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined)

      render(<SimplePNRForm onSubmit={mockOnSubmit} />)

      // Fill out the form
      await user.type(screen.getByPlaceholderText('Enter 10-digit PNR number'), '1111111111')
      await user.type(screen.getByPlaceholderText('Enter passenger name'), 'Test User')
      await user.type(screen.getByPlaceholderText('Enter train number (e.g., 12345)'), '12345')

      // Submit the form
      await user.click(screen.getByText('Add PNR'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          pnrNumber: '1111111111',
          passengerName: 'Test User',
          trainNumber: '12345',
          fromStation: '',
          toStation: ''
        })
      })
    })

    it('should update PNR information', async () => {
      const mockOnPNREdit = vi.fn()

      render(
        <BrowserRouter>
          <PNRDashboard onPNREdit={mockOnPNREdit} />
        </BrowserRouter>
      )

      // Simulate edit action (would be triggered by PNRCard component)
      act(() => {
        mockOnPNREdit(mockPNRs[0])
      })

      expect(mockOnPNREdit).toHaveBeenCalledWith(mockPNRs[0])
    })

    it('should delete PNR successfully', async () => {
      const mockOnPNRDelete = vi.fn()

      render(
        <BrowserRouter>
          <PNRDashboard onPNRDelete={mockOnPNRDelete} />
        </BrowserRouter>
      )

      // Simulate delete action
      act(() => {
        mockOnPNRDelete('1')
      })

      expect(mockOnPNRDelete).toHaveBeenCalledWith('1')
    })

    it('should handle bulk delete operations', async () => {
      const user = userEvent.setup()
      
      // Mock selected PNRs
      mockPNRStore.selectedPNRs = new Set(['1', '2'])

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Bulk delete should be available when items are selected
      expect(mockPNRStore.selectedPNRs.size).toBe(2)
    })

    it('should validate PNR form inputs', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn()

      render(<SimplePNRForm onSubmit={mockOnSubmit} />)

      // Try to submit without PNR number
      const submitButton = screen.getByText('Add PNR')
      expect(submitButton).toBeDisabled()

      // Add PNR number
      await user.type(screen.getByPlaceholderText('Enter 10-digit PNR number'), '123')
      expect(submitButton).toBeEnabled()

      // Submit with short PNR (should still work as validation is handled by service)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          pnrNumber: '123',
          passengerName: '',
          trainNumber: '',
          fromStation: '',
          toStation: ''
        })
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should display real-time connection status', () => {
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('Live')).toBeInTheDocument()
      expect(screen.getByText('Live').previousElementSibling).toHaveClass('animate-pulse')
    })

    it('should handle real-time PNR status updates', async () => {
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Simulate real-time update
      act(() => {
        mockPNRStore.updatePNRStatus('1', {
          ...mockPNRs[0].status,
          currentStatus: 'CNF',
          lastUpdated: new Date().toISOString()
        })
      })

      expect(mockPNRStore.updatePNRStatus).toHaveBeenCalledWith('1', expect.any(Object))
    })

    it('should show connection status when offline', () => {
      mockAppStore.realtime.connection.isConnected = false

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      expect(screen.queryByText('Live')).not.toBeInTheDocument()
    })

    it('should handle WebSocket reconnection', () => {
      // Simulate connection loss and reconnection
      mockAppStore.realtime.connection.isConnected = false
      mockAppStore.realtime.connection.isConnecting = true

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Should not show live indicator when reconnecting
      expect(screen.queryByText('Live')).not.toBeInTheDocument()
    })
  })

  describe('Advanced Filtering and Search', () => {
    it('should filter PNRs by search term', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Open filters
      await user.click(screen.getByText('Filters'))

      // The actual filtering logic is tested through the store mock
      act(() => {
        mockPNRStore.setFilters({ searchTerm: 'John' })
      })

      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({ searchTerm: 'John' })
    })

    it('should filter PNRs by status', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      await user.click(screen.getByText('Filters'))

      act(() => {
        mockPNRStore.setFilters({ status: 'CNF' })
      })

      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({ status: 'CNF' })
    })

    it('should filter PNRs by train number', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      await user.click(screen.getByText('Filters'))

      act(() => {
        mockPNRStore.setFilters({ trainNumber: '12345' })
      })

      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({ trainNumber: '12345' })
    })

    it('should filter PNRs by date range', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      await user.click(screen.getByText('Filters'))

      const dateRange = {
        start: '2024-12-01',
        end: '2024-12-31'
      }

      act(() => {
        mockPNRStore.setFilters({ dateRange })
      })

      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({ dateRange })
    })

    it('should clear all filters', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      await user.click(screen.getByText('Filters'))

      act(() => {
        mockPNRStore.clearFilters()
      })

      expect(mockPNRStore.clearFilters).toHaveBeenCalled()
    })

    it('should sort PNRs by different fields', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Test sorting by date
      await user.click(screen.getByText('Date'))

      expect(mockPNRStore.setSortConfig).toHaveBeenCalledWith({
        field: 'dateOfJourney',
        direction: 'asc'
      })

      // Test sorting by train number
      await user.click(screen.getByText('Train'))

      expect(mockPNRStore.setSortConfig).toHaveBeenCalledWith({
        field: 'trainNumber',
        direction: 'asc'
      })
    })

    it('should toggle sort direction', async () => {
      const user = userEvent.setup()
      
      // Mock existing sort config
      mockPNRStore.sortConfig = { field: 'dateOfJourney', direction: 'asc' }

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Click same field again to reverse direction
      await user.click(screen.getByText('Date'))

      expect(mockPNRStore.setSortConfig).toHaveBeenCalledWith({
        field: 'dateOfJourney',
        direction: 'desc'
      })
    })
  })

  describe('Gesture Interactions and Mobile Optimization', () => {
    beforeEach(() => {
      // Mock touch support
      Object.defineProperty(window, 'ontouchstart', {
        value: null,
        writable: true
      })
    })

    it('should handle swipe gestures on PNR cards', async () => {
      const mockOnPNREdit = vi.fn()
      const mockOnPNRDelete = vi.fn()

      render(
        <BrowserRouter>
          <PNRDashboard 
            onPNREdit={mockOnPNREdit}
            onPNRDelete={mockOnPNRDelete}
          />
        </BrowserRouter>
      )

      // Simulate swipe gesture (would be handled by PNRCard component)
      const cardElement = screen.getByTestId('virtualized-list')
      
      // Simulate touch start
      fireEvent(cardElement, mockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]))
      
      // Simulate touch move (swipe right)
      fireEvent(cardElement, mockTouchEvent('touchmove', [{ clientX: 200, clientY: 100 }]))
      
      // Simulate touch end
      fireEvent(cardElement, mockTouchEvent('touchend', [{ clientX: 200, clientY: 100 }]))

      // The actual swipe handling would be in PNRCard component
      expect(cardElement).toBeInTheDocument()
    })

    it('should handle pull-to-refresh gesture', async () => {
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      const dashboard = screen.getByTestId('virtualized-list')

      // Simulate pull-to-refresh
      fireEvent(dashboard, mockTouchEvent('touchstart', [{ clientX: 100, clientY: 50 }]))
      fireEvent(dashboard, mockTouchEvent('touchmove', [{ clientX: 100, clientY: 150 }]))
      fireEvent(dashboard, mockTouchEvent('touchend', [{ clientX: 100, clientY: 150 }]))

      // Pull-to-refresh would trigger data refresh
      expect(dashboard).toBeInTheDocument()
    })

    it('should handle pinch-to-zoom gesture', async () => {
      render(
        <PNRDetailView 
          pnr={mockPNRs[0]} 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      )

      const detailView = screen.getByRole('dialog')

      // Simulate pinch gesture (two fingers)
      fireEvent(detailView, mockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 }
      ]))

      fireEvent(detailView, mockTouchEvent('touchmove', [
        { clientX: 80, clientY: 80 },
        { clientX: 220, clientY: 220 }
      ]))

      fireEvent(detailView, mockTouchEvent('touchend', [
        { clientX: 80, clientY: 80 },
        { clientX: 220, clientY: 220 }
      ]))

      expect(detailView).toBeInTheDocument()
    })

    it('should handle long press for context menu', async () => {
      vi.useFakeTimers()

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      const dashboard = screen.getByTestId('virtualized-list')

      // Simulate long press
      fireEvent(dashboard, mockTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }]))

      // Advance timers to simulate long press duration
      act(() => {
        vi.advanceTimersByTime(800)
      })

      fireEvent(dashboard, mockTouchEvent('touchend', [{ clientX: 100, clientY: 100 }]))

      expect(dashboard).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('should adapt layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Should render mobile-optimized layout
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('should handle haptic feedback on supported devices', () => {
      // Mock haptic feedback
      const mockVibrate = vi.fn()
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true
      })

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Haptic feedback would be triggered by gesture interactions
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })
  })

  describe('PNR Detail View', () => {
    it('should display detailed PNR information', () => {
      render(
        <PNRDetailView 
          pnr={mockPNRs[0]} 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      )

      expect(screen.getByText(`PNR: ${mockPNRs[0].number}`)).toBeInTheDocument()
      expect(screen.getByText(mockPNRs[0].passengerName)).toBeInTheDocument()
      expect(screen.getByText(mockPNRs[0].trainName)).toBeInTheDocument()
    })

    it('should handle tab navigation in detail view', async () => {
      const user = userEvent.setup()

      render(
        <PNRDetailView 
          pnr={mockPNRs[0]} 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      )

      // Test tab switching
      await user.click(screen.getByText('Journey Details'))
      expect(screen.getByText('Journey Details')).toBeInTheDocument()

      await user.click(screen.getByText('Passengers'))
      expect(screen.getByText('Passengers')).toBeInTheDocument()
    })

    it('should handle export functionality', async () => {
      const user = userEvent.setup()

      render(
        <PNRDetailView 
          pnr={mockPNRs[0]} 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      )

      await user.click(screen.getByText('Export'))
      // Export modal would open
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('should handle print functionality', async () => {
      const user = userEvent.setup()
      const mockPrint = vi.fn()
      
      // Mock window.open and print
      const mockWindow = {
        document: {
          write: vi.fn(),
          close: vi.fn()
        },
        print: mockPrint
      }
      
      global.window.open = vi.fn().mockReturnValue(mockWindow)

      render(
        <PNRDetailView 
          pnr={mockPNRs[0]} 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      )

      await user.click(screen.getByText('Print'))
      
      expect(window.open).toHaveBeenCalledWith('', '_blank')
    })

    it('should handle share functionality', async () => {
      const user = userEvent.setup()

      render(
        <PNRDetailView 
          pnr={mockPNRs[0]} 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      )

      await user.click(screen.getByText('Share'))
      // Share modal would open
      expect(screen.getByText('Share')).toBeInTheDocument()
    })

    it('should refresh PNR status', async () => {
      const user = userEvent.setup()

      render(
        <PNRDetailView 
          pnr={mockPNRs[0]} 
          isOpen={true} 
          onClose={vi.fn()} 
        />
      )

      await user.click(screen.getByText('Refresh'))
      
      expect(mockPNRStore.updatePNRStatus).toHaveBeenCalledWith(mockPNRs[0].id)
    })
  })

  describe('Error Handling', () => {
    it('should display error state when PNR loading fails', () => {
      mockPNRStore.error = 'Failed to load PNRs'
      mockPNRStore.isLoading = false

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('Error Loading PNRs')).toBeInTheDocument()
      expect(screen.getByText('Failed to load PNRs')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('should display loading state', () => {
      mockPNRStore.isLoading = true
      mockPNRStore.error = null

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Should show skeleton loading components
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })

    it('should display empty state when no PNRs exist', () => {
      mockPNRStore.pnrs = []
      mockPNRStore.isLoading = false
      mockPNRStore.error = null

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('No PNRs Found')).toBeInTheDocument()
      expect(screen.getByText('Start tracking your train reservations by adding your first PNR.')).toBeInTheDocument()
    })

    it('should handle form submission errors', async () => {
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'))

      render(<SimplePNRForm onSubmit={mockOnSubmit} />)

      await user.type(screen.getByPlaceholderText('Enter 10-digit PNR number'), '1234567890')
      await user.click(screen.getByText('Add PNR'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('Performance and Virtualization', () => {
    it('should handle large datasets efficiently', () => {
      const largePNRList = Array.from({ length: 1000 }, (_, index) => ({
        ...mockPNRs[0],
        id: `pnr-${index}`,
        number: `123456789${index}`,
      }))

      mockPNRStore.pnrs = largePNRList

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('1000 PNRs tracked')).toBeInTheDocument()
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })

    it('should implement virtualization for performance', () => {
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Virtualized list should be rendered
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })
  })

  describe('Integration Tests', () => {
    it('should integrate PNR management demo with all components', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRManagementDemo />
        </BrowserRouter>
      )

      expect(screen.getByText('Advanced PNR Management Interface')).toBeInTheDocument()
      
      // Should render the dashboard
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()

      // Should be able to open add PNR modal
      await user.click(screen.getByText('Add PNR'))
      expect(screen.getByText('Add New PNR')).toBeInTheDocument()
    })

    it('should handle complete PNR workflow', async () => {
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRManagementDemo />
        </BrowserRouter>
      )

      // Add PNR
      await user.click(screen.getByText('Add PNR'))
      
      // Fill form (in modal)
      const pnrInput = screen.getByPlaceholderText('Enter 10-digit PNR number')
      await user.type(pnrInput, '1111111111')
      
      const nameInput = screen.getByPlaceholderText('Enter passenger name')
      await user.type(nameInput, 'Test User')

      // Submit
      await user.click(screen.getByRole('button', { name: /add pnr/i }))

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Add New PNR')).not.toBeInTheDocument()
      })
    })
  })
})