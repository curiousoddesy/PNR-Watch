// Local storage service for offline-first data architecture

export interface StorageItem<T = any> {
  data: T
  timestamp: number
  version: number
  ttl?: number // Time to live in milliseconds
  checksum: string
}

export interface StorageOptions {
  ttl?: number
  version?: number
  compress?: boolean
  encrypt?: boolean
}

class LocalStorageService {
  private readonly PREFIX = 'pnr-app'
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024 // 5MB
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour

  constructor() {
    this.initialize()
  }

  private initialize() {
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanup()
    }, this.CLEANUP_INTERVAL)

    // Initial cleanup
    this.cleanup()
  }

  /**
   * Store data with metadata
   */
  async set<T>(key: string, data: T, options: StorageOptions = {}): Promise<boolean> {
    try {
      const item: StorageItem<T> = {
        data,
        timestamp: Date.now(),
        version: options.version || 1,
        ttl: options.ttl,
        checksum: this.generateChecksum(data),
      }

      let serialized = JSON.stringify(item)

      // Compress if requested and data is large
      if (options.compress && serialized.length > 1024) {
        serialized = this.compress(serialized)
      }

      // Check storage quota
      if (!this.hasStorageSpace(serialized.length)) {
        await this.freeUpSpace(serialized.length)
      }

      const storageKey = this.getStorageKey(key)
      localStorage.setItem(storageKey, serialized)

      console.log(`Stored ${key} (${serialized.length} bytes)`)
      return true
    } catch (error) {
      console.error('Failed to store data:', key, error)
      return false
    }
  }

  /**
   * Retrieve data with validation
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const storageKey = this.getStorageKey(key)
      const stored = localStorage.getItem(storageKey)

      if (!stored) {
        return null
      }

      let serialized = stored
      
      // Decompress if needed
      if (this.isCompressed(stored)) {
        serialized = this.decompress(stored)
      }

      const item: StorageItem<T> = JSON.parse(serialized)

      // Check TTL
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        await this.remove(key)
        return null
      }

      // Verify data integrity
      const currentChecksum = this.generateChecksum(item.data)
      if (currentChecksum !== item.checksum) {
        console.warn('Data integrity check failed for:', key)
        await this.remove(key)
        return null
      }

      return item.data
    } catch (error) {
      console.error('Failed to retrieve data:', key, error)
      return null
    }
  }

  /**
   * Remove data
   */
  async remove(key: string): Promise<boolean> {
    try {
      const storageKey = this.getStorageKey(key)
      localStorage.removeItem(storageKey)
      return true
    } catch (error) {
      console.error('Failed to remove data:', key, error)
      return false
    }
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const storageKey = this.getStorageKey(key)
    return localStorage.getItem(storageKey) !== null
  }

  /**
   * Get all keys with prefix
   */
  async keys(pattern?: string): Promise<string[]> {
    const keys: string[] = []
    const prefix = `${this.PREFIX}:`

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        const cleanKey = key.substring(prefix.length)
        if (!pattern || cleanKey.includes(pattern)) {
          keys.push(cleanKey)
        }
      }
    }

    return keys
  }

  /**
   * Clear all app data
   */
  async clear(): Promise<void> {
    const keys = await this.keys()
    for (const key of keys) {
      await this.remove(key)
    }
    console.log('Local storage cleared')
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalSize: number
    itemCount: number
    availableSpace: number
    items: Array<{ key: string; size: number; timestamp: number }>
  }> {
    const keys = await this.keys()
    const items: Array<{ key: string; size: number; timestamp: number }> = []
    let totalSize = 0

    for (const key of keys) {
      try {
        const storageKey = this.getStorageKey(key)
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const size = new Blob([stored]).size
          totalSize += size

          // Get timestamp from stored item
          let timestamp = Date.now()
          try {
            const item = JSON.parse(stored)
            timestamp = item.timestamp || timestamp
          } catch {
            // Ignore parse errors for timestamp
          }

          items.push({ key, size, timestamp })
        }
      } catch (error) {
        console.warn('Failed to get stats for key:', key, error)
      }
    }

    return {
      totalSize,
      itemCount: items.length,
      availableSpace: this.MAX_STORAGE_SIZE - totalSize,
      items: items.sort((a, b) => b.timestamp - a.timestamp),
    }
  }

  /**
   * Batch operations
   */
  async batch(operations: Array<{
    operation: 'set' | 'get' | 'remove'
    key: string
    data?: any
    options?: StorageOptions
  }>): Promise<Array<{ success: boolean; result?: any; error?: string }>> {
    const results: Array<{ success: boolean; result?: any; error?: string }> = []

    for (const op of operations) {
      try {
        let result: any
        let success = true

        switch (op.operation) {
          case 'set':
            success = await this.set(op.key, op.data, op.options)
            break
          case 'get':
            result = await this.get(op.key)
            break
          case 'remove':
            success = await this.remove(op.key)
            break
        }

        results.push({ success, result })
      } catch (error) {
        results.push({ success: false, error: error.message })
      }
    }

    return results
  }

  /**
   * Private helper methods
   */
  private getStorageKey(key: string): string {
    return `${this.PREFIX}:${key}`
  }

  private generateChecksum(data: any): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  private hasStorageSpace(requiredBytes: number): boolean {
    try {
      // Estimate current usage
      let currentUsage = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(`${this.PREFIX}:`)) {
          const value = localStorage.getItem(key)
          if (value) {
            currentUsage += new Blob([key + value]).size
          }
        }
      }

      return currentUsage + requiredBytes <= this.MAX_STORAGE_SIZE
    } catch (error) {
      console.warn('Failed to check storage space:', error)
      return true // Assume we have space
    }
  }

  private async freeUpSpace(requiredBytes: number): Promise<void> {
    console.log('Freeing up storage space...')
    
    const stats = await this.getStats()
    const sortedItems = stats.items.sort((a, b) => a.timestamp - b.timestamp) // Oldest first

    let freedBytes = 0
    for (const item of sortedItems) {
      if (freedBytes >= requiredBytes) {
        break
      }

      await this.remove(item.key)
      freedBytes += item.size
      console.log(`Removed ${item.key} (${item.size} bytes)`)
    }

    console.log(`Freed ${freedBytes} bytes`)
  }

  private cleanup(): void {
    // Remove expired items
    this.keys().then(keys => {
      keys.forEach(async key => {
        const data = await this.get(key)
        // get() method already handles TTL cleanup
      })
    })
  }

  private compress(data: string): string {
    // Simple compression using LZ-string or similar
    // For now, just return the original data
    // In a real implementation, you'd use a compression library
    return data
  }

  private decompress(data: string): string {
    // Simple decompression
    // For now, just return the original data
    return data
  }

  private isCompressed(data: string): boolean {
    // Check if data is compressed
    // For now, always return false
    return false
  }
}

