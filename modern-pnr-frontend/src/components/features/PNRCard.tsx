import React, { useState } from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'
import { usePNRStore } from '../../stores/pnrStore'

interface PNRCardProps {
  pnr: PNR
  isSelected?: boolean
  onSelect?: (id: string) => void
  onEdit?: (pnr: PNR) => void
  onDelete?: (id: string) => void
  onViewDetails?: (pnr: PNR) => void
  className?: string
}

const statusColors = {
  'CNF': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'RAC': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'WL': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'CAN': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'PQWL': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'RLWL': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export const PNRCard: React.FC<PNRCardProps> = ({
  pnr,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onViewDetails,
  className
}) => {
  const [isRevealed, setIsRevealed] = useState(false)
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5])
  const scale = useTransform(x, [-100, 0, 100], [0.95, 1, 0.95])
  
  const { togglePNRSelection } = usePNRStore()

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50
    
    if (info.offset.x > threshold) {
      // Swipe right - reveal actions
      setIsRevealed(true)
    } else if (info.offset.x < -threshold) {
      // Swipe left - hide actions or quick delete
      if (isRevealed) {
        setIsRevealed(false)
      } else {
        onDelete?.(pnr.id)
      }
    } else {
      // Snap back
      setIsRevealed(false)
    }
  }

  const handleCardClick = () => {
    if (!isRevealed) {
      onViewDetails?.(pnr)
    }
  }

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.(pnr.id)
    togglePNRSelection(pnr.id)
  }

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Action buttons background */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-4 bg-gradient-to-l from-red-500 to-orange-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: isRevealed ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(pnr)}
            className="text-white hover:bg-white/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(pnr.id)}
            className="text-white hover:bg-white/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </motion.div>

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x, opacity, scale }}
        whileTap={{ scale: 0.98 }}
        className="relative z-10"
      >
        <Card
          hoverable
          className={cn(
            'cursor-pointer transition-all duration-200',
            isSelected && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900',
            className
          )}
          onClick={handleCardClick}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectClick}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-500'
                  )}
                >
                  {isSelected && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    PNR: {pnr.number}
                  </CardTitle>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    {pnr.passengerName}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  getStatusColor(pnr.status.currentStatus)
                )}
              >
                {pnr.status.currentStatus}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Train Information */}
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="font-medium">{pnr.trainNumber}</span>
              <span className="text-secondary-600 dark:text-secondary-400">
                {pnr.trainName}
              </span>
            </div>

            {/* Route Information */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">{pnr.from}</span>
              </div>
              <div className="flex-1 mx-3 border-t border-dashed border-secondary-300 dark:border-secondary-600"></div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{pnr.to}</span>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
            </div>

            {/* Journey Details */}
            <div className="flex items-center justify-between text-sm text-secondary-600 dark:text-secondary-400">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(pnr.dateOfJourney)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-secondary-100 dark:bg-secondary-700 px-2 py-1 rounded text-xs">
                  {pnr.class}
                </span>
                <span className="bg-secondary-100 dark:bg-secondary-700 px-2 py-1 rounded text-xs">
                  {pnr.quota}
                </span>
              </div>
            </div>

            {/* Passenger Status */}
            {pnr.status.passengers.length > 0 && (
              <div className="pt-2 border-t border-secondary-200 dark:border-secondary-700">
                <div className="text-xs text-secondary-500 mb-1">
                  {pnr.status.passengers.length} Passenger{pnr.status.passengers.length > 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  {pnr.status.passengers.slice(0, 2).map((passenger, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-secondary-700 dark:text-secondary-300">
                        {passenger.name} ({passenger.age}{passenger.gender})
                      </span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-xs',
                        getStatusColor(passenger.currentStatus)
                      )}>
                        {passenger.currentStatus}
                        {passenger.seatNumber && ` - ${passenger.seatNumber}`}
                      </span>
                    </div>
                  ))}
                  {pnr.status.passengers.length > 2 && (
                    <div className="text-xs text-secondary-500">
                      +{pnr.status.passengers.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Last Updated */}
            <div className="flex items-center justify-between text-xs text-secondary-500">
              <span>Updated: {formatDate(pnr.updatedAt)}</span>
              {pnr.status.chartPrepared && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Chart Prepared
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Swipe indicator */}
      <motion.div
        className="absolute top-1/2 left-4 transform -translate-y-1/2 text-secondary-400"
        initial={{ opacity: 0, x: -10 }}
        animate={{ 
          opacity: isRevealed ? 0 : 1,
          x: isRevealed ? -10 : 0
        }}
        transition={{ duration: 0.2 }}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </motion.div>
    </div>
  )
}