// Tests for cache service

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cacheService } from '../cacheService'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock caches API
const cachesMock = {
  open: vi.fn(),
  keys: vi.fn(),
  delete: vi.fn(),
}

const cacheMock = {
  match: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
}

// Mock fetch
const fetchMock = vi.fn()

describe('CacheService', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup global mocks
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    
    Object.defineProperty(global, 'caches', {
      value: cachesMock,
      writable: true,
    })
    
    Object.defineProperty(global, 'fetch', {
      value: fetchMock,
      writable: true,
    })
    
    // Setup default mock implementations
    cachesMock.open.mockResolvedValue(cacheMock)
    cachesMock.keys.mockResolvedValue(['api-cache-v1', 'images-cache-v1'])
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCachedData', () => {
    it('should return cached data when available and not expired', async () => {
      const testData = { id: 1, name: 'Test' }
      const mockResponse = new Response(JSON.stringify(testData), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Timestamp': Date.now().toString(),
        },
      })
      
      cacheMock.match.mockResolvedValue(mockResponse)
      
      const result = await cacheService.getCachedData('/api/test')
      
      expect(result).toEqual(testData)
      expect(cacheMock.match).toHaveBeenCalledWith('/api/test')
    })

    it('should return null when cache is expired', async () => {
      const testData = { id: 1, name: 'Test' }
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const mockResponse = new Response(JSON.stringify(testData), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Timestamp': expiredTimestamp.toString(),
        },
      })
      
      cacheMock.match.mockResolvedValue(mockResponse)
      
      const result = await cacheService.getCachedData('/api/test')
      
      expect(result).toBeNull()
    })

    it('should return null when no cached data exists', async () => {
      cacheMock.match.mockResolvedValue(undefined)
      
      const result = await cacheService.getCachedData('/api/test')
      
      expect(result).toBeNull()
    })
  })

  describe('cacheData', () => {
    it('should cache data with proper metadata', async () => {
      const testData = { id: 1, name: 'Test' }
      const url = '/api/test'
      
      await cacheService.cacheData(url, testData)
      
      expect(cacheMock.put).toHaveBeenCalledWith(
        url,
        expect.any(Response)
      )
      
      // Verify the response contains the data
      const putCall = cacheMock.put.mock.calls[0]
      const response = putCall[1] as Response
      const cachedData = await response.json()
      
      expect(cachedData).toEqual(testData)
    })

    it('should handle cache errors gracefully', async () => {
      const testData = { id: 1, name: 'Test' }
      const url = '/api/test'
      
      cacheMock.put.mockRejectedValue(new Error('Cache error'))
      
      // Should not throw
      await expect(cacheService.cacheData(url, testData)).resolves.toBeUndefined()
    })
  })

  describe('queueOfflineAction', () => {
    it('should queue offline actions for background sync', async () => {
      const action = {
        url: '/api/test',
        method: 'POST',
        body: { data: 'test' },
      }
      
      localStorageMock.getItem.mockReturnValue('[]')
      
      await cacheService.queueOfflineAction(action)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offline-actions-queue',
        expect.stringContaining('"url":"/api/test"')
      )
    })

    it('should handle existing queue items', async () => {
      const existingAction = {
        id: 'existing-1',
        url: '/api/existing',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([existingAction]))
      
      const newAction = {
        url: '/api/new',
        method: 'POST',
        body: { data: 'new' },
      }
      
      await cacheService.queueOfflineAction(newAction)
      
      const setItemCall = localStorageMock.setItem.mock.calls[0]
      const queueData = JSON.parse(setItemCall[1])
      
      expect(queueData).toHaveLength(2)
      expect(queueData[0]).toEqual(existingAction)
      expect(queueData[1].url).toBe('/api/new')
    })
  })

  describe('processOfflineQueue', () => {
    it('should process queued actions successfully', async () => {
      const queuedAction = {
        id: 'test-1',
        url: '/api/test',
        method: 'POST',
        body: { data: 'test' },
        headers: { 'Content-Type': 'application/json' },
        timestamp: Date.now(),
        retryCount: 0,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([queuedAction]))
      fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
      
      const result = await cacheService.processOfflineQueue()
      
      expect(result.success).toBe(1)
      expect(result.failed).toBe(0)
      expect(fetchMock).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    })

    it('should retry failed actions up to max retries', async () => {
      const queuedAction = {
        id: 'test-1',
        url: '/api/test',
        method: 'POST',
        body: { data: 'test' },
        timestamp: Date.now(),
        retryCount: 2, // Already retried twice
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify([queuedAction]))
      fetchMock.mockRejectedValue(new Error('Network error'))
      
      const result = await cacheService.processOfflineQueue()
      
      expect(result.success).toBe(0)
      expect(result.failed).toBe(1) // Max retries reached
    })

    it('should handle empty queue', async () => {
      localStorageMock.getItem.mockReturnValue('[]')
      
      const result = await cacheService.processOfflineQueue()
      
      expect(result.success).toBe(0)
      expect(result.failed).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockRequests = [
        new Request('/api/test1'),
        new Request('/api/test2'),
      ]
      
      cacheMock.keys.mockResolvedValue(mockRequests)
      localStorageMock.getItem.mockReturnValue('[]')
      
      const stats = await cacheService.getCacheStats()
      
      expect(stats).toHaveProperty('app-shell')
      expect(stats).toHaveProperty('api-cache')
      expect(stats).toHaveProperty('offlineQueue')
      expect(stats.offlineQueue.pending).toBe(0)
    })
  })

  describe('clearAllCaches', () => {
    it('should clear all caches and local storage', async () => {
      const cacheNames = ['api-cache-v1', 'images-cache-v1']
      cachesMock.keys.mockResolvedValue(cacheNames)
      cachesMock.delete.mockResolvedValue(true)
      
      await cacheService.clearAllCaches()
      
      expect(cachesMock.delete).toHaveBeenCalledTimes(2)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-actions-queue')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('cache-metadata')
    })
  })
})