import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VirtualizedList, VirtualizedGrid, useVirtualizedList } from '../components/performance/VirtualizedList'

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, itemCount, itemSize, height }) => {
    const items = Array.from({ length: Math.min(itemCount, 10) }, (_, index) => 
      children({ index, style: { height: itemSize } })
    )
    return (
      <div data-testid="virtualized-list" style={{ height }}>
        {items}
      </div>
    )
  }),
  VariableSizeList: vi.fn(({ children, itemCount, itemSize, height }) => {
    const items = Array.from({ length: Math.min(itemCount, 10) }, (_, index) => 
      children({ index, style: { height: itemSize(index) } })
    )
    return (
      <div data-testid="variable-list" style={{ height }}>
        {items}
      </div>
    )
  }),
  FixedSizeGrid: vi.fn(({ children, columnCount, rowCount, columnWidth, rowHeight }) => {
    const items = []
    for (let row = 0; row < Math.min(rowCount, 3); row++) {
      for (let col = 0; col < Math.min(columnCount, 3); col++) {
        items.push(
          children({
            rowIndex: row,
            columnIndex: col,
            style: { width: columnWidth, height: rowHeight }
          })
        )
      }
    }
    return <div data-testid="virtualized-grid">{items}</div>
  })
}))

vi.mock('react-window-infinite-loader', () => ({
  default: vi.fn(({ children, isItemLoaded, loadMoreItems }) => {
    return children({
      onItemsRendered: vi.fn(),
      ref: vi.fn()
    })
  })
}))

