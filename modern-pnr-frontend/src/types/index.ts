export interface PNR {
  id: string
  number: string
  status: PNRStatus
  passengerName: string
  trainNumber: string
  trainName: string
  dateOfJourney: string
  from: string
  to: string
  class: string
  quota: string
  createdAt: string
  updatedAt: string
}

export interface PNRStatus {
  currentStatus: string
  chartPrepared: boolean
  passengers: Passenger[]
  trainInfo: TrainInfo
  lastUpdated: string
}

export interface Passenger {
  serialNumber: number
  name: string
  age: number
  gender: string
  currentStatus: string
  bookingStatus: string
  coachPosition?: string
  seatNumber?: string
}

export interface TrainInfo {
  number: string
  name: string
  departureTime: string
  arrivalTime: string
  duration: string
  distance: string
  runningDays: string[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}
