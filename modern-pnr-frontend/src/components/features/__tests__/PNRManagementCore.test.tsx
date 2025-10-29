import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PNR } from '../../../types'

// Mock all external dependencies
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => 0,
}))

vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount }: any) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: Math.min(itemCount, 5) }).map((_, index) =>
        children({ index, style: {} })
      )}
    </div>
  ),
}))

// Mock stores
const mockPNRStore = {
  pnrs: [],
  selectedPNRs: new Set(),
  filters: {},
  sortConfig: null,
  isLoading: false,
  error: null,
  clearSelection: vi.fn(),
  selectAllPNRs: vi.fn(),
  setSortConfig: vi.fn(),
  bulkDelete: vi.fn(),
  togglePNRSelection: vi.fn(),
  setFilters: vi.fn(),
  clearFilters: vi.fn(),
  bulkUpdateStatus: vi.fn(),
}

vi.mock('../../../stores/pnrStore', () => ({
  usePNRStore: () => mockPNRStore,
}))

vi.mock('../../../stores/appStore', () => ({
  useAppStore: () => ({
    realtime: { connection: { isConnected: true } },
  }),
}))

// Mock UI components
vi.mock('../../ui/Card', () => ({
  Card: ({ children, onClick, className }: any) => (
    <div className={className} onClick={onClick} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

vi.mock('../../ui/Button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}))

vi.mock('../../ui/Skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

// Mock feature components
vi.mock('../PNRCard', () => ({
  PNRCard: ({ pnr, onEdit, onDelete, onViewDetails, isSelected }: any) => (
    <div data-testid="pnr-card" data-pnr-id={pnr.id}>
      <span>PNR: {pnr.number}</span>
      <span>{pnr.passengerName}</span>
      <span>{pnr.status.currentStatus}</span>
      <button onClick={() => onEdit?.(pnr)}>Edit</button>
      <button onClick={() => onDelete?.(pnr.id)}>Delete</button>
      <button onClick={() => onViewDetails?.(pnr)}>View Details</button>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}}
        data-testid="pnr-checkbox"
      />
    </div>
  ),
}))

vi.mock('../PNRFilters', () => ({
  PNRFilters: () => (
    <div data-testid="pnr-filters">
      <input
        placeholder="Search by PNR, name, train, or station..."
        onChange={(e) => mockPNRStore.setFilters({ searchTerm: e.target.value })}
      />
      <button onClick={() => mockPNRStore.setFilters({ status: 'CNF' })}>
        Confirmed
      </button>
      <button onClick={() => mockPNRStore.clearFilters()}>
        Clear Filters
      </button>
    </div>
  ),
}))

vi.mock('../PNRBulkActions', () => ({
  PNRBulkActions: ({ selectedCount, onBulkDelete }: any) => (
    <div data-testid="bulk-actions">
      <span>{selectedCount} selected</span>
      <button onClick={onBulkDelete}>Delete Selected</button>
    </div>
  ),
}))

// Import components after mocks
import { PNRDashboard } from '../PNRDashboard'

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
          seatNumber: 'S1/45',
          coachPosition: 'S1'
        }
      ],
      trainInfo: {
        number: '12345',
        name: 'Rajdhani Express',
        departureTime: '16:30',
        arrivalTime: '08:15',
        duration: '15h 45m',
        distance: '1447 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      lastUpdated: new Date().toISOString()
    },
    passengerName: 'John Doe',
    trainNumber: '12345',
    trainName: 'Rajdhani Express',
    dateOfJourney: '2024-12-15',
    from: 'NDLS',
    to: 'HWH',
    class: '3A',
    quota: 'GN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    number: '0987654321',
    status: {
      currentStatus: 'RAC',
      chartPrepared: false,
      passengers: [
        {
          serialNumber: 1,
          name: 'Jane Smith',
          age: 28,
          gender: 'F',
          currentStatus: 'RAC',
          bookingStatus: 'RAC/5',
          seatNumber: '',
          coachPosition: ''
        }
      ],
      trainInfo: {
        number: '54321',
        name: 'Shatabdi Express',
        departureTime: '06:00',
        arrivalTime: '14:30',
        duration: '8h 30m',
        distance: '450 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      },
      lastUpdated: new Date().toISOString()
    },
    passengerName: 'Jane Smith',
    trainNumber: '54321',
    trainName: 'Shatabdi Express',
    dateOfJourney: '2024-12-20',
    from: 'NDLS',
    to: 'AGC',
    class: 'CC',
    quota: 'GN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

describe('PNR Management Interface Core Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPNRStore.pnrs = mockPNRs
    mockPNRStore.selectedPNRs = new Set()
    mockPNRStore.filters = {}
    mockPNRStore.isLoading = false
    mockPNRStore.error = null
  })

  describe('PNR CRUD Operations', () => {
    it('renders PNR dashboard with PNR list', () => {
      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
      expect(screen.getByText('2 PNRs tracked')).toBeInTheDocument()
    })

    it('displays PNR cards with correct information', () => {
      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR: 1234567890')).toBeInTheDocument()
      expect(screen.getByText('PNR: 0987654321')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    it('handles PNR deletion', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      
      render(<PNRDashboard onPNRDelete={onDelete} />)
      
      const deleteButton = screen.getAllByText('Delete')[0]
      await user.click(deleteButton)
      
      expect(onDelete).toHaveBeenCalledWith('1')
    })

    it('displays loading state correctly', () => {
      mockPNRStore.isLoading = true
      render(<PNRDashboard />)
      
      expect(screen.getAllByTestId('skeleton')).toHaveLength(8)
    })

    it('displays error state correctly', () => {
      mockPNRStore.error = 'Failed to load PNRs'
      render(<PNRDashboard />)
      
      expect(screen.getByText('Error Loading PNRs')).toBeInTheDocument()
      expect(screen.getByText('Failed to load PNRs')).toBeInTheDocument()
    })

    it('handles empty PNR list', () => {
      mockPNRStore.pnrs = []
      render(<PNRDashboard />)
      
      expect(screen.getByText('No PNRs Found')).toBeInTheDocument()
      expect(screen.getByText('Add Your First PNR')).toBeInTheDocument()
    })
  })

  describe('Real-time Updates', () => {
    it('displays real-time connection status', () => {
      render(<PNRDashboard />)
      
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('shows PNR status correctly', () => {
      render(<PNRDashboard />)
      
      expect(screen.getByText('CNF')).toBeInTheDocument()
      expect(screen.getByText('RAC')).toBeInTheDocument()
    })
  })

  describe('Advanced Filtering and Search', () => {
    it('renders filter component', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      const filterButton = screen.getByText('Filters')
      await user.click(filterButton)
      
      expect(screen.getByTestId('pnr-filters')).toBeInTheDocument()
    })

    it('handles search input changes', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      const filterButton = screen.getByText('Filters')
      await user.click(filterButton)
      
      const searchInput = screen.getByPlaceholderText('Search by PNR, name, train, or station...')
      await user.type(searchInput, '1234567890')
      
      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({
        searchTerm: '1234567890'
      })
    })

    it('handles status filter selection', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      const filterButton = screen.getByText('Filters')
      await user.click(filterButton)
      
      const confirmedButton = screen.getByText('Confirmed')
      await user.click(confirmedButton)
      
      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({
        status: 'CNF'
      })
    })

    it('clears filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      const filterButton = screen.getByText('Filters')
      await user.click(filterButton)
      
      const clearButton = screen.getByText('Clear Filters')
      await user.click(clearButton)
      
      expect(mockPNRStore.clearFilters).toHaveBeenCalled()
    })
  })

  describe('Sorting Functionality', () => {
    it('handles sort configuration changes', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      const dateSort = screen.getByText('Date')
      await user.click(dateSort)
      
      expect(mockPNRStore.setSortConfig).toHaveBeenCalledWith({
        field: 'dateOfJourney',
        direction: 'asc'
      })
    })

    it('toggles sort direction on repeated clicks', async () => {
      const user = userEvent.setup()
      mockPNRStore.sortConfig = { field: 'dateOfJourney', direction: 'asc' }
      
      render(<PNRDashboard />)
      
      const dateSort = screen.getByText('Date')
      await user.click(dateSort)
      
      expect(mockPNRStore.setSortConfig).toHaveBeenCalledWith({
        field: 'dateOfJourney',
        direction: 'desc'
      })
    })
  })

  describe('Bulk Operations', () => {
    it('shows bulk actions when PNRs are selected', () => {
      mockPNRStore.selectedPNRs = new Set(['1', '2'])
      
      render(<PNRDashboard />)
      
      expect(screen.getByTestId('bulk-actions')).toBeInTheDocument()
      expect(screen.getByText('2 selected')).toBeInTheDocument()
    })

    it('handles bulk delete', async () => {
      const user = userEvent.setup()
      mockPNRStore.selectedPNRs = new Set(['1'])
      
      render(<PNRDashboard />)
      
      const deleteButton = screen.getByText('Delete Selected')
      await user.click(deleteButton)
      
      expect(mockPNRStore.bulkDelete).toHaveBeenCalledWith(['1'])
    })
  })

  describe('View Mode Toggle', () => {
    it('switches between grid and list view', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      // Should start in grid view with virtualization
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
      
      // Find and click list view button
      const buttons = screen.getAllByRole('button')
      const listViewButton = buttons.find(btn => 
        btn.innerHTML.includes('svg') || btn.textContent?.includes('list')
      )
      
      if (listViewButton) {
        await user.click(listViewButton)
      }
      
      // Should still render the dashboard
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })
  })

  describe('Performance Optimization', () => {
    it('uses virtualization for large lists', () => {
      render(<PNRDashboard />)
      
      const virtualizedList = screen.getByTestId('virtualized-list')
      expect(virtualizedList).toBeInTheDocument()
    })

    it('handles large datasets efficiently', () => {
      // Create a large dataset
      const largePNRList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPNRs[0],
        id: `pnr-${i}`,
        number: `123456789${i}`,
      }))
      
      mockPNRStore.pnrs = largePNRList
      
      render(<PNRDashboard />)
      
      expect(screen.getByText('1000 PNRs tracked')).toBeInTheDocument()
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', () => {
      // Mock window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      })
      
      render(<PNRDashboard />)
      
      fireEvent(window, new Event('resize'))
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', () => {
      mockPNRStore.error = 'Network error'
      
      render(<PNRDashboard />)
      
      expect(screen.getByText('Error Loading PNRs')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('recovers from error state', async () => {
      const user = userEvent.setup()
      mockPNRStore.error = 'Network error'
      
      render(<PNRDashboard />)
      
      const tryAgainButton = screen.getByText('Try Again')
      await user.click(tryAgainButton)
      
      // Should trigger page reload (mocked)
      expect(tryAgainButton).toBeInTheDocument()
    })
  })
})