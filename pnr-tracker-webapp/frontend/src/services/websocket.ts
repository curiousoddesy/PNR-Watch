import { io, Socket } from 'socket.io-client';
import { PNRStatusResult, TrackedPNR } from '../types';

export interface WebSocketEvents {
  'pnr-status-updated': (data: { pnrId: string; status: PNRStatusResult }) => void;
  'pnr-status-checking': (data: { pnrId: string }) => void;
  'pnr-status-error': (data: { pnrId: string; error: string }) => void;
  'pnr-added': (data: TrackedPNR) => void;
  'pnr-removed': (data: { pnrId: string }) => void;
  'notification': (data: { type: string; title: string; message: string }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.connect();
  }

  private connect(): void {
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      auth: {
        token: localStorage.getItem('authToken'),
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyListeners('connected', null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.notifyListeners('disconnected', { reason });
      
      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }
      
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.notifyListeners('error', { error: error.message });
      this.handleReconnect();
    });

    // PNR status events
    this.socket.on('pnr-status-updated', (data) => {
      this.notifyListeners('pnr-status-updated', data);
    });

    this.socket.on('pnr-status-checking', (data) => {
      this.notifyListeners('pnr-status-checking', data);
    });

    this.socket.on('pnr-status-error', (data) => {
      this.notifyListeners('pnr-status-error', data);
    });

    this.socket.on('pnr-added', (data) => {
      this.notifyListeners('pnr-added', data);
    });

    this.socket.on('pnr-removed', (data) => {
      this.notifyListeners('pnr-removed', data);
    });

    // Notification events
    this.socket.on('notification', (data) => {
      this.notifyListeners('notification', data);
    });

    // Authentication events
    this.socket.on('auth-error', () => {
      console.error('WebSocket authentication failed');
      this.disconnect();
      // Redirect to login or refresh token
      window.location.href = '/login';
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.notifyListeners('max-reconnect-attempts', null);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.isConnected && this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  private notifyListeners(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  public on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void;
  public on(event: string, callback: Function): void;
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void;
  public off(event: string, callback: Function): void;
  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  public emit(event: string, data?: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }

  public requestPNRStatusCheck(pnrId: string): void {
    this.emit('check-pnr-status', { pnrId });
  }

  public requestAllPNRStatusCheck(): void {
    this.emit('check-all-pnr-status');
  }

  public updateAuthToken(token: string): void {
    if (this.socket) {
      this.socket.auth = { token };
      if (this.isConnected) {
        // Reconnect with new token
        this.socket.disconnect();
        this.socket.connect();
      }
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Hook for React components
export const useWebSocket = () => {
  return webSocketService;
};