// Offline functionality and data synchronization manager

import { cacheService } from './cacheService'
import { backgroundSyncService } from './backgroundSyncService'

export interface OfflineState {
  isOnline: boolean
  isConnected: boolean
  lastOnline: number
  pendingActions: number
  syncInProgress: boolean
}

export interface ConflictResolution {
  strategy: 'client-wins' | 'server-wins' | 'merge' | 'manual'
  clientData: any
  serverData: any
  resolvedData?: any
}

export interface OfflineData {
  id: string
  type: 'pnr' | 'user-preference' | 'app-state'
  data: any
  timestamp: number
  version: number
  checksum: string
}

class OfflineManager {
  private readonly OFFLINE_DATA_KEY = 'offline-data-store'
  private readonly CONFLICT_QUEUE_KEY = 'conflict-resolution-queue'
  private readonly SYNC_METADATA_KEY = 'sync-metadata'
  
  private isOnline = navigator.onLine
  private isConnected = false
  private lastOnline = Date.now()
  private syncInProgress = false
  private stateCallbacks: Set<(state: OfflineState) => void> = new Set()
  private conflictCallbacks: Set<(conflict: ConflictResolution) => void> = new Set()

  constructor() {
    this.initialize()
  }

  /**
   * Initialize offline manager
   */
  private initialize() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
    
    // Check initial connection state
    this.checkConnectionState()
    
    // Set up periodic sync when online
    this.setupPeriodicSync()
    
