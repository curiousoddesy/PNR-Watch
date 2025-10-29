import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FixedSizeList as List } from 'react-window'
import { PNRCard } from './PNRCard'
import { PNRFilters } from './PNRFilters'
import { PNRBulkActions } from './PNRBulkActions'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import { cn } from '../../utils/cn'
import { usePNRStore } from '../../stores/pnrStore'
import { useAppStore } from '../../stores/appStore'
import { PNR } from '../../types'

interface PNRDashboardProps {
  className?: string
  onPNREdit?: (pnr: PNR) => void
  onPNRDelete?: (id: string) => void
  onPNRDetails?: (pnr: PNR) => void
  onAddPNR?: () => void
}

const CARD_HEIGHT = 280
const CARDS_PER_ROW = {
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4
}

export const PNRDashboard: React.FC<PNRDashboardProps> = ({
  className,
  onPNREdit,
  onPNRDelete,
  onPNRDetails,
  onAddPNR
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [showFilters, setShowFilters] = useState(false)
  
  const {
    pnrs,
    selectedPNRs,
    filters,
    sortConfig,
    isLoading,
    error,
    clearSelection,
    selectAllPNRs,
    setSortConfig,
    bulkDelete
  } = usePNRStore()
  
  const { realtime } = useAppStore()

  // Handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width < 640) setScreenSize('sm')
      else if (width < 768) setScreenSize('md')
      else if (width < 1024) setScreenSize('lg')
      else setScreenSize('xl')
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Filter and sort PNRs
  const filteredAndSortedPNRs = useMemo(() => {
    let filtered = [...pnrs]

    // Apply filters
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(pnr =>
        pnr.number.toLowerCase().includes(searchLower) ||
        pnr.passengerName.toLowerCase().includes(searchLower) ||
        pnr.trainNumber.toLowerCase().includes(searchLower) ||
        pnr.trainName.toLowerCase().includes(searchLower) ||
        pnr.from.toLowerCase().includes(searchLower) ||
        pnr.to.toLowerCase().includes(searchLower)
      )
    }

    if (filters.status) {
      filtered = filtered.filter(pnr => pnr.status.currentStatus === filters.status)
    }

    if (filters.trainNumber) {
      filtered = filtered.filter(pnr => pnr.trainNumber.includes(filters.trainNumber!))
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      filtered = filtered.filter(pnr => {
        const journeyDate = new Date(pnr.dateOfJourney)
        return journeyDate >= new Date(start) && journeyDate <= new Date(end)
      })
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.field]
        const bValue = b[sortConfig.field]
        
        if (aValue === bValue) return 0
        
        const comparison = aValue < bValue ? -1 : 1
        return sortConfig.direction === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [pnrs, filters, sortConfig])

  // Calculate grid layout
  const cardsPerRow = CARDS_PER_ROW[screenSize]
  const totalRows = Math.ceil(filteredAndSortedPNRs.length / cardsPerRow)

  // Virtualized row renderer
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const startIndex = index * cardsPerRow
    const rowPNRs = filteredAndSortedPNRs.slice(startIndex, startIndex + cardsPerRow)

    return (
      <div style={style} className="px-4">
        <div className={cn(
          'grid gap-4',
          cardsPerRow === 1 && 'grid-cols-1',
          cardsPerRow === 2 && 'grid-cols-2',
          cardsPerRow === 3 && 'grid-cols-3',
          cardsPerRow === 4 && 'grid-cols-4'
        )}>
          {rowPNRs.map((pnr) => (
            <motion.div
              key={pnr.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <PNRCard
                pnr={pnr}
                isSelected={selectedPNRs.has(pnr.id)}
                onEdit={onPNREdit}
                onDelete={onPNRDelete}
                onViewDetails={onPNRDetails}
              />
            </motion.div>
          ))}
        </div>
      </div>
    )
  }, [filteredAndSortedPNRs, cardsPerRow, selectedPNRs, onPNREdit, onPNRDelete, onPNRDetails])

  const handleSort = (field: keyof PNR) => {
    const newDirection = 
      sortConfig?.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    setSortConfig({ field, direction: newDirection })
  }

  const handleBulkDelete = () => {
    const selectedIds = Array.from(selectedPNRs)
    bulkDelete(selectedIds)
    clearSelection()
  }

  const handleSelectAll = () => {
    if (selectedPNRs.size === filteredAndSortedPNRs.length) {
      clearSelection()
    } else {
      selectAllPNRs()
    }
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Error Loading PNRs</h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
            PNR Dashboard
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            {filteredAndSortedPNRs.length} PNR{filteredAndSortedPNRs.length !== 1 ? 's' : ''} tracked
            {realtime.connection.isConnected && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && 'bg-primary-50 dark:bg-primary-900/20')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            Filters
          </Button>
          
          <div className="flex items-center border border-secondary-300 dark:border-secondary-600 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <Button onClick={onAddPNR}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add PNR
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PNRFilters />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      {selectedPNRs.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <PNRBulkActions
            selectedCount={selectedPNRs.size}
            totalCount={filteredAndSortedPNRs.length}
            onSelectAll={handleSelectAll}
            onClearSelection={clearSelection}
            onBulkDelete={handleBulkDelete}
          />
        </motion.div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-secondary-600 dark:text-secondary-400">Sort by:</span>
        <div className="flex items-center gap-1">
          {[
            { field: 'dateOfJourney' as keyof PNR, label: 'Date' },
            { field: 'updatedAt' as keyof PNR, label: 'Updated' },
            { field: 'trainNumber' as keyof PNR, label: 'Train' },
            { field: 'passengerName' as keyof PNR, label: 'Name' }
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={cn(
                'px-2 py-1 rounded text-xs transition-colors',
                sortConfig?.field === field
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600'
              )}
            >
              {label}
              {sortConfig?.field === field && (
                <span className="ml-1">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : filteredAndSortedPNRs.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-secondary-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2 text-secondary-600 dark:text-secondary-400">
              No PNRs Found
            </h3>
            <p className="text-secondary-500 dark:text-secondary-500 mb-4">
              {filters.searchTerm || filters.status || filters.trainNumber || filters.dateRange
                ? 'No PNRs match your current filters.'
                : 'Start tracking your train reservations by adding your first PNR.'}
            </p>
          </div>
          <Button onClick={onAddPNR}>
            Add Your First PNR
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="h-[600px]">
          <List
            height={600}
            itemCount={totalRows}
            itemSize={CARD_HEIGHT + 16} // Card height + gap
            overscanCount={2}
          >
            {Row}
          </List>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAndSortedPNRs.map((pnr, index) => (
              <motion.div
                key={pnr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <PNRCard
                  pnr={pnr}
                  isSelected={selectedPNRs.has(pnr.id)}
                  onEdit={onPNREdit}
                  onDelete={onPNRDelete}
                  onViewDetails={onPNRDetails}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}