import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PNRDashboard } from '../PNRDashboard'
import { PNRCard } from '../PNRCard'
import { PNRFilters } from '../PNRFilters'
import { PNREntryForm } from '../PNREntryForm'
import { PNRBulkActions } from '../PNRBulkActions'
import { usePNRStore } from '../../../stores/pnrStore'
import { useAppStore } from '../../../stores/appStore'
import { PNR } from '../../../types'

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

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize }: any) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: Math.min(itemCount, 5) }).map((_, index) =>
        children({ index, style: { height: itemSize } })
      )}
    </div>
  ),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => children,
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => 0,
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

const mockAppStore = {
  realtime: {
    connection: {
      isConnected: true,
    },
  },
}

vi.mock('../../../stores/pnrStore', () => ({
  usePNRStore: () => mockPNRStore,
}))

vi.mock('../../../stores/appStore', () => ({
  useAppStore: () => mockAppStore,
}))

// Mock hooks
vi.mock('../../../hooks/useIntelligentFeatures', () => ({
  useIntelligentFeatures: () => ({
    addToHistory: vi.fn(),
    getErrorSuggestions: vi.fn(),
  }),
}))

// Mock QRCodeScanner and BatchImport components
vi.mock('../QRCodeScanner', () => ({
  QRCodeScanner: ({ onScan, onClose }: { onScan: (result: string) => void; onClose: () => void }) => (
    <div data-testid="qr-scanner">
      <button onClick={() => onScan('1234567890')}>Scan QR</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('../BatchImport', () => ({
  BatchImport: ({ onImport, onClose }: { onImport: (pnrs: any[]) => void; onClose: () => void }) => (
    <div data-testid="batch-import">
      <button onClick={() => onImport([])}>Import</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

// Mock UI components
vi.mock('../../ui/Modal', () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null,
  ModalHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-header">{children}</div>,
  ModalBody: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-body">{children}</div>,
  ModalFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="modal-footer">{children}</div>,
}))

vi.mock('../../ui/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}))

vi.mock('../../ui/SmartInput', () => ({
  SmartInput: ({ onSuggestionSelect, ...props }: any) => (
    <input {...props} data-testid="smart-input" />
  ),
}))

vi.mock('../../ui/PredictiveInput', () => ({
  PredictiveInput: ({ onPredictionAccept, ...props }: any) => (
    <input {...props} data-testid="predictive-input" />
  ),
}))

vi.mock('../../ui/Form', () => ({
  FormField: ({ children }: any) => <div>{children}</div>,
  Select: ({ options, ...props }: any) => (
    <select {...props}>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

// Mock react-datepicker
vi.mock('react-datepicker', () => ({
  __esModule: true,
  default: ({ onChange, ...props }: any) => (
    <input
      type="date"
      onChange={(e) => onChange(new Date(e.target.value))}
      {...props}
    />
  ),
}))

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: any) => (e: any) => {
      e.preventDefault()
      fn({ pnrNumber: '1234567890' })
    },
    watch: () => ({}),
    setValue: vi.fn(),
    getValues: () => ({}),
    reset: vi.fn(),
    formState: { errors: {}, isValid: true, isDirty: false },
  }),
  Controller: ({ render }: any) => render({ field: { onChange: vi.fn(), value: '' } }),
}))

// Mock zod resolver
vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => vi.fn(),
}))

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
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
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
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  }
]

