import type { Context } from '@netlify/functions'

interface UpstreamPassenger {
  Number?: number
  Name?: string
  BookingStatus?: string
  CurrentStatus?: string
  // RapidAPI variant fields seen in the wild
  Passenger_Serial_Number?: number
  Passenger_Name?: string
  Booking_Status?: string
  Current_Status?: string
}

interface UpstreamResponse {
  Pnr?: string
  PnrNumber?: string
  TrainNo?: string
  TrainNumber?: string
  TrainName?: string
  From?: string
  To?: string
  Doj?: string
  DateOfJourney?: string
  BoardingStationName?: string
  BoardingPoint?: string
  ReservationUpto?: string
  ReservationUptoName?: string
  Class?: string
  Quota?: string
  ChartPrepared?: string | boolean
  ChartStatus?: string
  PassengerStatus?: UpstreamPassenger[]
  passengerList?: UpstreamPassenger[]
  ArrivalTime?: string
  DepartureTime?: string
  Status?: string
  // The provider sometimes wraps the body
  data?: UpstreamResponse
}

const pickString = (raw: any, ...keys: string[]): string => {
  for (const k of keys) {
    const v = k.split('.').reduce<any>((o, p) => (o == null ? o : o[p]), raw)
    if (v != null && v !== '') return String(v)
  }
  return ''
}

const isChartPrepared = (raw: any): boolean => {
  const v =
    raw?.ChartPrepared ??
    raw?.chartPrepared ??
    raw?.ChartStatus ??
    raw?.chartStatus
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const t = v.trim().toUpperCase()
    return t === 'Y' || t === 'YES' || t === 'TRUE' || t.startsWith('CHART PREPARED')
  }
  return false
}

const headStatus = (s: string): string => (s ? s.split('/')[0].trim() : 'Unknown')

export default async (req: Request, _context: Context) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405)
  }

  const apiKey = process.env.RAPIDAPI_KEY
  const apiHost = process.env.RAPIDAPI_HOST || 'irctc-indian-railway-pnr-status.p.rapidapi.com'

  if (!apiKey) {
    return json(
      {
        success: false,
        error:
          'Live PNR lookup is not configured. Set RAPIDAPI_KEY in Netlify environment variables.',
      },
      503,
    )
  }

  let pnr = ''
  try {
    const body = (await req.json()) as { pnr?: string }
    pnr = String(body?.pnr ?? '').replace(/\D/g, '').slice(0, 10)
  } catch {
    return json({ success: false, error: 'Invalid request body' }, 400)
  }

  if (!/^\d{10}$/.test(pnr)) {
    return json({ success: false, error: 'PNR must be exactly 10 digits' }, 400)
  }

  let raw: UpstreamResponse
  try {
    const upstream = await fetch(`https://${apiHost}/getPNRStatus/${pnr}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
        'content-type': 'application/json',
      },
    })

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      return json(
        {
          success: false,
          error: `PNR provider returned ${upstream.status}`,
          detail: text.slice(0, 240) || undefined,
        },
        upstream.status === 429 ? 429 : 502,
      )
    }

    raw = (await upstream.json()) as UpstreamResponse
  } catch (e) {
    return json(
      {
        success: false,
        error: e instanceof Error ? e.message : 'Network error reaching PNR provider',
      },
      502,
    )
  }

  // Some providers wrap the payload under `data`.
  const r: UpstreamResponse = raw?.data ?? raw

  const passengersRaw: UpstreamPassenger[] =
    r.PassengerStatus ?? r.passengerList ?? []

  const passengers = passengersRaw.map((p, i) => ({
    serialNumber: Number(p.Number ?? p.Passenger_Serial_Number ?? i + 1),
    name: String(p.Name ?? p.Passenger_Name ?? `Passenger ${i + 1}`),
    bookingStatus: String(p.BookingStatus ?? p.Booking_Status ?? ''),
    currentStatus: String(p.CurrentStatus ?? p.Current_Status ?? ''),
  }))

  const overallStatus =
    headStatus(passengers[0]?.currentStatus) !== 'Unknown'
      ? headStatus(passengers[0]!.currentStatus)
      : pickString(r, 'Status') || 'Unknown'

  const data = {
    pnr,
    trainNumber: pickString(r, 'TrainNo', 'TrainNumber'),
    trainName: pickString(r, 'TrainName'),
    from: pickString(r, 'BoardingStationName', 'BoardingPoint', 'From'),
    to: pickString(r, 'ReservationUptoName', 'ReservationUpto', 'To'),
    dateOfJourney: pickString(r, 'Doj', 'DateOfJourney'),
    currentStatus: overallStatus,
    chartPrepared: isChartPrepared(r),
    passengers,
    departureTime: pickString(r, 'DepartureTime'),
    arrivalTime: pickString(r, 'ArrivalTime'),
    boardingPoint: pickString(r, 'BoardingPoint', 'BoardingStationName'),
    isFlushed: false,
  }

  // If we got nothing meaningful back, treat as not found.
  if (!data.trainNumber && passengers.length === 0) {
    return json(
      { success: false, error: 'PNR not found or already flushed', data: { ...data, isFlushed: true } },
      404,
    )
  }

  return json({ success: true, data })
}
