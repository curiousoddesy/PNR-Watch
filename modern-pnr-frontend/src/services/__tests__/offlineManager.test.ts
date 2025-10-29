// Tests for offline manager

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { offlineManager } from '../offlineManager'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

// Mock fetch
const fetchMock = vi.fn()

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('OfflineManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    
    Object.defineProperty(global, 'fetch', {
      value: fetchMock,
      writable: true,
    })
    
    localStorageMock.getItem.mockReturnValue('{}')
    navigator.onLine = true
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('storeOfflineData', () => {
    it('should store data with metadata', async () => {
      const testData = { id: 1, name: 'Test PNR' }
      
      await offlineManager.storeOfflineData('pnr', 'ABC123', testData)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offline-data-store',
        expect.stringContaining('"id":"ABC123"')
      )
      
      const setItemCall = localStorageMock.setItem.mock.calls[0]
      const storedData = JSON.parse(setItemCall[1])
      
      expect(storedData['pnr-ABC123']).toBeDefined()
      expect(storedData['pnr-ABC123'].data).toEqual(testData)
      expect(storedData['pnr-ABC123'].type).toBe('pnr')
      expect(storedData['pnr-ABC123'].checksum).toBeDefined()
    })

    it('should handle storage errors gracefully', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      // Should not throw
      await expect(
        offlineManager.storeOfflineData('pnr', 'ABC123', { test: 'data' })
      ).resolves.toBeUndefined()
    })
  })

  describe('getOfflineData', () => {
    it('should retrieve stored data with integrity check', async () => {
      const testData = { id: 1, name: 'Test PNR' }
      const offlineData = {
        id: 'ABC123',
        type: 'pnr',
        data: testData,
        timestamp: Date.now(),
        version: 1,
        checksum: 'valid-checksum',
      }
      
      const store = { 'pnr-ABC123': offlineData }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(store))
      
      // Mock checksum validation to pass
      vi.spyOn(offlineManager as any, 'generateChecksum').mockReturnValue('valid-checksum')
      
      const result = await offlineManager.getOfflineData('pnr', 'ABC123')
      
      expect(result).toEqual(testData)
    })

    it('should return null for non-existent data', async () => {
      localStorageMock.getItem.mockReturnValue('{}')
      
      const result = await offlineManager.getOfflineData('pnr', 'NONEXISTENT')
      
      expect(result).toBeNull()
    })

    it('should remove corrupted data and return null', async () => {
      const testData = { id: 1, name: 'Test PNR' }
      const offlineData = {
        id: 'ABC123',
        type: 'pnr',
        data: testData,
        timestamp: Date.now(),
        version: 1,
        checksum: 'invalid-checksum',
      }
      
      const store = { 'pnr-ABC123': offlineData }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(store))
      
      // Mock checksum validation to fail
      vi.spyOn(offlineManager as any, 'generateChecksum').mockReturnValue('different-checksum')
      
      const result = await offlineManager.getOfflineData('pnr', 'ABC123')
      
      expect(result).toBeNull()
      // Should have attempted to remove corrupted data
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('synchronizeData', () => {
    it('should sync offline data with server successfully', async () => {
      const offlineData = {
        id: 'ABC123',
        type: 'pnr',
        data: { pnrNumber: 'ABC123', status: 'confirmed' },
        timestamp: Date.now(),
        version: 1,
        checksum: 'test-checksum',
      }
      
      const store = { 'pnr-ABC123': offlineData }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(store))
      
      // Mock server responses
      fetchMock
        .mockResolvedValueOnce(new Response('', { status: 404 })) // Item doesn't exist
        .mockResolvedValueOnce(new Response('{"success": true}', { status: 200 })) // Create successful
      
      const result = await offlineManager.synchronizeData()
      
      expect(result.synced).toBe(1)
      expect(result.conflicts).toBe(0)
      expect(result.errors).toBe(0)
      
      expect(fetchMock).toHaveBeenCalledWith('/api/pnr/ABC123')
      expect(fetchMock).toHaveBeenCalledWith('/api/pnr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pnrNumber: 'ABC123', status: 'confirmed' }),
      })
    })

    it('should detect and handle conflicts', async () => {
      const offlineData = {
        id: 'ABC123',
        type: 'pnr',
        data: { pnrNumber: 'ABC123', status: 'confirmed', updatedAt: '2023-01-01' },
        timestamp: new Date('2023-01-01').getTime(),
        version: 1,
        checksum: 'test-checksum',
      }
      
      const store = { 'pnr-ABC123': offlineData }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(store))
      
      // Mock server response with newer data
      const serverData = {
        pnrNumber: 'ABC123',
        status: 'cancelled',
        updatedAt: '2023-01-02', // Newer than offline data
      }
      
      fetchMock.mockResolvedValue(new Response(JSON.stringify(serverData), { status: 200 }))
      
      const result = await offlineManager.synchronizeData()
      
      expect(result.conflicts).toBe(1)
      expect(result.synced).toBe(0)
    })

    it('should not sync when offline', async () => {
      // Mock offline state
      vi.spyOn(offlineManager as any, 'isConnected', 'get').mockReturnValue(false)
      
      const result = await offlineManager.synchronizeData()
      
      expect(result.synced).toBe(0)
      expect(result.conflicts).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('should handle sync errors gracefully', async () => {
      const offlineData = {
        id: 'ABC123',
        type: 'pnr',
        data: { pnrNumber: 'ABC123' },
        timestamp: Date.now(),
        version: 1,
        checksum: 'test-checksum',
      }
      
      const store = { 'pnr-ABC123': offlineData }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(store))
      
      fetchMock.mockRejectedValue(new Error('Network error'))
      
      const result = await offlineManager.synchronizeData()
      
      expect(result.errors).toBe(1)
      expect(result.synced).toBe(0)
    })
  })

  describe('resolveConflict', () => {
    beforeEach(() => {
      const conflicts = [
        {
          id: 'ABC123',
          type: 'pnr',
          conflict: {
            strategy: 'manual',
            clientData: { status: 'confirmed' },
            serverData: { status: 'cancelled' },
          },
          timestamp: Date.now(),
        },
      ]
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'conflict-resolution-queue') {
          return JSON.stringify(conflicts)
        }
        return '{}'
      })
    })

    it('should resolve conflict with client-wins strategy', async () => {
      fetchMock.mockResolvedValue(new Response('{"success": true}', { status: 200 }))
      
      const result = await offlineManager.resolveConflict('ABC123', 'pnr', 'client-wins')
      
      expect(result).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith('/api/pnr/ABC123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      })
    })

    it('should resolve conflict with server-wins strategy', async () => {
      fetchMock.mockResolvedValue(new Response('{"success": true}', { status: 200 }))
      
      const result = await offlineManager.resolveConflict('ABC123', 'pnr', 'server-wins')
      
      expect(result).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith('/api/pnr/ABC123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
    })

    it('should resolve conflict with manual strategy', async () => {
      const resolvedData = { status: 'pending' }
      fetchMock.mockResolvedValue(new Response('{"success": true}', { status: 200 }))
      
      const result = await offlineManager.resolveConflict('ABC123', 'pnr', 'manual', resolvedData)
      
      expect(result).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith('/api/pnr/ABC123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolvedData),
      })
    })

    it('should return false for non-existent conflict', async () => {
      const result = await offlineManager.resolveConflict('NONEXISTENT', 'pnr', 'client-wins')
      
      expect(result).toBe(false)
    })

    it('should handle resolution errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))
      
      const result = await offlineManager.resolveConflict('ABC123', 'pnr', 'client-wins')
      
      expect(result).toBe(false)
    })
  })

  describe('getState', () => {
    it('should return current offline state', () => {
      const state = offlineManager.getState()
      
      expect(state).toHaveProperty('isOnline')
      expect(state).toHaveProperty('isConnected')
      expect(state).toHaveProperty('lastOnline')
      expect(state).toHaveProperty('pendingActions')
      expect(state).toHaveProperty('syncInProgress')
    })
  })

  describe('clearOfflineData', () => {
    it('should clear all offline data', async () => {
      await offlineManager.clearOfflineData()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('offline-data-store')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('conflict-resolution-queue')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sync-metadata')
    })
  })
})