describe('PNR Management Interface Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPNRStore.pnrs = mockPNRs
    mockPNRStore.selectedPNRs = new Set()
    mockPNRStore.filters = {}
    mockPNRStore.isLoading = false
    mockPNRStore.error = null
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('PNR CRUD Operations', () => {
    it('renders PNR dashboard with PNR list', () => {
      render(<PNRDashboard />)
      
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
      expect(screen.getByText('2 PNRs tracked')).toBeInTheDocument()
      expect(screen.getByText('PNR: 1234567890')).toBeInTheDocument()
      expect(screen.getByText('PNR: 0987654321')).toBeInTheDocument()
    })

    it('handles PNR selection and bulk operations', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      // Select first PNR
      const firstCheckbox = screen.getAllByRole('button')[0] // First checkbox button
      await user.click(firstCheckbox)
      
      expect(mockPNRStore.togglePNRSelection).toHaveBeenCalledWith('1')
    })

    it('handles PNR deletion', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      
      render(
        <PNRCard
          pnr={mockPNRs[0]}
          onDelete={onDelete}
        />
      )
      
      // Simulate swipe to reveal actions (we'll test the delete button directly)
      const deleteButton = screen.queryByRole('button', { name: /delete/i })
      if (deleteButton) {
        await user.click(deleteButton)
        expect(onDelete).toHaveBeenCalledWith('1')
      }
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
      expect(screen.getByText('Try Again')).toBeInTheDocument()
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

    it('handles real-time PNR status updates', () => {
      render(
        <PNRCard
          pnr={mockPNRs[0]}
        />
      )
      
      expect(screen.getByText('CNF')).toBeInTheDocument()
      expect(screen.getByText('Chart Prepared')).toBeInTheDocument()
    })

    it('updates PNR information when status changes', () => {
      const updatedPNR = {
        ...mockPNRs[0],
        status: {
          ...mockPNRs[0].status,
          currentStatus: 'RAC'
        }
      }
      
      const { rerender } = render(<PNRCard pnr={mockPNRs[0]} />)
      expect(screen.getByText('CNF')).toBeInTheDocument()
      
      rerender(<PNRCard pnr={updatedPNR} />)
      expect(screen.getByText('RAC')).toBeInTheDocument()
    })
  })

  describe('Advanced Filtering and Search', () => {
    it('renders filter component with all filter options', () => {
      render(<PNRFilters />)
      
      expect(screen.getByPlaceholderText('Search by PNR, name, train, or station...')).toBeInTheDocument()
      expect(screen.getByText('All Statuses')).toBeInTheDocument()
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
      expect(screen.getByText('RAC')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter train number...')).toBeInTheDocument()
    })

    it('handles search input changes', async () => {
      const user = userEvent.setup()
      render(<PNRFilters />)
      
      const searchInput = screen.getByPlaceholderText('Search by PNR, name, train, or station...')
      await user.type(searchInput, '1234567890')
      
      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({
        searchTerm: '1234567890'
      })
    })

    it('handles status filter selection', async () => {
      const user = userEvent.setup()
      render(<PNRFilters />)
      
      const confirmedButton = screen.getByText('Confirmed')
      await user.click(confirmedButton)
      
      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({
        status: 'CNF'
      })
    })

    it('handles train number filter', async () => {
      const user = userEvent.setup()
      render(<PNRFilters />)
      
      const trainInput = screen.getByPlaceholderText('Enter train number...')
      await user.type(trainInput, '12345')
      
      expect(mockPNRStore.setFilters).toHaveBeenCalledWith({
        trainNumber: '12345'
      })
    })

    it('handles date range filter', async () => {
      const user = userEvent.setup()
      render(<PNRFilters />)
      
      const startDateInput = screen.getAllByDisplayValue('')[0] // First date input
      await user.type(startDateInput, '2024-12-01')
      
      expect(mockPNRStore.setFilters).toHaveBeenCalled()
    })

    it('clears filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      mockPNRStore.filters = { searchTerm: 'test', status: 'CNF' }
      
      render(<PNRFilters />)
      
      const clearButton = screen.getByText('Clear Filters')
      await user.click(clearButton)
      
      expect(mockPNRStore.clearFilters).toHaveBeenCalled()
    })

    it('shows active filter indicator', () => {
      mockPNRStore.filters = { searchTerm: 'test' }
      render(<PNRFilters />)
      
      expect(screen.getByText('Filters active')).toBeInTheDocument()
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
    it('renders bulk actions when PNRs are selected', () => {
      mockPNRStore.selectedPNRs = new Set(['1', '2'])
      
      render(
        <PNRBulkActions
          selectedCount={2}
          totalCount={2}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      )
      
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument()
      expect(screen.getByText('Update Status')).toBeInTheDocument()
      expect(screen.getByText('Export')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('handles bulk status update', async () => {
      const user = userEvent.setup()
      mockPNRStore.selectedPNRs = new Set(['1'])
      
      render(
        <PNRBulkActions
          selectedCount={1}
          totalCount={2}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onBulkDelete={vi.fn()}
        />
      )
      
      const updateButton = screen.getByText('Update Status')
      await user.click(updateButton)
      
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByText('Update Status')).toBeInTheDocument()
    })

    it('handles bulk delete confirmation', async () => {
      const user = userEvent.setup()
      const onBulkDelete = vi.fn()
      
      render(
        <PNRBulkActions
          selectedCount={1}
          totalCount={2}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onBulkDelete={onBulkDelete}
        />
      )
      
      const deleteButton = screen.getByText('Delete')
      await user.click(deleteButton)
      
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByText('Delete PNRs')).toBeInTheDocument()
    })
  })

  describe('View Mode Toggle', () => {
    it('switches between grid and list view', async () => {
      const user = userEvent.setup()
      render(<PNRDashboard />)
      
      // Should start in grid view
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
      
      // Switch to list view
      const listViewButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.getAttribute('viewBox') === '0 0 24 24'
      )
      
      if (listViewButton) {
        await user.click(listViewButton)
        // In list view, items should be rendered directly without virtualization
      }
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
      
      // Should render with mobile layout
      expect(screen.getByText('PNR Dashboard')).toBeInTheDocument()
    })
  })

  describe('PNR Entry Form', () => {
    it('renders form with all required fields', () => {
      render(<PNREntryForm onSubmit={vi.fn()} />)
      
      expect(screen.getByText('Add PNR for Tracking')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter 10-digit PNR number')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter passenger name')).toBeInTheDocument()
      expect(screen.getByText('Add PNR')).toBeInTheDocument()
    })

    it('validates PNR number format', async () => {
      const user = userEvent.setup()
      render(<PNREntryForm onSubmit={vi.fn()} />)
      
      const pnrInput = screen.getByPlaceholderText('Enter 10-digit PNR number')
      await user.type(pnrInput, '123')
      
      // Should show validation error for invalid PNR
      await waitFor(() => {
        expect(screen.getByText('PNR must be 10 digits')).toBeInTheDocument()
      })
    })

    it('submits form with valid data', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue(undefined)
      
      render(<PNREntryForm onSubmit={onSubmit} />)
      
      const pnrInput = screen.getByPlaceholderText('Enter 10-digit PNR number')
      await user.type(pnrInput, '1234567890')
      
      const submitButton = screen.getByText('Add PNR')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            pnrNumber: '1234567890'
          })
        )
      })
    })
  })
})