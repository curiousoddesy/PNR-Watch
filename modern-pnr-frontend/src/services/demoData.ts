import type { PNR } from '../types'

const today = () => {
  const d = new Date()
  d.setDate(d.getDate() + 5)
  return d.toISOString()
}

const inDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

export const DEMO_PNRS: Record<string, PNR> = {
  '0000000001': {
    id: 'demo-cnf',
    number: '0000000001',
    passengerName: 'Anaya Sharma',
    trainNumber: '12952',
    trainName: 'Mumbai Rajdhani',
    dateOfJourney: inDays(3),
    from: 'NDLS',
    to: 'BCT',
    class: '2A',
    quota: 'GN',
    createdAt: today(),
    updatedAt: today(),
    status: {
      currentStatus: 'CNF',
      chartPrepared: true,
      passengers: [
        { serialNumber: 1, name: 'Anaya Sharma', age: 32, gender: 'F', currentStatus: 'CNF', bookingStatus: 'CNF', coachPosition: 'A2', seatNumber: '24' },
        { serialNumber: 2, name: 'Vikram Sharma', age: 35, gender: 'M', currentStatus: 'CNF', bookingStatus: 'CNF', coachPosition: 'A2', seatNumber: '25' },
      ],
      trainInfo: {
        number: '12952',
        name: 'Mumbai Rajdhani',
        departureTime: '16:55',
        arrivalTime: '08:35',
        duration: '15h 40m',
        distance: '1384 km',
        runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      lastUpdated: today(),
    },
  },
  '0000000002': {
    id: 'demo-wl',
    number: '0000000002',
    passengerName: 'Rohan Mehta',
    trainNumber: '12260',
    trainName: 'Sealdah Duronto',
    dateOfJourney: inDays(9),
    from: 'NDLS',
    to: 'SDAH',
    class: '3A',
    quota: 'GN',
    createdAt: today(),
    updatedAt: today(),
    status: {
      currentStatus: 'WL',
      chartPrepared: false,
      passengers: [
        { serialNumber: 1, name: 'Rohan Mehta', age: 27, gender: 'M', currentStatus: 'WL/12', bookingStatus: 'WL/47' },
        { serialNumber: 2, name: 'Priya Mehta', age: 26, gender: 'F', currentStatus: 'WL/13', bookingStatus: 'WL/48' },
      ],
      trainInfo: {
        number: '12260',
        name: 'Sealdah Duronto',
        departureTime: '21:50',
        arrivalTime: '13:00',
        duration: '15h 10m',
        distance: '1452 km',
        runningDays: [],
      },
      lastUpdated: today(),
    },
  },
  '0000000003': {
    id: 'demo-rac',
    number: '0000000003',
    passengerName: 'Aarav Iyer',
    trainNumber: '22691',
    trainName: 'Rajdhani Express',
    dateOfJourney: inDays(1),
    from: 'KSR Bengaluru',
    to: 'NZM',
    class: '1A',
    quota: 'GN',
    createdAt: today(),
    updatedAt: today(),
    status: {
      currentStatus: 'RAC',
      chartPrepared: true,
      passengers: [
        { serialNumber: 1, name: 'Aarav Iyer', age: 41, gender: 'M', currentStatus: 'RAC/3', bookingStatus: 'RAC/8', coachPosition: 'HA1', seatNumber: '12' },
      ],
      trainInfo: {
        number: '22691',
        name: 'Rajdhani Express',
        departureTime: '20:00',
        arrivalTime: '05:55',
        duration: '33h 55m',
        distance: '2444 km',
        runningDays: [],
      },
      lastUpdated: today(),
    },
  },
}

export const isDemoPNR = (n: string) => Object.prototype.hasOwnProperty.call(DEMO_PNRS, n)
export const getDemoPNR = (n: string) => DEMO_PNRS[n]
