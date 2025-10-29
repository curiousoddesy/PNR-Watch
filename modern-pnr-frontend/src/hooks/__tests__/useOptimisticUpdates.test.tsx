import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOptimisticUpdates } from '../useOptimisticUpdates'

// Mock the WebSocket hook
const mockWebSocket = {
  emit: vi.fn(),
  isConnected: true,
}

vi.mock('../useWebSocket', () => ({
  useWebSocket: vi.fn(() => mockWebSocket),
}))

// Mock the Toast hook
const mockToast = {
  addToast: vi.fn(),
}

vi.mock('../../components/ui/Toast', () => ({
  useToast: vi.fn(() => mockToast),
}))

interface TestItem {
  id: string
  name: string
  value: number
}

describe('useOptimisticUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic Functionality', () => {
    it('should return optimistic updates interface', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>())

      expect(result.current).toEqual({
        applyOptimisticUpdate: expect.any(Function),
        confirmUpdate: expect.any(Function),
        rollbackUpdate: expect.any(Function),
        getOptimisticData: expect.any(Function),
        hasPendingUpdates: expect.any(Function),
        getPendingUpdateCount: expect.any(Function),
        clearAllUpdates: expect.any(Function),
        pendingUpdatesCount: 0,
      })
    })

    it('should apply optimistic updates', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>())

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      let updateId: string

      act(() => {
        updateId = result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update',
          { field: 'name' }
        )
      })

      expect(updateId).toBeDefined()
      expect(result.current.pendingUpdatesCount).toBe(1)
      expect(result.current.hasPendingUpdates('1')).toBe(true)
      expect(result.current.getPendingUpdateCount('1')).toBe(1)

      expect(mockWebSocket.emit).toHaveBeenCalledWith('test_update', {
        updateId,
        field: 'name',
        data: optimisticData,
      })
    })

    it('should not emit when disconnected', () => {
      mockWebSocket.isConnected = false
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>())

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      act(() => {
        result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      expect(mockWebSocket.emit).not.toHaveBeenCalled()
      expect(result.current.pendingUpdatesCount).toBe(1)
    })
  })

  describe('Data Transformation', () => {
    it('should apply optimistic updates to data array', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>())

      const originalData: TestItem[] = [
        { id: '1', name: 'Item 1', value: 10 },
        { id: '2', name: 'Item 2', value: 20 },
      ]

      const optimisticUpdate: TestItem = { id: '1', name: 'Updated Item 1', value: 15 }

      act(() => {
        result.current.applyOptimisticUpdate(
          originalData[0],
          optimisticUpdate,
          'test_update'
        )
      })

      const optimisticData = result.current.getOptimisticData(originalData)

      expect(optimisticData).toEqual([
        { id: '1', name: 'Updated Item 1', value: 15 },
        { id: '2', name: 'Item 2', value: 20 },
      ])
    })

    it('should handle multiple optimistic updates for same item', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>())

      const originalData: TestItem[] = [
        { id: '1', name: 'Item 1', value: 10 },
      ]

      act(() => {
        // First update
        result.current.applyOptimisticUpdate(
          originalData[0],
          { id: '1', name: 'Update 1', value: 15 },
          'test_update_1'
        )

        // Second update (more recent)
        result.current.applyOptimisticUpdate(
          originalData[0],
          { id: '1', name: 'Update 2', value: 25 },
          'test_update_2'
        )
      })

      const optimisticData = result.current.getOptimisticData(originalData)

      // Should apply the most recent update
      expect(optimisticData[0].name).toBe('Update 2')
      expect(optimisticData[0].value).toBe(25)
      expect(result.current.getPendingUpdateCount('1')).toBe(2)
    })
  })

  describe('Update Confirmation', () => {
    it('should confirm updates and remove from pending', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>())

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      let updateId: string

      act(() => {
        updateId = result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      expect(result.current.pendingUpdatesCount).toBe(1)

      act(() => {
        result.current.confirmUpdate(updateId)
      })

      expect(result.current.pendingUpdatesCount).toBe(0)
      expect(result.current.hasPendingUpdates('1')).toBe(false)
    })

    it('should clear timeout on confirmation', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>({ timeout: 1000 }))

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      let updateId: string

      act(() => {
        updateId = result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      act(() => {
        result.current.confirmUpdate(updateId)
      })

      // Fast-forward past timeout
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Should not rollback since it was confirmed
      expect(result.current.pendingUpdatesCount).toBe(0)
      expect(mockToast.addToast).not.toHaveBeenCalled()
    })
  })

  describe('Update Rollback', () => {
    it('should rollback updates manually', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>())

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      let updateId: string

      act(() => {
        updateId = result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      expect(result.current.pendingUpdatesCount).toBe(1)

      act(() => {
        result.current.rollbackUpdate(updateId, 'Manual rollback')
      })

      expect(result.current.pendingUpdatesCount).toBe(0)
      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Update Failed',
        description: 'Manual rollback',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: expect.any(Function),
        },
      })
    })

    it('should rollback on timeout', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>({ timeout: 1000 }))

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      act(() => {
        result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      expect(result.current.pendingUpdatesCount).toBe(1)

      // Fast-forward past timeout
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(result.current.pendingUpdatesCount).toBe(0)
      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Update Failed',
        description: 'Timeout: Server did not respond',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: expect.any(Function),
        },
      })
    })

    it('should retry failed updates with exponential backoff', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>({
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 500,
      }))

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      let updateId: string

      act(() => {
        updateId = result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      // First timeout (should trigger retry)
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Update Failed',
        description: 'Retrying... (1/2)',
        duration: 3000,
      })

      // Advance to retry
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockWebSocket.emit).toHaveBeenCalledWith('retry_update', {
        updateId,
        retryCount: 1,
        data: optimisticData,
      })

      // Second timeout (should trigger another retry)
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Update Failed',
        description: 'Retrying... (2/2)',
        duration: 3000,
      })

      // Advance to second retry
      act(() => {
        vi.advanceTimersByTime(2000) // Exponential backoff: 2 seconds
      })

      // Third timeout (should give up and rollback)
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(result.current.pendingUpdatesCount).toBe(0)
      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Update Failed',
        description: 'Retry 2 failed',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: expect.any(Function),
        },
      })
    })

    it('should not retry when disconnected', () => {
      mockWebSocket.isConnected = false
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>({
        maxRetries: 2,
        timeout: 500,
      }))

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      act(() => {
        result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      // Timeout should cause immediate rollback without retry
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(result.current.pendingUpdatesCount).toBe(0)
      expect(mockToast.addToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Update Failed',
        description: 'Timeout: Server did not respond',
        duration: 5000,
        action: {
          label: 'Retry',
          onClick: expect.any(Function),
        },
      })
    })
  })

  describe('Cleanup', () => {
    it('should clear all updates', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>())

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      act(() => {
        result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      expect(result.current.pendingUpdatesCount).toBe(1)

      act(() => {
        result.current.clearAllUpdates()
      })

      expect(result.current.pendingUpdatesCount).toBe(0)
    })

    it('should clear timeouts on unmount', () => {
      const { result, unmount } = renderHook(() => useOptimisticUpdates<TestItem>({ timeout: 1000 }))

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      act(() => {
        result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      unmount()

      // Fast-forward past timeout
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Should not trigger rollback after unmount
      expect(mockToast.addToast).not.toHaveBeenCalled()
    })
  })

  describe('Manual Retry', () => {
    it('should allow manual retry from toast action', () => {
      const { result } = renderHook(() => useOptimisticUpdates<TestItem>({ timeout: 500 }))

      const originalData: TestItem = { id: '1', name: 'Original', value: 10 }
      const optimisticData: TestItem = { id: '1', name: 'Updated', value: 20 }

      act(() => {
        result.current.applyOptimisticUpdate(
          originalData,
          optimisticData,
          'test_update'
        )
      })

      // Trigger timeout rollback
      act(() => {
        vi.advanceTimersByTime(600)
      })

      expect(result.current.pendingUpdatesCount).toBe(0)

      // Get the retry action from the toast
      const toastCall = mockToast.addToast.mock.calls.find(
        call => call[0].type === 'error'
      )
      const retryAction = toastCall?.[0].action?.onClick

      expect(retryAction).toBeDefined()

      // Execute manual retry
      act(() => {
        retryAction?.()
      })

      expect(result.current.pendingUpdatesCount).toBe(1)
      expect(mockWebSocket.emit).toHaveBeenCalledWith('manual_retry', {
        originalUpdateId: expect.any(String),
        data: optimisticData,
      })
    })
  })
})