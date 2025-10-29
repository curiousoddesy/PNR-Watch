import { Suspense, startTransition, useDeferredValue, useTransition, useMemo, useState, useEffect } from 'react'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBoundary } from '../ui/ErrorBoundary'

// Suspense boundary wrapper with error handling
export function SuspenseBoundary({ 
  children, 
  fallback, 
  name = 'Component' 
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  name?: string
}) {
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="mt-2 text-sm text-text-secondary">Loading {name}...</p>
      </div>
    </div>
  )

  return (
    <ErrorBoundary>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// Concurrent features wrapper for non-urgent updates
export function ConcurrentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SuspenseBoundary name="Concurrent Content">
      {children}
    </SuspenseBoundary>
  )
}

// Hook for handling transitions with loading states
export function useOptimisticTransition() {
  const [isPending, startTransition] = useTransition()

  const executeTransition = (callback: () => void) => {
    startTransition(() => {
      callback()
    })
  }

  return { isPending, executeTransition }
}

// Deferred search component for better performance
export function DeferredSearch({ 
  query, 
  onSearch, 
  children 
}: {
  query: string
  onSearch: (query: string) => void
  children: (deferredQuery: string, isPending: boolean) => React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()
  const deferredQuery = useDeferredValue(query)

  const handleSearch = (newQuery: string) => {
    startTransition(() => {
      onSearch(newQuery)
    })
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <SuspenseBoundary name="Search Results">
        {children(deferredQuery, isPending)}
      </SuspenseBoundary>
    </div>
  )
}

// Concurrent list component with deferred updates
export function ConcurrentList<T>({ 
  items, 
  renderItem, 
  filterFn,
  sortFn,
  searchQuery = ''
}: {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  filterFn?: (item: T, query: string) => boolean
  sortFn?: (a: T, b: T) => number
  searchQuery?: string
}) {
  const deferredQuery = useDeferredValue(searchQuery)
  const [isPending] = useTransition()

  const processedItems = useMemo(() => {
    let result = items

    // Apply filtering
    if (filterFn && deferredQuery) {
      result = result.filter(item => filterFn(item, deferredQuery))
    }

    // Apply sorting
    if (sortFn) {
      result = [...result].sort(sortFn)
    }

    return result
  }, [items, filterFn, sortFn, deferredQuery])

  return (
    <div className={`transition-opacity ${isPending ? 'opacity-60' : 'opacity-100'}`}>
      {processedItems.map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}

// Progressive enhancement wrapper
export function ProgressiveEnhancement({ 
  fallback, 
  enhanced, 
  condition = true 
}: {
  fallback: React.ReactNode
  enhanced: React.ReactNode
  condition?: boolean
}) {
  if (!condition) {
    return <>{fallback}</>
  }

  return (
    <SuspenseBoundary fallback={fallback} name="Enhanced Feature">
      {enhanced}
    </SuspenseBoundary>
  )
}

// Time slicing for heavy computations
export function useTimeSlicing<T>(
  data: T[],
  processItem: (item: T) => any,
  batchSize = 50
) {
  const [isPending, startTransition] = useTransition()
  const [processedData, setProcessedData] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex >= data.length) return

    startTransition(() => {
      const batch = data.slice(currentIndex, currentIndex + batchSize)
      const processed = batch.map(processItem)
      
      setProcessedData(prev => [...prev, ...processed])
      setCurrentIndex(prev => prev + batchSize)
    })
  }, [data, currentIndex, processItem, batchSize])

  const progress = Math.min((currentIndex / data.length) * 100, 100)
  const isComplete = currentIndex >= data.length

  return {
    processedData,
    isPending,
    progress,
    isComplete,
    reset: () => {
      setProcessedData([])
      setCurrentIndex(0)
    }
  }
}