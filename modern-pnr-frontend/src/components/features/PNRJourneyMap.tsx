import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

interface PNRJourneyMapProps {
  pnr: PNR
  className?: string
}

interface StationInfo {
  code: string
  name: string
  arrivalTime?: string
  departureTime?: string
  platform?: string
  distance: number
  coordinates: { lat: number; lng: number }
  isSource: boolean
  isDestination: boolean
  stopDuration?: number
}

interface RouteSegment {
  from: StationInfo
  to: StationInfo
  distance: number
  duration: number
  isCompleted: boolean
  isCurrent: boolean
}

export const PNRJourneyMap: React.FC<PNRJourneyMapProps> = ({ pnr, className }) => {
  const [stations, setStations] = useState<StationInfo[]>([])
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([])
  const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null)
  const [mapView, setMapView] = useState<'route' | 'stations'>('route')
  const [isLoading, setIsLoading] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulate loading station data and route information
    const loadJourneyData = async () => {
      setIsLoading(true)
      
      // Mock station data - in real implementation, this would come from an API
      const mockStations: StationInfo[] = [
        {
          code: pnr.from,
          name: getStationName(pnr.from),
          departureTime: pnr.status.trainInfo.departureTime,
          distance: 0,
          coordinates: { lat: 28.6139, lng: 77.2090 }, // Mock coordinates
          isSource: true,
          isDestination: false,
          platform: '1'
        },
        // Add intermediate stations (mock data)
        {
          code: 'JN',
          name: 'Junction Station',
          arrivalTime: '14:30',
          departureTime: '14:35',
          distance: 150,
          coordinates: { lat: 26.8467, lng: 80.9462 },
          isSource: false,
          isDestination: false,
          stopDuration: 5,
          platform: '2'
        },
        {
          code: pnr.to,
          name: getStationName(pnr.to),
          arrivalTime: pnr.status.trainInfo.arrivalTime,
          distance: 300,
          coordinates: { lat: 25.3176, lng: 82.9739 },
          isSource: false,
          isDestination: true,
          platform: '3'
        }
      ]

      // Create route segments
      const segments: RouteSegment[] = []
      for (let i = 0; i < mockStations.length - 1; i++) {
        const from = mockStations[i]
        const to = mockStations[i + 1]
        segments.push({
          from,
          to,
          distance: to.distance - from.distance,
          duration: calculateDuration(from.departureTime || from.arrivalTime || '00:00', to.arrivalTime || '00:00'),
          isCompleted: false, // Would be determined based on current time and train status
          isCurrent: i === 0 // Mock current segment
        })
      }

      setStations(mockStations)
      setRouteSegments(segments)
      setIsLoading(false)
    }

    loadJourneyData()
  }, [pnr])

  const getStationName = (code: string): string => {
    // Mock station name mapping - in real implementation, this would be from a database
    const stationNames: Record<string, string> = {
      'NDLS': 'New Delhi',
      'AGC': 'Agra Cantt',
      'JHS': 'Jhansi Junction',
      'BPL': 'Bhopal Junction',
      'NGP': 'Nagpur Junction',
      'BSP': 'Bilaspur Junction',
      'R': 'Raipur Junction',
      'DURG': 'Durg Junction',
      'BYT': 'Bhatapara',
      'CPH': 'Champa Junction'
    }
    return stationNames[code] || code
  }

  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    return (end.getTime() - start.getTime()) / (1000 * 60) // Duration in minutes
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getStationIcon = (station: StationInfo) => {
    if (station.isSource) {
      return (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      )
    }
    if (station.isDestination) {
      return (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      )
    }
    return (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    )
  }

  const getStationColor = (station: StationInfo) => {
    if (station.isSource) return 'text-green-600 bg-green-100 dark:bg-green-900'
    if (station.isDestination) return 'text-red-600 bg-red-100 dark:bg-red-900'
    return 'text-blue-600 bg-blue-100 dark:bg-blue-900'
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
          <div className="h-64 bg-secondary-200 dark:bg-secondary-700 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
            <div className="h-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
          Journey Route & Map
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant={mapView === 'route' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapView('route')}
          >
            Route View
          </Button>
          <Button
            variant={mapView === 'stations' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMapView('stations')}
          >
            Stations
          </Button>
        </div>
      </div>

      {/* Train Information */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              {pnr.status.trainInfo.distance}
            </div>
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              Total Distance
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              {pnr.status.trainInfo.duration}
            </div>
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              Journey Time
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
              {stations.length - 2}
            </div>
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              Intermediate Stops
            </div>
          </div>
        </div>
      </Card>

      {mapView === 'route' ? (
        <>
          {/* Route Visualization */}
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Route Progress</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="relative" ref={mapRef}>
                {/* Route line */}
                <div className="relative flex items-center justify-between mb-8">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-secondary-200 dark:bg-secondary-700 transform -translate-y-1/2" />
                  <motion.div
                    className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-green-500 to-blue-500 transform -translate-y-1/2"
                    initial={{ width: '0%' }}
                    animate={{ width: '33%' }} // Mock progress
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  
                  {/* Station markers */}
                  {stations.map((station, index) => (
                    <motion.div
                      key={station.code}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.2 }}
                      className="relative z-10"
                    >
                      <button
                        onClick={() => setSelectedStation(station)}
                        className={cn(
                          'w-12 h-12 rounded-full border-4 border-white dark:border-secondary-900 flex items-center justify-center transition-all duration-200 hover:scale-110',
                          getStationColor(station),
                          selectedStation?.code === station.code && 'ring-4 ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900'
                        )}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {getStationIcon(station)}
                        </svg>
                      </button>
                      
                      {/* Station label */}
                      <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-center">
                        <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100 whitespace-nowrap">
                          {station.code}
                        </div>
                        <div className="text-xs text-secondary-600 dark:text-secondary-400">
                          {station.departureTime || station.arrivalTime}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Train position indicator */}
                <motion.div
                  className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
                  initial={{ left: '0%' }}
                  animate={{ left: '33%' }} // Mock current position
                  transition={{ duration: 1, ease: "easeOut" }}
                >
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM4 7h12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
                    </svg>
                  </div>
                  <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 text-xs font-medium text-primary-600 whitespace-nowrap">
                    {pnr.trainNumber}
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Station Details */}
          {selectedStation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      getStationColor(selectedStation)
                    )}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {getStationIcon(selectedStation)}
                      </svg>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{selectedStation.name}</div>
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        Station Code: {selectedStation.code}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedStation.arrivalTime && (
                      <div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">Arrival</div>
                        <div className="font-medium text-secondary-900 dark:text-secondary-100">
                          {selectedStation.arrivalTime}
                        </div>
                      </div>
                    )}
                    {selectedStation.departureTime && (
                      <div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">Departure</div>
                        <div className="font-medium text-secondary-900 dark:text-secondary-100">
                          {selectedStation.departureTime}
                        </div>
                      </div>
                    )}
                    {selectedStation.platform && (
                      <div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">Platform</div>
                        <div className="font-medium text-secondary-900 dark:text-secondary-100">
                          {selectedStation.platform}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">Distance</div>
                      <div className="font-medium text-secondary-900 dark:text-secondary-100">
                        {selectedStation.distance} km
                      </div>
                    </div>
                  </div>
                  
                  {selectedStation.stopDuration && (
                    <div className="mt-4 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        Stop Duration: <span className="font-medium">{selectedStation.stopDuration} minutes</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      ) : (
        /* Stations List View */
        <div className="space-y-4">
          {stations.map((station, index) => (
            <motion.div
              key={station.code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      getStationColor(station)
                    )}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {getStationIcon(station)}
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">
                        {station.name}
                      </h4>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400">
                        {station.code} • {station.distance} km
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {station.arrivalTime && (
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        Arr: {station.arrivalTime}
                      </div>
                    )}
                    {station.departureTime && (
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        Dep: {station.departureTime}
                      </div>
                    )}
                    {station.platform && (
                      <div className="text-xs text-secondary-500 dark:text-secondary-500">
                        Platform {station.platform}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Route Summary */}
      <Card className="p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
        <h4 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
          Route Summary
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Running Days:</span>
            <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
              {pnr.status.trainInfo.runningDays.join(', ')}
            </span>
          </div>
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Total Stops:</span>
            <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
              {stations.length}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}