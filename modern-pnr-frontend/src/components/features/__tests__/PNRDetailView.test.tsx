import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PNRDetailView } from '../PNRDetailView'
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

// Mock the dependencies
vi.mock('../../../stores/pnrStore', () => ({
  usePNRStore: () => ({
    updatePNRStatus: vi.fn()
  })
}))

vi.mock('../../ui/Modal', () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => 
    isOpen ? <div data-testid="modal">{children}</div> : null
}))

vi.mock('../../ui/ShareModal', () => ({
  ShareModal: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="share-modal">Share Modal</div> : null
}))

vi.mock('../PNRTimeline', () => ({
  PNRTimeline: () => <div data-testid="pnr-timeline">Timeline</div>
}))

vi.mock('../PNRJourneyMap', () => ({
  PNRJourneyMap: () => <div data-testid="pnr-journey-map">Journey Map</div>
}))

vi.mock('../PNRStatusChart', () => ({
  PNRStatusChart: () => <div data-testid="pnr-status-chart">Status Chart</div>
}))

vi.mock('../PNRExportOptions', () => ({
  PNRExportOptions: ({ isOpen }: { isOpen: boolean }) => 
    isOpen ? <div data-testid="export-options">Export Options</div> : null
}))

const mockPNR: PNR = {
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
        bookingStatus: 'WL/15',
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
}

describe('PNRDetailView', () => {
  it('renders when open', () => {
    render(
      <PNRDetailView
        pnr={mockPNR}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByText('PNR: 1234567890')).toBeInTheDocument()
    expect(screen.getByText('John Doe • 12345 Rajdhani Express')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <PNRDetailView
        pnr={mockPNR}
        isOpen={false}
        onClose={vi.fn()}
      />
    )

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('displays timeline by default', () => {
    render(
      <PNRDetailView
        pnr={mockPNR}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByTestId('pnr-timeline')).toBeInTheDocument()
  })

  it('shows PNR status and basic information', () => {
    render(
      <PNRDetailView
        pnr={mockPNR}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('CNF')).toBeInTheDocument()
    expect(screen.getByText('NDLS → HWH')).toBeInTheDocument()
    expect(screen.getByText('3A • GN')).toBeInTheDocument()
  })
})