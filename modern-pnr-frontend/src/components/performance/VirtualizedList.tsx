import { FixedSizeList as List, VariableSizeList, FixedSizeGrid, ListChildComponentProps } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export interface VirtualizedListProps<T> {
  items: T[]
  height: number
  itemHeight: number | ((index: number) => number)
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number) => void
  loading?: boolean
  hasNextPage?: boolean
  onLoadMore?: () => void
}

// Fixed height virtualized list
export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  loading = false,
  hasNextPage = false,
  onLoadMore
}: VirtualizedListProps<T>) {
  const listRef = useRef<List>(null)

  const ItemRenderer = useCallback(({ index, style }: ListChildComponentProps) => {
    const item = items[index]
    
    // Load more when approaching end
    if (hasNextPage && onLoadMore && index >= items.length - 10) {
      onLoadMore()
    }

    if (!item) {
      return (
        <div style={style} className="flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )
    }

    return (
      <div style={style}>
        {renderItem(item, index, style)}
      </div>
    )
  }, [items, renderItem, hasNextPage, onLoadMore])

  const handleScroll = useCallback(({ scrollTop }: { scrollTop: number }) => {
    onScroll?.(scrollTop)
  }, [onScroll])

  if (typeof itemHeight === 'number') {
    return (
      <div className={className}>
        <List
          ref={listRef}
          height={height}
          itemCount={items.length + (loading ? 1 : 0)}
          itemSize={itemHeight}
          overscanCount={overscan}
          onScroll={handleScroll}
        >
          {ItemRenderer}
        </List>
      </div>
    )
  }

  // Variable height list
  return (
    <div className={className}>
      <VariableSizeList
        height={height}
        itemCount={items.length + (loading ? 1 : 0)}
        itemSize={itemHeight as (index: number) => number}
        overscanCount={overscan}
        onScroll={handleScroll}
      >
        {ItemRenderer}
      </VariableSizeList>
    </div>
  )
}

// Virtualized grid component
export interface VirtualizedGridProps<T> {
  items: T[]
  height: number
  width: number
  columnCount: number
  rowHeight: number
  columnWidth: number
  renderItem: (item: T, rowIndex: number, columnIndex: number, style: React.CSSProperties) => React.ReactNode
  gap?: number
  className?: string
}

export function VirtualizedGrid<T>({
  items,
  height,
  width,
  columnCount,
  rowHeight,
  columnWidth,
  renderItem,
  gap = 0,
  className = ''
}: VirtualizedGridProps<T>) {
  const rowCount = Math.ceil(items.length / columnCount)

  const GridItem = useCallback(({ rowIndex, columnIndex, style }: any) => {
    const itemIndex = rowIndex * columnCount + columnIndex
    const item = items[itemIndex]

    if (!item) return null

    const adjustedStyle = {
      ...style,
      left: style.left + (columnIndex * gap),
      top: style.top + (rowIndex * gap),
      width: style.width - gap,
      height: style.height - gap,
    }

    return renderItem(item, rowIndex, columnIndex, adjustedStyle)
  }, [items, columnCount, renderItem, gap])

  return (
    <div className={className}>
      <FixedSizeGrid
        height={height}
        width={width}
        columnCount={columnCount}
        columnWidth={columnWidth + gap}
        rowCount={rowCount}
        rowHeight={rowHeight + gap}
      >
        {GridItem}
      </FixedSizeGrid>
    </div>
  )
}

// Infinite loading virtualized list
export function InfiniteVirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  className = ''
}: {
  items: T[]
  height: number
  itemHeight: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  hasNextPage: boolean
  isNextPageLoading: boolean
  loadNextPage: () => Promise<void>
  className?: string
}) {
  const itemCount = hasNextPage ? items.length + 1 : items.length

  const isItemLoaded = useCallback((index: number) => {
    return !!items[index]
  }, [items])

  const ItemRenderer = useCallback(({ index, style }: ListChildComponentProps) => {
    let content

    if (!isItemLoaded(index)) {
      content = (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-text-secondary">Loading...</span>
        </div>
      )
    } else {
      const item = items[index]
      content = renderItem(item, index, style)
    }

    return <div style={style}>{content}</div>
  }, [items, renderItem, isItemLoaded])

  return (
    <div className={className}>
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadNextPage}
      >
        {({ onItemsRendered, ref }) => (
          <List
            ref={ref}
            height={height}
            itemCount={itemCount}
            itemSize={itemHeight}
            onItemsRendered={onItemsRendered}
          >
            {ItemRenderer}
          </List>
        )}
      </InfiniteLoader>
    </div>
  )
}

// Hook for virtualized list state management
export function useVirtualizedList<T>(
  initialItems: T[] = [],
  pageSize = 50
) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMore = useCallback(async (loadFn: (page: number, size: number) => Promise<T[]>) => {
    if (loading || !hasNextPage) return

    setLoading(true)
    setError(null)

    try {
      const currentPage = Math.floor(items.length / pageSize)
      const newItems = await loadFn(currentPage, pageSize)
      
      if (newItems.length === 0) {
        setHasNextPage(false)
      } else {
        setItems(prev => [...prev, ...newItems])
        setHasNextPage(newItems.length === pageSize)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items')
    } finally {
      setLoading(false)
    }
  }, [items.length, pageSize, loading, hasNextPage])

  const reset = useCallback(() => {
    setItems([])
    setLoading(false)
    setHasNextPage(true)
    setError(null)
  }, [])

  return {
    items,
    loading,
    hasNextPage,
    error,
    loadMore,
    reset,
    setItems
  }
}

// Performance monitoring for virtualized lists
export function useVirtualizedPerformance() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    scrollPerformance: 0,
    memoryUsage: 0
  })

  const measureRenderTime = useCallback((callback: () => void) => {
    const start = performance.now()
    callback()
    const end = performance.now()
    
    setMetrics(prev => ({
      ...prev,
      renderTime: end - start
    }))
  }, [])

  const measureScrollPerformance = useCallback(() => {
    let frameCount = 0
    let lastTime = performance.now()
    
    const measureFrame = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime - lastTime >= 1000) {
        setMetrics(prev => ({
          ...prev,
          scrollPerformance: frameCount
        }))
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(measureFrame)
    }
    
    requestAnimationFrame(measureFrame)
  }, [])

  useEffect(() => {
    // Monitor memory usage if available
    if ('memory' in performance) {
      const updateMemoryUsage = () => {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        }))
      }
      
      const interval = setInterval(updateMemoryUsage, 5000)
      return () => clearInterval(interval)
    }
  }, [])

  return {
    metrics,
    measureRenderTime,
    measureScrollPerformance
  }
}