export const localStorageService = new LocalStorageService()

// Specialized services for different data types
export class PNRStorageService {
  private readonly storage = localStorageService

  async storePNR(pnrNumber: string, data: any): Promise<boolean> {
    return await this.storage.set(`pnr:${pnrNumber}`, data, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      version: 1,
    })
  }

  async getPNR(pnrNumber: string): Promise<any> {
    return await this.storage.get(`pnr:${pnrNumber}`)
  }

  async getAllPNRs(): Promise<any[]> {
    const keys = await this.storage.keys('pnr:')
    const pnrs: any[] = []

    for (const key of keys) {
      const pnr = await this.storage.get(key)
      if (pnr) {
        pnrs.push(pnr)
      }
    }

    return pnrs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }

  async removePNR(pnrNumber: string): Promise<boolean> {
    return await this.storage.remove(`pnr:${pnrNumber}`)
  }

  async clearAllPNRs(): Promise<void> {
    const keys = await this.storage.keys('pnr:')
    for (const key of keys) {
      await this.storage.remove(key)
    }
  }
}

export class UserPreferencesService {
  private readonly storage = localStorageService
  private readonly KEY = 'user:preferences'

  async getPreferences(): Promise<any> {
    return await this.storage.get(this.KEY) || {}
  }

  async setPreferences(preferences: any): Promise<boolean> {
    return await this.storage.set(this.KEY, preferences, {
      version: 1,
    })
  }

  async updatePreference(key: string, value: any): Promise<boolean> {
    const current = await this.getPreferences()
    current[key] = value
    return await this.setPreferences(current)
  }

  async clearPreferences(): Promise<boolean> {
    return await this.storage.remove(this.KEY)
  }
}

export const pnrStorageService = new PNRStorageService()
export const userPreferencesService = new UserPreferencesService()