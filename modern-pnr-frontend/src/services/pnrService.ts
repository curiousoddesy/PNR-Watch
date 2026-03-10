import type { PNR, PNRStatus } from '../types'

interface IRCTCResponse {
  success: boolean
  data?: {
    pnr: string
    trainNumber: string
    trainName: string
    from: string
    to: string
    dateOfJourney: string
    currentStatus: string
    chartPrepared: boolean
    passengers: Array<{
      serialNumber: number
      name: string
      bookingStatus: string
      currentStatus: string
    }>
    departureTime: string
    arrivalTime: string
    boardingPoint: string
    isFlushed: boolean
  }
  error?: string
}

const API_BASE = '/.netlify/functions'

/**
 * Fetch PNR status from the Netlify serverless function (which proxies IRCTC)
 */
export async function checkPNRStatus(pnrNumber: string): Promise<PNR> {
  const response = await fetch(`${API_BASE}/check-pnr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pnr: pnrNumber }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to check PNR status (${response.status})`)
  }

  const result: IRCTCResponse = await response.json()

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to fetch PNR status')
  }

  const data = result.data

  // Map IRCTC response to our PNR type
  const pnr: PNR = {
    id: `pnr-${pnrNumber}`,
    number: pnrNumber,
    passengerName: data.passengers[0]?.name || 'Passenger',
    trainNumber: data.trainNumber || '—',
    trainName: data.trainName || '—',
    dateOfJourney: data.dateOfJourney || '—',
    from: data.from || '—',
    to: data.to || '—',
    class: '—',
    quota: 'GN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: {
      currentStatus: data.currentStatus || 'Unknown',
      chartPrepared: data.chartPrepared,
      passengers: data.passengers.map(p => ({
        serialNumber: p.serialNumber,
        name: p.name,
        age: 0,
        gender: '',
        currentStatus: p.currentStatus,
        bookingStatus: p.bookingStatus,
      })),
      trainInfo: {
        number: data.trainNumber || '',
        name: data.trainName || '',
        departureTime: data.departureTime || '',
        arrivalTime: data.arrivalTime || '',
        duration: '',
        distance: '',
        runningDays: [],
      },
      lastUpdated: new Date().toISOString(),
    },
  }

  return pnr
}
