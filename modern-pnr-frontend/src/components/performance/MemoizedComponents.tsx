import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { cn } from '../../utils/cn'

// Memoized list item component
export const MemoizedListItem = memo(function ListItem({
  id,
  title,
  description,
  status,
  onClick,
  className = ''
}: {
  id: string
  title: string
  description: string
  status: 'active' | 'inactive' | 'pending'
  onClick: (id: string) => void
  className?: string
}) {
  const handleClick = useCallback(() => {
    onClick(id)
  }, [id, onClick])

  const statusColor = useMemo(() => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'inactive': return 'text-gray-600 bg-gray-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }, [status])

  return (
    <div
      className={cn(
        'p-4 border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-text">{title}</h3>
        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusColor)}>
          {status}
        </span>
      </div>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
    </div>
  )
})

// Memoized data table row
export const MemoizedTableRow = memo(function TableRow({
  data,
  columns,
  onRowClick,
  isSelected = false
}: {
  data: Record<string, any>
  columns: Array<{ key: string; label: string; render?: (value: any, row: any) => React.ReactNode }>
  onRowClick?: (data: Record<string, any>) => void
  isSelected?: boolean
}) {
  const handleClick = useCallback(() => {
    onRowClick?.(data)
  }, [data, onRowClick])

  const renderedCells = useMemo(() => {
    return columns.map(column => ({
      key: column.key,
      content: column.render ? column.render(data[column.key], data) : data[column.key]
    }))
  }, [data, columns])

  return (
    <tr
      className={cn(
        'hover:bg-surface-hover transition-colors cursor-pointer',
        isSelected && 'bg-primary/10'
      )}
      onClick={handleClick}
    >
      {renderedCells.map(cell => (
        <td key={cell.key} className="px-4 py-3 text-sm text-text">
          {cell.content}
        </td>
      ))}
    </tr>
  )
})

// Memoized chart component
export const MemoizedChart = memo(function Chart({
  data,
  type,
  width,
  height,
  options = {}
}: {
  data: any[]
  type: 'line' | 'bar' | 'pie'
  width: number
  height: number
  options?: Record<string, any>
}) {
  const processedData = useMemo(() => {
    // Expensive data processing
    return data.map(item => ({
      ...item,
      processed: true,
      timestamp: Date.now()
    }))
  }, [data])

  const chartConfig = useMemo(() => {
    return {
      type,
      width,
      height,
      ...options,
      data: processedData
    }
  }, [type, width, height, options, processedData])

  return (
    <div className="chart-container">
      {/* Chart implementation would go here */}
      <div 
        className="bg-surface border border-border rounded-lg flex items-center justify-center"
        style={{ width, height }}
      >
        <span className="text-text-secondary">
          {type.toUpperCase()} Chart ({processedData.length} items)
        </span>
      </div>
    </div>
  )
})

// Memoized search results
export const MemoizedSearchResults = memo(function SearchResults({
  query,
  results,
  onResultClick,
  maxResults = 10
}: {
  query: string
  results: any[]
  onResultClick: (result: any) => void
  maxResults?: number
}) {
  const filteredResults = useMemo(() => {
    if (!query.trim()) return []
    
    return results
      .filter(result => 
        result.title?.toLowerCase().includes(query.toLowerCase()) ||
        result.description?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, maxResults)
  }, [query, results, maxResults])

  const highlightedResults = useMemo(() => {
    return filteredResults.map(result => ({
      ...result,
      highlightedTitle: highlightText(result.title, query),
      highlightedDescription: highlightText(result.description, query)
    }))
  }, [filteredResults, query])

  if (!query.trim()) {
    return <div className="text-text-secondary text-center py-8">Start typing to search...</div>
  }

  if (highlightedResults.length === 0) {
    return <div className="text-text-secondary text-center py-8">No results found for "{query}"</div>
  }

  return (
    <div className="space-y-2">
      {highlightedResults.map((result, index) => (
        <MemoizedSearchResult
          key={result.id || index}
          result={result}
          onClick={onResultClick}
        />
      ))}
    </div>
  )
})

const MemoizedSearchResult = memo(function SearchResult({
  result,
  onClick
}: {
  result: any
  onClick: (result: any) => void
}) {
  const handleClick = useCallback(() => {
    onClick(result)
  }, [result, onClick])

  return (
    <div
      className="p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors"
      onClick={handleClick}
    >
      <h4 
        className="font-medium text-text"
        dangerouslySetInnerHTML={{ __html: result.highlightedTitle }}
      />
      <p 
        className="text-sm text-text-secondary mt-1"
        dangerouslySetInnerHTML={{ __html: result.highlightedDescription }}
      />
    </div>
  )
})

// Utility function for text highlighting
function highlightText(text: string, query: string): string {
  if (!text || !query) return text
  
  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
}

// Hook for memoized calculations
export function useMemoizedCalculation<T, R>(
  data: T,
  calculator: (data: T) => R,
  dependencies: any[] = []
): R {
  return useMemo(() => {
    const start = performance.now()
    const result = calculator(data)
    const end = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Calculation took ${end - start}ms`)
    }
    
    return result
  }, [data, ...dependencies])
}

// Hook for memoized async operations
export function useMemoizedAsync<T>(
  asyncFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController>()

  const memoizedFn = useCallback(asyncFn, dependencies)

  useEffect(() => {
    let isCancelled = false
    abortControllerRef.current = new AbortController()

    setLoading(true)
    setError(null)

    memoizedFn()
      .then(result => {
        if (!isCancelled) {
          setData(result)
        }
      })
      .catch(err => {
        if (!isCancelled) {
          setError(err)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false)
        }
      })

    return () => {
      isCancelled = true
      abortControllerRef.current?.abort()
    }
  }, [memoizedFn])

  return { data, loading, error }
}

// Performance monitoring for memoized components
export function useMemoizationStats() {
  const renderCount = useRef(0)
  const memoHits = useRef(0)
  const memoMisses = useRef(0)

  useEffect(() => {
    renderCount.current++
  })

  const recordMemoHit = useCallback(() => {
    memoHits.current++
  }, [])

  const recordMemoMiss = useCallback(() => {
    memoMisses.current++
  }, [])

  const getStats = useCallback(() => {
    const total = memoHits.current + memoMisses.current
    return {
      renders: renderCount.current,
      memoHits: memoHits.current,
      memoMisses: memoMisses.current,
      hitRate: total > 0 ? (memoHits.current / total) * 100 : 0
    }
  }, [])

  return { recordMemoHit, recordMemoMiss, getStats }
}

// Higher-order component for automatic memoization
export function withMemoization<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = memo(Component, areEqual)
  
  return function MemoWrapper(props: P) {
    const { recordMemoHit, recordMemoMiss } = useMemoizationStats()
    
    useEffect(() => {
      // This will run on every render, indicating a memo miss
      recordMemoMiss()
    })

    return <MemoizedComponent {...props} />
  }
}