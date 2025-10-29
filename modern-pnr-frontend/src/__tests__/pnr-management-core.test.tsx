import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { PNR } from '../types'

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

// Mock react-window for virtualization
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize }: any) => {
    const items = Array.from({ length: Math.min(itemCount, 10) }, (_, index) =>
      children({ index, style: { height: itemSize } })
    )
    return <div data-testid="virtualized-list">{items}</div>
  },
}))

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

// Mock stores
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

vi.mock('../stores/pnrStore', () => ({
  usePNRStore: () => mockPNRStore
}))

vi.mock('../stores/appStore', () => ({
  useAppStore: () => mockAppStore
}))

// Mock UI components
vi.mock('../components/ui/SmartInput', () => ({
  SmartInput: ({ value, onValueChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      placeholder={placeholder}
      data-testid="smart-input"
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
      <span data-testid="selected-count">Selected: {selectedCount}</span>
      <button onClick={onSelectAll} data-testid="select-all">Select All</button>
      <button onClick={onClearSelection} data-testid="clear-selection">Clear</button>
      <button onClick={onBulkDelete} data-testid="bulk-delete">Delete</button>
    </div>
  ),
}))

vi.mock('../components/features/PNRCard', () => ({
  PNRCard: ({ pnr, isSelected, onEdit, onDelete, onViewDetails }: any) => (
    <div data-testid={`pnr-card-${pnr.id}`} className={isSelected ? 'selected' : ''}>
      <span data-testid="pnr-number">{pnr.number}</span>
      <span data-testid="passenger-name">{pnr.passengerName}</span>
      <span data-testid="pnr-status">{pnr.status.currentStatus}</span>
      <button onClick={() => onEdit?.(pnr)} data-testid="edit-btn">Edit</button>
      <button onClick={() => onDelete?.(pnr.id)} data-testid="delete-btn">Delete</button>
      <button onClick={() => onViewDetails?.(pnr)} data-testid="details-btn">Details</button>
    </div>
  ),
}))

describe('PNR Management Interface Core Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPNRStore.pnrs = mockPNRs
    mockPNRStore.selectedPNRs = new Set()
    mockPNRStore.isLoading = false
    mockPNRStore.error = null
  })

  describe('PNR CRUD Operations', () => {
    it('should display PNR list correctly', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
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
      const { SimplePNRForm } = await import('../components/features/SimplePNRForm')
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined)

      render(<SimplePNRForm onSubmit={mockOnSubmit} />)

      // Fill out the form
      const pnrInput = screen.getByPlaceholderText('Enter 10-digit PNR number')
      await user.type(pnrInput, '1111111111')
      
      const nameInput = screen.getByPlaceholderText('Enter passenger name')
      await user.type(nameInput, 'Test User')

      // Submit the form
      await user.click(screen.getByText('Add PNR'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          pnrNumber: '1111111111',
          passengerName: 'Test User',
          trainNumber: '',
          fromStation: '',
          toStation: ''
        })
      })
    })

    it('should handle PNR update operations', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      const mockOnPNREdit = vi.fn()

      render(
        <BrowserRouter>
          <PNRDashboard onPNREdit={mockOnPNREdit} />
        </BrowserRouter>
      )

      // Simulate edit action
      act(() => {
        mockOnPNREdit(mockPNRs[0])
      })

      expect(mockOnPNREdit).toHaveBeenCalledWith(mockPNRs[0])
    })

    it('should handle PNR delete operations', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
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

    it('should handle bulk operations', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
      // Mock selected PNRs
      mockPNRStore.selectedPNRs = new Set(['1', '2'])

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Should show bulk actions when items are selected
      expect(screen.getByTestId('bulk-actions')).toBeInTheDocument()
      expect(screen.getByTestId('selected-count')).toHaveTextContent('Selected: 2')
    })
  })

  describe('Real-time Updates', () => {
    it('should display real-time connection status', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('should handle real-time PNR status updates', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
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

    it('should show offline status when disconnected', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
      mockAppStore.realtime.connection.isConnected = false

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      expect(screen.queryByText('Live')).not.toBeInTheDocument()
    })
  })

  describe('Advanced Filtering and Search', () => {
    it('should filter PNRs by search term', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      // Open filters
      await user.click(screen.getByText('Filters'))

      // Simulate filtering
      act(() => {
        mockPNRStore.setFilters({ searchTerm: 'John' })
      })

      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({ searchTerm: 'John' })
    })

    it('should filter PNRs by status', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      act(() => {
        mockPNRStore.setFilters({ status: 'CNF' })
      })

      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({ status: 'CNF' })
    })

    it('should sort PNRs by different fields', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
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
    })

    it('should clear all filters', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      act(() => {
        mockPNRStore.clearFilters()
      })

      expect(mockPNRStore.clearFilters).toHaveBeenCalled()
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

    it('should handle touch events on mobile devices', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
      render(
        <BrowserRouter>
          <PNRDashboard />
        </BrowserRouter>
      )

      const dashboard = screen.getByTestId('virtualized-list')
      
      // Simulate touch start
      fireEvent.touchStart(dashboard, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Simulate touch move
      fireEvent.touchMove(dashboard, {
        touches: [{ clientX: 200, clientY: 100 }]
      })
      
      // Simulate touch end
      fireEvent.touchEnd(dashboard, {
        changedTouches: [{ clientX: 200, clientY: 100 }]
      })

      expect(dashboard).toBeInTheDocument()
    })

    it('should adapt layout for mobile screens', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
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

      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('should handle haptic feedback on supported devices', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
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

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error state when PNR loading fails', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
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

    it('should display empty state when no PNRs exist', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
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

    it('should handle form validation errors', async () => {
      const { SimplePNRForm } = await import('../components/features/SimplePNRForm')
      const user = userEvent.setup()
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'))

      render(<SimplePNRForm onSubmit={mockOnSubmit} />)

      const pnrInput = screen.getByPlaceholderText('Enter 10-digit PNR number')
      await user.type(pnrInput, '1234567890')
      await user.click(screen.getByText('Add PNR'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('Performance and Virtualization', () => {
    it('should handle large datasets efficiently', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
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

    it('should implement virtualization for performance', async () => {
      const { PNRDashboard } = await import('../components/features/PNRDashboard')
      
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
    it('should integrate PNR management components', async () => {
      const { PNRManagementDemo } = await import('../components/PNRManagementDemo')
      
      render(
        <BrowserRouter>
          <PNRManagementDemo />
        </BrowserRouter>
      )

      expect(screen.getByText('Advanced PNR Management Interface')).toBeInTheDocument()
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })

    it('should handle complete PNR workflow', async () => {
      const { PNRManagementDemo } = await import('../components/PNRManagementDemo')
      const user = userEvent.setup()

      render(
        <BrowserRouter>
          <PNRManagementDemo />
        </BrowserRouter>
      )

      // Should be able to open add PNR modal
      const addButton = screen.getByText('Add PNR')
      expect(addButton).toBeInTheDocument()
      
      await user.click(addButton)
      
      // Modal should open
      await waitFor(() => {
        expect(screen.getByText('Add New PNR')).toBeInTheDocument()
      })
    })
  })
})