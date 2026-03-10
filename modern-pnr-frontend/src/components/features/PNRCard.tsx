import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

interface PNRCardProps {
  pnr: PNR
  onClick?: () => void
  onDelete?: (id: string) => void
  className?: string
}

const statusColors: Record<string, string> = {
  'CNF': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'RAC': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'WL': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'CAN': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'PQWL': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'RLWL': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

const getStatusColor = (status: string) =>
  statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

export const PNRCard: React.FC<PNRCardProps> = ({ pnr, onClick, onDelete, className }) => {
  return (
    <Card
      hoverable
      className={cn('cursor-pointer', className)}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              PNR: {pnr.number}
            </CardTitle>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              {pnr.passengerName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              getStatusColor(pnr.status.currentStatus)
            )}>
              {pnr.status.currentStatus}
            </span>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(pnr.id) }}
                className="p-1 text-secondary-400 hover:text-red-500 transition-colors"
                aria-label="Delete PNR"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{pnr.trainNumber}</span>
          <span className="text-secondary-600 dark:text-secondary-400">{pnr.trainName}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{pnr.from}</span>
          <div className="flex-1 mx-3 border-t border-dashed border-secondary-300 dark:border-secondary-600" />
          <span className="font-medium">{pnr.to}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-secondary-600 dark:text-secondary-400">
          <span>{formatDate(pnr.dateOfJourney)}</span>
          <span className="bg-secondary-100 dark:bg-secondary-700 px-2 py-1 rounded text-xs">
            {pnr.class}
          </span>
        </div>

        {pnr.status.passengers.length > 0 && (
          <div className="pt-2 border-t border-secondary-200 dark:border-secondary-700">
            <div className="text-xs text-secondary-500 mb-1">
              {pnr.status.passengers.length} Passenger{pnr.status.passengers.length > 1 ? 's' : ''}
            </div>
            {pnr.status.passengers.slice(0, 2).map((passenger, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-secondary-700 dark:text-secondary-300">
                  {passenger.name} ({passenger.age}{passenger.gender})
                </span>
                <span className={cn('px-1.5 py-0.5 rounded', getStatusColor(passenger.currentStatus))}>
                  {passenger.currentStatus}
                  {passenger.seatNumber && ` - ${passenger.seatNumber}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {pnr.status.chartPrepared && (
          <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Chart Prepared
          </div>
        )}
      </CardContent>
    </Card>
  )
}
