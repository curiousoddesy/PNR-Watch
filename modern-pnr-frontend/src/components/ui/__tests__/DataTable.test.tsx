import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DataTable, type Column } from '../DataTable'

interface TestData {
  id: string
  name: string
  status: 'active' | 'inactive'
  count: number
}

const testData: TestData[] = [
  { id: '1', name: 'Item 1', status: 'active', count: 10 },
  { id: '2', name: 'Item 2', status: 'inactive', count: 5 },
  { id: '3', name: 'Item 3', status: 'active', count: 15 },
]

const testColumns: Column<TestData>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
  { key: 'count', header: 'Count', sortable: true },
]

describe('DataTable', () => {
  it('renders table with data', () => {
    render(<DataTable data={testData} columns={testColumns} />)
    
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Count')).toBeInTheDocument()
    
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    render(<DataTable data={[]} columns={testColumns} emptyMessage="No items found" />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('handles search functionality', () => {
    render(<DataTable data={testData} columns={testColumns} searchable />)
    
    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'Item 1' } })
    
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Item 3')).not.toBeInTheDocument()
  })

  it('handles sorting functionality', () => {
    render(<DataTable data={testData} columns={testColumns} sortable />)
    
    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)
    
    // Should show sort icon
    expect(nameHeader.closest('th')).toContainHTML('svg')
  })

  it('handles row click events', () => {
    const onRowClick = vi.fn()
    render(<DataTable data={testData} columns={testColumns} onRowClick={onRowClick} />)
    
    const firstRow = screen.getByText('Item 1').closest('tr')
    if (firstRow) {
      fireEvent.click(firstRow)
      expect(onRowClick).toHaveBeenCalledWith(testData[0], 0)
    }
  })

  it('handles pagination', () => {
    const largeData = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      name: `Item ${i + 1}`,
      status: 'active' as const,
      count: i + 1,
    }))
    
    render(<DataTable data={largeData} columns={testColumns} pageSize={10} />)
    
    // Should show pagination controls
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Previous')).toBeInTheDocument()
    
    // Should show page info
    expect(screen.getByText(/Showing 1 to 10 of 25 results/)).toBeInTheDocument()
  })

  it('renders custom cell content', () => {
    const customColumns: Column<TestData>[] = [
      {
        key: 'name',
        header: 'Name',
        render: (value) => <strong>{String(value)}</strong>,
      },
    ]
    
    render(<DataTable data={testData} columns={customColumns} />)
    
    const strongElement = screen.getByText('Item 1')
    expect(strongElement.tagName).toBe('STRONG')
  })

  it('disables search when searchable is false', () => {
    render(<DataTable data={testData} columns={testColumns} searchable={false} />)
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })

  it('applies custom row className', () => {
    const rowClassName = vi.fn(() => 'custom-row-class')
    render(<DataTable data={testData} columns={testColumns} rowClassName={rowClassName} />)
    
    const firstRow = screen.getByText('Item 1').closest('tr')
    expect(firstRow).toHaveClass('custom-row-class')
    expect(rowClassName).toHaveBeenCalledWith(testData[0], 0)
  })
})