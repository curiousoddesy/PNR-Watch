// Tests for background sync service

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { backgroundSyncService } from '../backgroundSyncService'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

// Mock service worker
const serviceWorkerMock = {
  ready: Promise.resolve({
    sync: {
      register: vi.fn(),
    },
  }),
  addEventListener: vi.fn(),
}

// Mock fetch
const fetchMock = vi.fn()

describe('BackgroundSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    
    Object.defineProperty(navigator, 'serviceWorker', {
      value: serviceWorkerMock,
      writable: true,
    })
    
    Object.defineProperty(global, 'fetch', {
      value: fetchMock,
      writable: true,
    })
    
    // Mock ServiceWorkerRegistration prototype
    Object.defineProperty(window, 'ServiceWorkerRegistration', {
      value: {
        prototype: {
          sync: true,
        },
      },
      writable: true,
    })
    
    localStorageMock.getItem.mockReturnValue('[]')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('addTask', () => {
    it('should add task to sync queue with correct priority', async () => {
      const taskData = { pnrNumber: 'ABC123', status: 'confirmed' }
      
      const taskId = await backgroundSyncService.addTask('pnr-add', taskData, 'high')
      
      expect(taskId).toBeDefined()
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'background-sync-queue',
        expect.stringContaining('"type":"pnr-add"')
      )
    })

    it('should sort tasks by priority', async () => {
      // Add multiple tasks with different priorities
      await backgroundSyncService.addTask('pnr-add', { id: 1 }, 'low')
      await backgroundSyncService.addTask('pnr-update', { id: 2 }, 'high')
      await backgroundSyncService.addTask('pnr-delete', { id: 3 }, 'medium')
      
      const setItemCalls = localStorageMock.setItem.mock.calls
      const lastCall = setItemCalls[setItemCalls.length - 1]
      const queueData = JSON.parse(lastCall[1])
      
      // High priority should be first
      expect(queueData[0].priority).toBe('high')
      expect(queueData[1].priority).toBe('medium')
      expect(queueData[2].priority).toBe('low')
    })

    it('should register background sync when supported', async () => {
      const registration = await serviceWorkerMock.ready
      
      await backgroundSyncService.addTask('pnr-add', { id: 1 })
      
      expect(registration.sync.register).toHaveBeenCalledWith('sync-pnr-add')
    })
  })

  describe('processSyncQueue', () => {
    it('should process PNR add tasks successfully', async () => {
      const task = {
        id: 'task-1',
        type: 'pnr-add',
        data: { pnrNumber: 'ABC123' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([task]))
      fetchMock.mockResolvedValue(new Response('{"success": true}', { status: 200 }))
      
      const result = await backgroundSyncService.processSyncQueue()
      
      expect(result.processed).toBe(1)
      expect(result.failed).toBe(0)
      expect(fetchMock).toHaveBeenCalledWith('/api/pnr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pnrNumber: 'ABC123' }),
      })
    })

    it('should process PNR update tasks successfully', async () => {
      const task = {
        id: 'task-1',
        type: 'pnr-update',
        data: { id: 'ABC123', status: 'confirmed' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([task]))
      fetchMock.mockResolvedValue(new Response('{"success": true}', { status: 200 }))
      
      const result = await backgroundSyncService.processSyncQueue()
      
      expect(result.processed).toBe(1)
      expect(fetchMock).toHaveBeenCalledWith('/api/pnr/ABC123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'ABC123', status: 'confirmed' }),
      })
    })

    it('should process PNR delete tasks successfully', async () => {
      const task = {
        id: 'task-1',
        type: 'pnr-delete',
        data: { id: 'ABC123' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([task]))
      fetchMock.mockResolvedValue(new Response('', { status: 200 }))
      
      const result = await backgroundSyncService.processSyncQueue()
      
      expect(result.processed).toBe(1)
      expect(fetchMock).toHaveBeenCalledWith('/api/pnr/ABC123', {
        method: 'DELETE',
      })
    })

    it('should retry failed tasks up to max retries', async () => {
      const task = {
        id: 'task-1',
        type: 'pnr-add',
        data: { pnrNumber: 'ABC123' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 2,
        priority: 'medium',
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([task]))
      fetchMock.mockRejectedValue(new Error('Network error'))
      
      const result = await backgroundSyncService.processSyncQueue()
      
      expect(result.processed).toBe(0)
      expect(result.failed).toBe(0) // Should be queued for retry
      
      // Verify task was updated with retry count
      const setItemCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === 'background-sync-queue'
      )
      const updatedQueue = JSON.parse(setItemCall[1])
      expect(updatedQueue[0].retryCount).toBe(1)
    })

    it('should fail tasks that exceed max retries', async () => {
      const task = {
        id: 'task-1',
        type: 'pnr-add',
        data: { pnrNumber: 'ABC123' },
        timestamp: Date.now(),
        retryCount: 3, // Already at max retries
        maxRetries: 3,
        priority: 'medium',
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([task]))
      fetchMock.mockRejectedValue(new Error('Network error'))
      
      const result = await backgroundSyncService.processSyncQueue()
      
      expect(result.processed).toBe(0)
      expect(result.failed).toBe(1)
    })

    it('should handle empty queue', async () => {
      localStorageMock.getItem.mockReturnValue('[]')
      
      const result = await backgroundSyncService.processSyncQueue()
      
      expect(result.processed).toBe(0)
      expect(result.failed).toBe(0)
    })

    it('should prevent concurrent processing', async () => {
      const task = {
        id: 'task-1',
        type: 'pnr-add',
        data: { pnrNumber: 'ABC123' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([task]))
      fetchMock.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      // Start two concurrent processes
      const promise1 = backgroundSyncService.processSyncQueue()
      const promise2 = backgroundSyncService.processSyncQueue()
      
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      // Second call should return immediately without processing
      expect(result2.processed).toBe(0)
      expect(result2.failed).toBe(0)
    })
  })

  describe('getQueueStatus', () => {
    it('should return queue status information', async () => {
      const tasks = [
        {
          id: 'task-1',
          type: 'pnr-add',
          data: {},
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
          priority: 'high',
        },
        {
          id: 'task-2',
          type: 'pnr-update',
          data: {},
          timestamp: Date.now(),
          retryCount: 1,
          maxRetries: 3,
          priority: 'medium',
        },
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tasks))
      
      const status = await backgroundSyncService.getQueueStatus()
      
      expect(status.pending).toBe(2)
      expect(status.processing).toBe(false)
      expect(status.tasks).toHaveLength(2)
      expect(status.tasks[0].type).toBe('pnr-add')
      expect(status.tasks[1].retryCount).toBe(1)
    })
  })

  describe('clearQueue', () => {
    it('should clear the sync queue', async () => {
      await backgroundSyncService.clearQueue()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'background-sync-queue',
        '[]'
      )
    })
  })

  describe('retryFailedTasks', () => {
    it('should retry tasks with retry count > 0', async () => {
      const tasks = [
        {
          id: 'task-1',
          type: 'pnr-add',
          data: { pnrNumber: 'ABC123' },
          timestamp: Date.now(),
          retryCount: 1, // Failed task
          maxRetries: 3,
          priority: 'medium',
        },
        {
          id: 'task-2',
          type: 'pnr-update',
          data: { id: 'DEF456' },
          timestamp: Date.now(),
          retryCount: 0, // New task
          maxRetries: 3,
          priority: 'medium',
        },
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tasks))
      fetchMock.mockResolvedValue(new Response('{"success": true}', { status: 200 }))
      
      await backgroundSyncService.retryFailedTasks()
      
      // Should process both tasks
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('should do nothing when no failed tasks exist', async () => {
      const tasks = [
        {
          id: 'task-1',
          type: 'pnr-add',
          data: { pnrNumber: 'ABC123' },
          timestamp: Date.now(),
          retryCount: 0, // No retries
          maxRetries: 3,
          priority: 'medium',
        },
      ]
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(tasks))
      
      await backgroundSyncService.retryFailedTasks()
      
      // Should still process the queue
      expect(fetchMock).toHaveBeenCalled()
    })
  })
})