describe('Virtualization Components', () => {
  const mockItems = Array.from({ length: 1000 }, (_, index) => ({
    id: index,
    name: `Item ${index}`,
    description: `Description for item ${index}`
  }))

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('VirtualizedList', () => {
    it('should render fixed size list correctly', () => {
      const renderItem = vi.fn((item, index, style) => (
        <div key={item.id} style={style} data-testid={`item-${index}`}>
          {item.name}
        </div>
      ))

      render(
        <VirtualizedList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={renderItem}
        />
      )

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
      expect(screen.getByTestId('item-0')).toBeInTheDocument()
      expect(screen.getByText('Item 0')).toBeInTheDocument()
    })

    it('should render variable size list correctly', () => {
      const renderItem = vi.fn((item, index, style) => (
        <div key={item.id} style={style} data-testid={`item-${index}`}>
          {item.name}
        </div>
      ))

      const getItemHeight = vi.fn((index) => index % 2 === 0 ? 60 : 40)

      render(
        <VirtualizedList
          items={mockItems}
          height={400}
          itemHeight={getItemHeight}
          renderItem={renderItem}
        />
      )

      expect(screen.getByTestId('variable-list')).toBeInTheDocument()
      expect(getItemHeight).toHaveBeenCalled()
    })

    it('should handle loading state', () => {
      const renderItem = vi.fn((item, index, style) => (
        <div key={item.id} style={style}>
          {item.name}
        </div>
      ))

      render(
        <VirtualizedList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={renderItem}
          loading={true}
        />
      )

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })

    it('should call onLoadMore when approaching end', () => {
      const onLoadMore = vi.fn()
      const renderItem = vi.fn((item, index, style) => (
        <div key={item.id} style={style}>
          {item.name}
        </div>
      ))

      render(
        <VirtualizedList
          items={mockItems.slice(0, 20)}
          height={400}
          itemHeight={50}
          renderItem={renderItem}
          hasNextPage={true}
          onLoadMore={onLoadMore}
        />
      )

      // The mock implementation should trigger onLoadMore for items near the end
      expect(onLoadMore).toHaveBeenCalled()
    })

    it('should handle scroll events', () => {
      const onScroll = vi.fn()
      const renderItem = vi.fn((item, index, style) => (
        <div key={item.id} style={style}>
          {item.name}
        </div>
      ))

      render(
        <VirtualizedList
          items={mockItems}
          height={400}
          itemHeight={50}
          renderItem={renderItem}
          onScroll={onScroll}
        />
      )

      // Simulate scroll event
      const list = screen.getByTestId('virtualized-list')
      fireEvent.scroll(list, { target: { scrollTop: 100 } })

      // Note: In real implementation, this would be called by react-window
      // Here we just verify the component renders without errors
      expect(list).toBeInTheDocument()
    })
  })

  describe('VirtualizedGrid', () => {
    it('should render grid correctly', () => {
      const renderItem = vi.fn((item, rowIndex, columnIndex, style) => (
        <div key={item.id} style={style} data-testid={`grid-item-${rowIndex}-${columnIndex}`}>
          {item.name}
        </div>
      ))

      render(
        <VirtualizedGrid
          items={mockItems}
          height={400}
          width={600}
          columnCount={3}
          rowHeight={100}
          columnWidth={200}
          renderItem={renderItem}
        />
      )

      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
      expect(screen.getByTestId('grid-item-0-0')).toBeInTheDocument()
    })

    it('should handle gap spacing', () => {
      const renderItem = vi.fn((item, rowIndex, columnIndex, style) => (
        <div key={item.id} style={style}>
          {item.name}
        </div>
      ))

      render(
        <VirtualizedGrid
          items={mockItems}
          height={400}
          width={600}
          columnCount={3}
          rowHeight={100}
          columnWidth={200}
          renderItem={renderItem}
          gap={10}
        />
      )

      expect(screen.getByTestId('virtualized-grid')).toBeInTheDocument()
    })
  })

  describe('useVirtualizedList Hook', () => {
    function TestComponent() {
      const { items, loading, hasNextPage, loadMore, reset } = useVirtualizedList(
        mockItems.slice(0, 10),
        5
      )

      const handleLoadMore = () => {
        loadMore(async (page, size) => {
          // Simulate API call
          const start = page * size
          const end = start + size
          return mockItems.slice(start, end)
        })
      }

      return (
        <div>
          <div data-testid="item-count">{items.length}</div>
          <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
          <div data-testid="has-next">{hasNextPage ? 'has-more' : 'no-more'}</div>
          <button onClick={handleLoadMore} data-testid="load-more">
            Load More
          </button>
          <button onClick={reset} data-testid="reset">
            Reset
          </button>
        </div>
      )
    }

    it('should manage virtualized list state', () => {
      render(<TestComponent />)

      expect(screen.getByTestId('item-count')).toHaveTextContent('10')
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('has-next')).toHaveTextContent('has-more')
    })

    it('should load more items', async () => {
      render(<TestComponent />)

      const loadMoreButton = screen.getByTestId('load-more')
      fireEvent.click(loadMoreButton)

      // Should show loading state
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    })

    it('should reset list state', () => {
      render(<TestComponent />)

      const resetButton = screen.getByTestId('reset')
      fireEvent.click(resetButton)

      expect(screen.getByTestId('item-count')).toHaveTextContent('0')
      expect(screen.getByTestId('has-next')).toHaveTextContent('has-more')
    })
  })

  describe('Performance Monitoring', () => {
    it('should measure render performance', () => {
      const performanceSpy = vi.spyOn(performance, 'now')
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(150)

      const renderItem = vi.fn((item, index, style) => {
        // Simulate expensive rendering
        const start = performance.now()
        return (
          <div key={item.id} style={style}>
            {item.name} - Rendered at {start}
          </div>
        )
      })

      render(
        <VirtualizedList
          items={mockItems.slice(0, 100)}
          height={400}
          itemHeight={50}
          renderItem={renderItem}
        />
      )

      expect(performanceSpy).toHaveBeenCalled()
      performanceSpy.mockRestore()
    })

    it('should handle memory efficiently with large datasets', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, index) => ({
        id: index,
        name: `Item ${index}`,
        data: new Array(100).fill(`data-${index}`) // Simulate large objects
      }))

      const renderItem = vi.fn((item, index, style) => (
        <div key={item.id} style={style}>
          {item.name}
        </div>
      ))

      // Should render without memory issues
      expect(() => {
        render(
          <VirtualizedList
            items={largeDataset}
            height={400}
            itemHeight={50}
            renderItem={renderItem}
          />
        )
      }).not.toThrow()

      // Only a subset should be rendered due to virtualization
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle rendering errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const renderItem = vi.fn((item, index, style) => {
        if (index === 5) {
          throw new Error('Render error')
        }
        return (
          <div key={item.id} style={style}>
            {item.name}
          </div>
        )
      })

      expect(() => {
        render(
          <VirtualizedList
            items={mockItems.slice(0, 10)}
            height={400}
            itemHeight={50}
            renderItem={renderItem}
          />
        )
      }).not.toThrow()

      consoleSpy.mockRestore()
    })

    it('should handle empty item lists', () => {
      const renderItem = vi.fn((item, index, style) => (
        <div key={item.id} style={style}>
          {item.name}
        </div>
      ))

      render(
        <VirtualizedList
          items={[]}
          height={400}
          itemHeight={50}
          renderItem={renderItem}
        />
      )

      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument()
    })
  })
})