import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../utils/cn'
import { usePNRStore } from '../../stores/pnrStore'

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'CNF', label: 'Confirmed', color: 'bg-green-500' },
  { value: 'RAC', label: 'RAC', color: 'bg-yellow-500' },
  { value: 'WL', label: 'Waiting List', color: 'bg-orange-500' },
  { value: 'CAN', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'PQWL', label: 'PQWL', color: 'bg-blue-500' },
  { value: 'RLWL', label: 'RLWL', color: 'bg-purple-500' },
]

const quickDateRanges = [
  { label: 'Today', days: 0 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'Last 3 Months', days: 90 },
]

export const PNRFilters: React.FC = () => {
  const { filters, setFilters, clearFilters, pnrs } = usePNRStore()
  const [localFilters, setLocalFilters] = useState(filters)

  // Sync local filters with store
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // Get unique train numbers for suggestions
  const uniqueTrainNumbers = Array.from(
    new Set(pnrs.map(pnr => pnr.trainNumber))
  ).sort()

  const handleSearchChange = (value: string) => {
    const newFilters = { ...localFilters, searchTerm: value }
    setLocalFilters(newFilters)
    setFilters(newFilters)
  }

  const handleStatusChange = (status: string) => {
    const newFilters = { ...localFilters, status: status || undefined }
    setLocalFilters(newFilters)
    setFilters(newFilters)
  }

  const handleTrainNumberChange = (trainNumber: string) => {
    const newFilters = { ...localFilters, trainNumber: trainNumber || undefined }
    setLocalFilters(newFilters)
    setFilters(newFilters)
  }

  const handleDateRangeChange = (start: string, end: string) => {
    const newFilters = {
      ...localFilters,
      dateRange: start && end ? { start, end } : undefined
    }
    setLocalFilters(newFilters)
    setFilters(newFilters)
  }

  const handleQuickDateRange = (days: number) => {
    if (days === 0) {
      const today = new Date().toISOString().split('T')[0]
      handleDateRangeChange(today, today)
    } else {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - days)
      handleDateRangeChange(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      )
    }
  }

  const handleClearFilters = () => {
    setLocalFilters({})
    clearFilters()
  }

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof typeof filters]
    return value !== undefined && value !== ''
  })

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Search PNRs
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by PNR, name, train, or station..."
                value={localFilters.searchTerm || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-colors',
                      localFilters.status === option.value
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300'
                        : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                    )}
                  >
                    {option.color && (
                      <div className={cn('w-2 h-2 rounded-full', option.color)} />
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Train Number Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Train Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter train number..."
                  value={localFilters.trainNumber || ''}
                  onChange={(e) => handleTrainNumberChange(e.target.value)}
                  list="train-numbers"
                  className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <datalist id="train-numbers">
                  {uniqueTrainNumbers.map((trainNumber) => (
                    <option key={trainNumber} value={trainNumber} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
                Journey Date
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={localFilters.dateRange?.start || ''}
                    onChange={(e) => handleDateRangeChange(e.target.value, localFilters.dateRange?.end || '')}
                    className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="date"
                    value={localFilters.dateRange?.end || ''}
                    onChange={(e) => handleDateRangeChange(localFilters.dateRange?.start || '', e.target.value)}
                    className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-1">
                  {quickDateRanges.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => handleQuickDateRange(range.days)}
                      className="px-2 py-1 text-xs bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 rounded hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-secondary-200 dark:border-secondary-700">
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              {hasActiveFilters && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                  </svg>
                  Filters active
                </motion.span>
              )}
            </div>
            
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}