    console.log('Offline manager initialized')
  }

  /**
   * Handle online event
   */
  private async handleOnline() {
    console.log('Connection restored')
    this.isOnline = true
    this.lastOnline = Date.now()
    
    // Check if actually connected (not just online)
    await this.checkConnectionState()
    
    if (this.isConnected) {
      // Start synchronization
      await this.synchronizeData()
    }
    
    this.notifyStateChange()
  }

  /**
   * Handle offline event
   */
  private handleOffline() {
    console.log('Connection lost')
    this.isOnline = false
    this.isConnected = false
    this.notifyStateChange()
  }

  /**
   * Check actual connection state
   */
  private async checkConnectionState() {
    try {
      // Try to fetch a small resource to verify connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      })
      
      this.isConnected = response.ok
    } catch (error) {
      this.isConnected = false
    }
    
    console.log('Connection state:', { online: this.isOnline, connected: this.isConnected })
  }

  /**
   * Store data for offline access
   */
  async storeOfflineData(type: OfflineData['type'], id: string, data: any): Promise<void> {
    try {
      const offlineData: OfflineData = {
        id,
        type,
        data,
        timestamp: Date.now(),
        version: await this.getNextVersion(id),
        checksum: this.generateChecksum(data),
      }
      
      const store = await this.getOfflineStore()
      store[`${type}-${id}`] = offlineData
      await this.saveOfflineStore(store)
      
      console.log('Data stored offline:', type, id)
    } catch (error) {
      console.error('Failed to store offline data:', error)
    }
  }

  /**
   * Get offline data
   */
  async getOfflineData<T>(type: OfflineData['type'], id: string): Promise<T | null> {
    try {
      const store = await this.getOfflineStore()
      const offlineData = store[`${type}-${id}`]
      
      if (offlineData) {
        // Verify data integrity
        const currentChecksum = this.generateChecksum(offlineData.data)
        if (currentChecksum === offlineData.checksum) {
          return offlineData.data
        } else {
          console.warn('Data integrity check failed for:', type, id)
          await this.removeOfflineData(type, id)
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to get offline data:', error)
      return null
    }
  }

  /**
   * Remove offline data
   */
  async removeOfflineData(type: OfflineData['type'], id: string): Promise<void> {
    try {
      const store = await this.getOfflineStore()
      delete store[`${type}-${id}`]
      await this.saveOfflineStore(store)
      
      console.log('Offline data removed:', type, id)
    } catch (error) {
      console.error('Failed to remove offline data:', error)
    }
  }

  /**
   * Synchronize offline data with server
   */
  async synchronizeData(): Promise<{ synced: number; conflicts: number; errors: number }> {
    if (this.syncInProgress || !this.isConnected) {
      return { synced: 0, conflicts: 0, errors: 0 }
    }

    this.syncInProgress = true
    let synced = 0
    let conflicts = 0
    let errors = 0

    try {
      console.log('Starting data synchronization')
      
      const store = await this.getOfflineStore()
      const entries = Object.entries(store)
      
      for (const [key, offlineData] of entries) {
        try {
          const result = await this.syncDataItem(offlineData)
          
          if (result.success) {
            if (result.conflict) {
              conflicts++
              await this.handleConflict(offlineData, result.serverData)
            } else {
              synced++
              // Remove successfully synced data
              delete store[key]
            }
          } else {
            errors++
            console.error('Sync failed for:', key, result.error)
          }
        } catch (error) {
          errors++
          console.error('Sync error for:', key, error)
        }
      }
      
      await this.saveOfflineStore(store)
      
      // Process background sync queue
      const syncResult = await backgroundSyncService.processSyncQueue()
      synced += syncResult.processed
      errors += syncResult.failed
      
      console.log(`Sync completed: ${synced} synced, ${conflicts} conflicts, ${errors} errors`)
      
    } catch (error) {
      console.error('Synchronization failed:', error)
    } finally {
      this.syncInProgress = false
      this.notifyStateChange()
    }

    return { synced, conflicts, errors }
  }

  /**
   * Sync individual data item
   */
  private async syncDataItem(offlineData: OfflineData): Promise<{
    success: boolean
    conflict?: boolean
    serverData?: any
    error?: string
  }> {
    try {
      // Get current server data
      const response = await fetch(`/api/${offlineData.type}/${offlineData.id}`)
      
      if (response.status === 404) {
        // Item doesn't exist on server, create it
        const createResponse = await fetch(`/api/${offlineData.type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(offlineData.data),
        })
        
        return { success: createResponse.ok }
      }
      
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` }
      }
      
      const serverData = await response.json()
      
      // Check for conflicts
      if (this.hasConflict(offlineData, serverData)) {
        return { success: true, conflict: true, serverData }
      }
      
      // Update server with offline changes
      const updateResponse = await fetch(`/api/${offlineData.type}/${offlineData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlineData.data),
      })
      
      return { success: updateResponse.ok }
      
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Check for data conflicts
   */
  private hasConflict(offlineData: OfflineData, serverData: any): boolean {
    // Simple conflict detection based on timestamps
    const serverTimestamp = new Date(serverData.updatedAt || serverData.timestamp || 0).getTime()
    return serverTimestamp > offlineData.timestamp
  }

  /**
   * Handle data conflicts
   */
  private async handleConflict(offlineData: OfflineData, serverData: any) {
    const conflict: ConflictResolution = {
      strategy: 'manual', // Default to manual resolution
      clientData: offlineData.data,
      serverData,
    }
    
    // Store conflict for manual resolution
    const conflicts = await this.getConflictQueue()
    conflicts.push({
      id: offlineData.id,
      type: offlineData.type,
      conflict,
      timestamp: Date.now(),
    })
    await this.saveConflictQueue(conflicts)
    
    // Notify conflict callbacks
    this.conflictCallbacks.forEach(callback => callback(conflict))
    
    console.log('Conflict detected for:', offlineData.type, offlineData.id)
  }

  /**
   * Resolve conflict with specified strategy
   */
  async resolveConflict(
    id: string,
    type: OfflineData['type'],
    strategy: ConflictResolution['strategy'],
    resolvedData?: any
  ): Promise<boolean> {
    try {
      const conflicts = await this.getConflictQueue()
      const conflictIndex = conflicts.findIndex(c => c.id === id && c.type === type)
      
      if (conflictIndex === -1) {
        return false
      }
      
      const conflict = conflicts[conflictIndex]
      let dataToSync: any
      
      switch (strategy) {
        case 'client-wins':
          dataToSync = conflict.conflict.clientData
          break
        case 'server-wins':
          dataToSync = conflict.conflict.serverData
          break
        case 'merge':
          dataToSync = this.mergeData(conflict.conflict.clientData, conflict.conflict.serverData)
          break
        case 'manual':
          dataToSync = resolvedData
          break
      }
      
      // Sync resolved data
      const response = await fetch(`/api/${type}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSync),
      })
      
      if (response.ok) {
        // Remove resolved conflict
        conflicts.splice(conflictIndex, 1)
        await this.saveConflictQueue(conflicts)
        
        // Update local data
        await this.storeOfflineData(type, id, dataToSync)
        
        console.log('Conflict resolved:', type, id, strategy)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      return false
    }
  }

  /**
   * Merge data (simple merge strategy)
   */
  private mergeData(clientData: any, serverData: any): any {
    // Simple merge - server data takes precedence for conflicts
    return {
      ...clientData,
      ...serverData,
      // Keep client data for specific fields that should be preserved
      userPreferences: clientData.userPreferences || serverData.userPreferences,
      localNotes: clientData.localNotes || serverData.localNotes,
    }
  }

  /**
   * Setup periodic sync
   */
  private setupPeriodicSync() {
    // Sync every 5 minutes when online
    setInterval(async () => {
      if (this.isConnected && !this.syncInProgress) {
        await this.synchronizeData()
      }
    }, 5 * 60 * 1000)
  }

  /**
   * Get offline store
   */
  private async getOfflineStore(): Promise<Record<string, OfflineData>> {
    try {
      const stored = localStorage.getItem(this.OFFLINE_DATA_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to get offline store:', error)
      return {}
    }
  }

  /**
   * Save offline store
   */
  private async saveOfflineStore(store: Record<string, OfflineData>): Promise<void> {
    try {
      localStorage.setItem(this.OFFLINE_DATA_KEY, JSON.stringify(store))
    } catch (error) {
      console.error('Failed to save offline store:', error)
    }
  }

  /**
   * Get conflict queue
   */
  private async getConflictQueue(): Promise<any[]> {
    try {
      const stored = localStorage.getItem(this.CONFLICT_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get conflict queue:', error)
      return []
    }
  }

  /**
   * Save conflict queue
   */
  private async saveConflictQueue(conflicts: any[]): Promise<void> {
    try {
      localStorage.setItem(this.CONFLICT_QUEUE_KEY, JSON.stringify(conflicts))
    } catch (error) {
      console.error('Failed to save conflict queue:', error)
    }
  }

  /**
   * Generate data checksum
   */
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

  /**
   * Get next version number
   */
  private async getNextVersion(id: string): Promise<number> {
    try {
      const metadata = localStorage.getItem(this.SYNC_METADATA_KEY)
      const versions = metadata ? JSON.parse(metadata) : {}
      const currentVersion = versions[id] || 0
      const nextVersion = currentVersion + 1
      
      versions[id] = nextVersion
      localStorage.setItem(this.SYNC_METADATA_KEY, JSON.stringify(versions))
      
      return nextVersion
    } catch (error) {
      console.error('Failed to get next version:', error)
      return 1
    }
  }

  /**
   * Notify state change
   */
  private notifyStateChange() {
    const state: OfflineState = {
      isOnline: this.isOnline,
      isConnected: this.isConnected,
      lastOnline: this.lastOnline,
      pendingActions: 0, // Will be updated by background sync service
      syncInProgress: this.syncInProgress,
    }
    
    // Get pending actions count
    backgroundSyncService.getQueueStatus().then(status => {
      state.pendingActions = status.pending
      this.stateCallbacks.forEach(callback => callback(state))
    })
  }

  /**
   * Public API methods
   */
  public getState(): OfflineState {
    return {
      isOnline: this.isOnline,
      isConnected: this.isConnected,
      lastOnline: this.lastOnline,
      pendingActions: 0,
      syncInProgress: this.syncInProgress,
    }
  }

  public onStateChange(callback: (state: OfflineState) => void) {
    this.stateCallbacks.add(callback)
    return () => this.stateCallbacks.delete(callback)
  }

  public onConflict(callback: (conflict: ConflictResolution) => void) {
    this.conflictCallbacks.add(callback)
    return () => this.conflictCallbacks.delete(callback)
  }

  public async forceSync(): Promise<{ synced: number; conflicts: number; errors: number }> {
    return await this.synchronizeData()
  }

  public async getPendingConflicts(): Promise<any[]> {
    return await this.getConflictQueue()
  }

  public async clearOfflineData(): Promise<void> {
    localStorage.removeItem(this.OFFLINE_DATA_KEY)
    localStorage.removeItem(this.CONFLICT_QUEUE_KEY)
    localStorage.removeItem(this.SYNC_METADATA_KEY)
    console.log('Offline data cleared')
  }
}

export const offlineManager = new OfflineManager()