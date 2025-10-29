// Background sync service for offline functionality

export interface SyncTask {
  id: string
  type: 'pnr-add' | 'pnr-update' | 'pnr-delete' | 'user-action'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
  priority: 'high' | 'medium' | 'low'
}

export interface SyncResult {
  success: boolean
  error?: string
  data?: any
}

class BackgroundSyncService {
  private readonly SYNC_QUEUE_KEY = 'background-sync-queue'
  private readonly MAX_RETRY_DELAY = 5 * 60 * 1000 // 5 minutes
  private readonly RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000] // Progressive delays
  
  private isProcessing = false
  private syncCallbacks: Map<string, (result: SyncResult) => void> = new Map()

  /**
   * Initialize background sync service
   */
  async initialize(): Promise<void> {
    try {
      // Register service worker sync events
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready
        
        // Listen for sync events from service worker
        navigator.serviceWorker.addEventListener('message', this.handleSyncMessage.bind(this))
        
        console.log('Background sync service initialized')
      } else {
        console.warn('Background sync not supported, falling back to immediate processing')
      }
      
      // Process any pending tasks on startup
      await this.processPendingTasks()
    } catch (error) {
      console.error('Failed to initialize background sync service:', error)
    }
  }

  /**
   * Add task to sync queue
   */
  async addTask(
    type: SyncTask['type'],
    data: any,
    priority: SyncTask['priority'] = 'medium',
    maxRetries: number = 3
  ): Promise<string> {
    const task: SyncTask = {
      id: this.generateTaskId(),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      priority,
    }

    try {
      const queue = await this.getSyncQueue()
      queue.push(task)
      
      // Sort by priority and timestamp
      queue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp
      })
      
      await this.saveSyncQueue(queue)
      
      // Register background sync if supported
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register(`sync-${type}`)
      } else {
        // Process immediately if background sync not supported
        this.processTasksImmediate()
      }
      
      console.log('Task added to sync queue:', task.id, type)
      return task.id
    } catch (error) {
      console.error('Failed to add sync task:', error)
      throw error
    }
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      console.log('Sync already in progress')
      return { processed: 0, failed: 0 }
    }

    this.isProcessing = true
    let processed = 0
    let failed = 0

    try {
      const queue = await this.getSyncQueue()
      const remainingTasks: SyncTask[] = []

      for (const task of queue) {
        try {
          const result = await this.processTask(task)
          
          if (result.success) {
            processed++
            this.notifyTaskComplete(task.id, result)
            console.log('Task processed successfully:', task.id)
          } else {
            throw new Error(result.error || 'Task processing failed')
          }
        } catch (error) {
          console.error('Task processing failed:', task.id, error)
          
          if (task.retryCount < task.maxRetries) {
            // Add back to queue with incremented retry count
            remainingTasks.push({
              ...task,
              retryCount: task.retryCount + 1,
            })
          } else {
            failed++
            this.notifyTaskComplete(task.id, { success: false, error: error.message })
            console.error('Max retries reached for task:', task.id)
          }
        }
      }

      await this.saveSyncQueue(remainingTasks)
      console.log(`Sync completed: ${processed} processed, ${failed} failed, ${remainingTasks.length} remaining`)
      
    } catch (error) {
      console.error('Sync queue processing failed:', error)
    } finally {
      this.isProcessing = false
    }

    return { processed, failed }
  }

  /**
   * Process individual task
   */
  private async processTask(task: SyncTask): Promise<SyncResult> {
    try {
      switch (task.type) {
        case 'pnr-add':
          return await this.processPNRAdd(task.data)
        case 'pnr-update':
          return await this.processPNRUpdate(task.data)
        case 'pnr-delete':
          return await this.processPNRDelete(task.data)
        case 'user-action':
          return await this.processUserAction(task.data)
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Process PNR add task
   */
  private async processPNRAdd(data: any): Promise<SyncResult> {
    try {
      const response = await fetch('/api/pnr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Process PNR update task
   */
  private async processPNRUpdate(data: any): Promise<SyncResult> {
    try {
      const response = await fetch(`/api/pnr/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Process PNR delete task
   */
  private async processPNRDelete(data: any): Promise<SyncResult> {
    try {
      const response = await fetch(`/api/pnr/${data.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Process user action task
   */
  private async processUserAction(data: any): Promise<SyncResult> {
    try {
      const response = await fetch(data.url, {
        method: data.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...data.headers,
        },
        body: data.body ? JSON.stringify(data.body) : undefined,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Handle sync messages from service worker
   */
  private handleSyncMessage(event: MessageEvent) {
    if (event.data?.type === 'SYNC_REQUESTED') {
      this.processSyncQueue()
    } else if (event.data?.type === 'OFFLINE_SYNC_COMPLETE') {
      console.log('Offline sync completed by service worker')
    }
  }

  /**
   * Process tasks immediately (fallback for unsupported browsers)
   */
  private async processTasksImmediate() {
    // Add small delay to batch multiple rapid additions
    setTimeout(() => {
      this.processSyncQueue()
    }, 1000)
  }

  /**
   * Process pending tasks on startup
   */
  private async processPendingTasks() {
    const queue = await this.getSyncQueue()
    if (queue.length > 0) {
      console.log(`Found ${queue.length} pending sync tasks`)
      await this.processSyncQueue()
    }
  }

  /**
   * Get sync queue from storage
   */
  private async getSyncQueue(): Promise<SyncTask[]> {
    try {
      const stored = localStorage.getItem(this.SYNC_QUEUE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get sync queue:', error)
      return []
    }
  }

  /**
   * Save sync queue to storage
   */
  private async saveSyncQueue(queue: SyncTask[]): Promise<void> {
    try {
      localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(queue))
    } catch (error) {
      console.error('Failed to save sync queue:', error)
    }
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Notify task completion
   */
  private notifyTaskComplete(taskId: string, result: SyncResult) {
    const callback = this.syncCallbacks.get(taskId)
    if (callback) {
      callback(result)
      this.syncCallbacks.delete(taskId)
    }
  }

  /**
   * Register callback for task completion
   */
  onTaskComplete(taskId: string, callback: (result: SyncResult) => void) {
    this.syncCallbacks.set(taskId, callback)
  }

  /**
   * Get sync queue status
   */
  async getQueueStatus(): Promise<{
    pending: number
    processing: boolean
    tasks: Array<{ id: string; type: string; retryCount: number; priority: string }>
  }> {
    const queue = await this.getSyncQueue()
    
    return {
      pending: queue.length,
      processing: this.isProcessing,
      tasks: queue.map(task => ({
        id: task.id,
        type: task.type,
        retryCount: task.retryCount,
        priority: task.priority,
      })),
    }
  }

  /**
   * Clear sync queue
   */
  async clearQueue(): Promise<void> {
    try {
      await this.saveSyncQueue([])
      console.log('Sync queue cleared')
    } catch (error) {
      console.error('Failed to clear sync queue:', error)
    }
  }

  /**
   * Retry failed tasks
   */
  async retryFailedTasks(): Promise<void> {
    const queue = await this.getSyncQueue()
    const failedTasks = queue.filter(task => task.retryCount > 0)
    
    if (failedTasks.length > 0) {
      console.log(`Retrying ${failedTasks.length} failed tasks`)
      await this.processSyncQueue()
    }
  }
}

export const backgroundSyncService = new BackgroundSyncService()