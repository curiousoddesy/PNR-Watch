import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '../ui/Card'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

interface PNRTimelineProps {
  pnr: PNR
  className?: string
}

interface TimelineEvent {
  id: string
  timestamp: string
  status: string
  description: string
  type: 'status_change' | 'booking' | 'chart_preparation' | 'departure' | 'arrival'
  isActive: boolean
  isPending: boolean
  metadata?: Record<string, any>
}

export const PNRTimeline: React.FC<PNRTimelineProps> = ({ pnr, className }) => {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [currentEventIndex, setCurrentEventIndex] = useState(0)

  useEffect(() => {
    // Generate timeline events based on PNR data
    const events: TimelineEvent[] = [
      {
        id: '1',
        timestamp: pnr.createdAt,
        status: 'Booking Confirmed',
        description: `PNR ${pnr.number} created for ${pnr.passengerName}`,
        type: 'booking',
        isActive: true,
        isPending: false,
        metadata: {
          passengers: pnr.status.passengers.length,
          class: pnr.class,
          quota: pnr.quota
        }
      }
    ]

    // Add status change events for each passenger
    pnr.status.passengers.forEach((passenger, index) => {
      if (passenger.bookingStatus !== passenger.currentStatus) {
        events.push({
          id: `status-${index}`,
          timestamp: pnr.status.lastUpdated,
          status: `Status Updated - ${passenger.currentStatus}`,
          description: `${passenger.name}'s status changed from ${passenger.bookingStatus} to ${passenger.currentStatus}`,
          type: 'status_change',
          isActive: true,
          isPending: false,
          metadata: {
            passenger: passenger.name,
            oldStatus: passenger.bookingStatus,
            newStatus: passenger.currentStatus,
            seatNumber: passenger.seatNumber
          }
        })
      }
    })

    // Add chart preparation event
    if (pnr.status.chartPrepared) {
      events.push({
        id: 'chart',
        timestamp: pnr.status.lastUpdated,
        status: 'Chart Prepared',
        description: 'Final chart has been prepared. Seat assignments confirmed.',
        type: 'chart_preparation',
        isActive: true,
        isPending: false
      })
    }

    // Add future events based on journey date
    const journeyDate = new Date(pnr.dateOfJourney)
    const now = new Date()
    
    if (journeyDate > now) {
      // Add departure event
      const departureTime = new Date(journeyDate)
      departureTime.setHours(
        parseInt(pnr.status.trainInfo.departureTime.split(':')[0]),
        parseInt(pnr.status.trainInfo.departureTime.split(':')[1])
      )
      
      events.push({
        id: 'departure',
        timestamp: departureTime.toISOString(),
        status: 'Train Departure',
        description: `${pnr.trainNumber} ${pnr.trainName} departs from ${pnr.from}`,
        type: 'departure',
        isActive: false,
        isPending: true,
        metadata: {
          station: pnr.from,
          time: pnr.status.trainInfo.departureTime
        }
      })

      // Add arrival event
      const arrivalTime = new Date(journeyDate)
      arrivalTime.setHours(
        parseInt(pnr.status.trainInfo.arrivalTime.split(':')[0]),
        parseInt(pnr.status.trainInfo.arrivalTime.split(':')[1])
      )
      
      events.push({
        id: 'arrival',
        timestamp: arrivalTime.toISOString(),
        status: 'Train Arrival',
        description: `${pnr.trainNumber} ${pnr.trainName} arrives at ${pnr.to}`,
        type: 'arrival',
        isActive: false,
        isPending: true,
        metadata: {
          station: pnr.to,
          time: pnr.status.trainInfo.arrivalTime
        }
      })
    }

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    setTimelineEvents(events)
    
    // Find current active event
    const activeIndex = events.findIndex(event => event.isActive && !event.isPending)
    setCurrentEventIndex(activeIndex >= 0 ? activeIndex : events.length - 1)
  }, [pnr])

  const getEventIcon = (type: TimelineEvent['type']) => {
    const icons = {
      booking: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      ),
      status_change: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      ),
      chart_preparation: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
      departure: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      ),
      arrival: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      )
    }
    return icons[type] || icons.booking
  }

  const getEventColor = (event: TimelineEvent) => {
    if (event.isPending) {
      return 'text-secondary-400 bg-secondary-100 dark:bg-secondary-700'
    }
    
    const colors = {
      booking: 'text-blue-600 bg-blue-100 dark:bg-blue-900',
      status_change: 'text-green-600 bg-green-100 dark:bg-green-900',
      chart_preparation: 'text-purple-600 bg-purple-100 dark:bg-purple-900',
      departure: 'text-orange-600 bg-orange-100 dark:bg-orange-900',
      arrival: 'text-red-600 bg-red-100 dark:bg-red-900'
    }
    return colors[event.type] || colors.booking
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (Math.abs(diffInHours) < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const getProgressPercentage = () => {
    if (timelineEvents.length === 0) return 0
    const completedEvents = timelineEvents.filter(event => event.isActive && !event.isPending).length
    return (completedEvents / timelineEvents.length) * 100
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Journey Progress
          </h3>
          <span className="text-sm text-secondary-600 dark:text-secondary-400">
            {Math.round(getProgressPercentage())}% Complete
          </span>
        </div>
        
        <div className="relative">
          <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercentage()}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          
          {/* Progress markers */}
          <div className="flex justify-between mt-2">
            {timelineEvents.map((event, index) => (
              <div
                key={event.id}
                className={cn(
                  'w-3 h-3 rounded-full border-2 transition-colors',
                  event.isActive && !event.isPending
                    ? 'bg-primary-600 border-primary-600'
                    : event.isPending
                    ? 'bg-secondary-200 border-secondary-300 dark:bg-secondary-700 dark:border-secondary-600'
                    : 'bg-secondary-100 border-secondary-200 dark:bg-secondary-800 dark:border-secondary-700'
                )}
                style={{ marginLeft: index === 0 ? '0' : '-6px' }}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* Timeline Events */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
          Status Timeline
        </h3>
        
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-secondary-200 dark:bg-secondary-700" />
          
          <AnimatePresence>
            {timelineEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-start gap-4 pb-6"
              >
                {/* Event icon */}
                <div className={cn(
                  'relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white dark:border-secondary-900',
                  getEventColor(event)
                )}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {getEventIcon(event.type)}
                  </svg>
                  
                  {/* Pulse animation for active events */}
                  {event.isActive && !event.isPending && (
                    <motion.div
                      className={cn(
                        'absolute inset-0 rounded-full',
                        getEventColor(event)
                      )}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Event content */}
                <Card className={cn(
                  'flex-1 p-4 transition-all duration-200',
                  event.isActive && !event.isPending && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900'
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-secondary-900 dark:text-secondary-100">
                          {event.status}
                        </h4>
                        {event.isPending && (
                          <span className="px-2 py-0.5 text-xs font-medium text-secondary-500 bg-secondary-100 dark:bg-secondary-700 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                        {event.description}
                      </p>
                      
                      {/* Event metadata */}
                      {event.metadata && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <span
                              key={key}
                              className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 rounded"
                            >
                              {key}: {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Next Steps */}
      {timelineEvents.some(event => event.isPending) && (
        <Card className="p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
            What's Next?
          </h3>
          <div className="space-y-2">
            {timelineEvents
              .filter(event => event.isPending)
              .slice(0, 2)
              .map((event) => (
                <div key={event.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary-500 rounded-full" />
                  <span className="text-sm text-secondary-700 dark:text-secondary-300">
                    {event.status} - {formatTimestamp(event.timestamp)}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}