import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { PNR } from '../../types'

interface PNRStatusChartProps {
  pnr: PNR
  className?: string
}

interface StatusHistoryEntry {
  timestamp: string
  status: string
  passenger: string
  seatNumber?: string
  previousStatus?: string
  confidence: number
}

interface ChartDataPoint {
  date: string
  status: string
  count: number
  percentage: number
}

export const PNRStatusChart: React.FC<PNRStatusChartProps> = ({ pnr, className }) => {
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [chartView, setChartView] = useState<'timeline' | 'distribution' | 'trends'>('timeline')
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Generate mock status history data
    const generateStatusHistory = () => {
      const history: StatusHistoryEntry[] = []
      const now = new Date()
      
      // Generate historical data for each passenger
      pnr.status.passengers.forEach((passenger, index) => {
        // Initial booking status
        history.push({
          timestamp: pnr.createdAt,
          status: passenger.bookingStatus,
          passenger: passenger.name,
          confidence: 100
        })

        // Generate some intermediate status changes
        if (passenger.bookingStatus !== passenger.currentStatus) {
          const intermediateStatuses = generateIntermediateStatuses(
            passenger.bookingStatus,
            passenger.currentStatus
          )
          
          intermediateStatuses.forEach((status, statusIndex) => {
            const changeDate = new Date(now.getTime() - (7 - statusIndex) * 24 * 60 * 60 * 1000)
            history.push({
              timestamp: changeDate.toISOString(),
              status: status.status,
              passenger: passenger.name,
              seatNumber: status.seatNumber,
              previousStatus: statusIndex === 0 ? passenger.bookingStatus : intermediateStatuses[statusIndex - 1].status,
              confidence: status.confidence
            })
          })
        }
      })

      // Sort by timestamp
      history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      setStatusHistory(history)
      setIsLoading(false)
    }

    generateStatusHistory()
  }, [pnr])

  const generateIntermediateStatuses = (from: string, to: string) => {
    // Mock logic for generating intermediate status changes
    const statusProgression: Record<string, string[]> = {
      'WL': ['RAC', 'CNF'],
      'PQWL': ['WL', 'RAC', 'CNF'],
      'RLWL': ['WL', 'RAC', 'CNF'],
      'RAC': ['CNF']
    }

    const progression = statusProgression[from] || []
    const targetIndex = progression.indexOf(to)
    
    if (targetIndex === -1) {
      return [{ status: to, confidence: 85, seatNumber: 'S1/45' }]
    }

    return progression.slice(0, targetIndex + 1).map((status, index) => ({
      status,
      confidence: 70 + (index * 10),
      seatNumber: status === 'CNF' ? `S${index + 1}/${40 + index * 5}` : undefined
    }))
  }

  const filteredHistory = useMemo(() => {
    const now = new Date()
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': Infinity
    }

    const cutoff = now.getTime() - timeRanges[selectedTimeRange]
    return statusHistory.filter(entry => 
      selectedTimeRange === 'all' || new Date(entry.timestamp).getTime() >= cutoff
    )
  }, [statusHistory, selectedTimeRange])

  const chartData = useMemo(() => {
    const statusCounts: Record<string, number> = {}
    const totalEntries = filteredHistory.length

    filteredHistory.forEach(entry => {
      statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1
    })

    return Object.entries(statusCounts).map(([status, count]) => ({
      date: '',
      status,
      count,
      percentage: (count / totalEntries) * 100
    }))
  }, [filteredHistory])

  const getStatusColor = (status: string) => {
    const colors = {
      'CNF': 'bg-green-500',
      'RAC': 'bg-yellow-500',
      'WL': 'bg-orange-500',
      'CAN': 'bg-red-500',
      'PQWL': 'bg-blue-500',
      'RLWL': 'bg-purple-500',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-500'
  }

  const getStatusTextColor = (status: string) => {
    const colors = {
      'CNF': 'text-green-600 dark:text-green-400',
      'RAC': 'text-yellow-600 dark:text-yellow-400',
      'WL': 'text-orange-600 dark:text-orange-400',
      'CAN': 'text-red-600 dark:text-red-400',
      'PQWL': 'text-blue-600 dark:text-blue-400',
      'RLWL': 'text-purple-600 dark:text-purple-400',
    }
    return colors[status as keyof typeof colors] || 'text-gray-600 dark:text-gray-400'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
          <div className="h-64 bg-secondary-200 dark:bg-secondary-700 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
            <div className="h-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
            <div className="h-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
          Status History & Analytics
        </h3>
        
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center border border-secondary-300 dark:border-secondary-600 rounded-md">
            {(['24h', '7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={cn(
                  'px-3 py-1 text-sm transition-colors',
                  selectedTimeRange === range
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                )}
              >
                {range === 'all' ? 'All' : range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* View Selector */}
          <div className="flex items-center border border-secondary-300 dark:border-secondary-600 rounded-md">
            {(['timeline', 'distribution', 'trends'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setChartView(view)}
                className={cn(
                  'px-3 py-1 text-sm capitalize transition-colors',
                  chartView === view
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                )}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Content */}
      {chartView === 'timeline' && (
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Status Change Timeline</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-4">
              {filteredHistory.map((entry, index) => (
                <motion.div
                  key={`${entry.timestamp}-${entry.passenger}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-secondary-50 dark:bg-secondary-800 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <div className={cn(
                      'w-3 h-3 rounded-full',
                      getStatusColor(entry.status)
                    )} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-secondary-900 dark:text-secondary-100">
                        {entry.passenger}
                      </span>
                      <span className={cn('text-sm font-medium', getStatusTextColor(entry.status))}>
                        {entry.status}
                      </span>
                      {entry.seatNumber && (
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">
                          • {entry.seatNumber}
                        </span>
                      )}
                    </div>
                    
                    {entry.previousStatus && (
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        Changed from {entry.previousStatus} to {entry.status}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500">
                      <span>{formatTimestamp(entry.timestamp)}</span>
                      <span>Confidence: {entry.confidence}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {chartView === 'distribution' && (
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-4">
              {chartData.map((data, index) => (
                <motion.div
                  key={data.status}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: '100%' }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded-full', getStatusColor(data.status))} />
                      <span className="font-medium text-secondary-900 dark:text-secondary-100">
                        {data.status}
                      </span>
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      {data.count} ({data.percentage.toFixed(1)}%)
                    </div>
                  </div>
                  
                  <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                    <motion.div
                      className={cn('h-2 rounded-full', getStatusColor(data.status))}
                      initial={{ width: 0 }}
                      animate={{ width: `${data.percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {chartView === 'trends' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Progression Chart */}
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Status Progression</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                {pnr.status.passengers.map((passenger, index) => (
                  <div key={passenger.name} className="space-y-2">
                    <div className="font-medium text-secondary-900 dark:text-secondary-100">
                      {passenger.name}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className={cn('w-2 h-2 rounded-full', getStatusColor(passenger.bookingStatus))} />
                        <span className="text-sm text-secondary-600 dark:text-secondary-400">
                          {passenger.bookingStatus}
                        </span>
                      </div>
                      
                      <svg className="w-4 h-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      
                      <div className="flex items-center gap-1">
                        <div className={cn('w-2 h-2 rounded-full', getStatusColor(passenger.currentStatus))} />
                        <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                          {passenger.currentStatus}
                        </span>
                      </div>
                    </div>
                    
                    {passenger.seatNumber && (
                      <div className="text-xs text-secondary-500">
                        Seat: {passenger.seatNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                    <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      {filteredHistory.length}
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      Total Changes
                    </div>
                  </div>
                  
                  <div className="text-center p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                    <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                      {new Set(filteredHistory.map(h => h.status)).size}
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400">
                      Unique Statuses
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    Most Recent Changes
                  </div>
                  {filteredHistory.slice(-3).reverse().map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-secondary-600 dark:text-secondary-400">
                        {entry.passenger}
                      </span>
                      <span className={cn('font-medium', getStatusTextColor(entry.status))}>
                        {entry.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20">
        <h4 className="font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
          Status Summary
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Current Status:</span>
            <span className={cn('ml-2 font-medium', getStatusTextColor(pnr.status.currentStatus))}>
              {pnr.status.currentStatus}
            </span>
          </div>
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Chart Status:</span>
            <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
              {pnr.status.chartPrepared ? 'Prepared' : 'Not Prepared'}
            </span>
          </div>
          <div>
            <span className="text-secondary-600 dark:text-secondary-400">Last Updated:</span>
            <span className="ml-2 font-medium text-secondary-900 dark:text-secondary-100">
              {formatTimestamp(pnr.status.lastUpdated)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}