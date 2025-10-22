import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

interface UseWebSocketOptions {
  onStatusUpdate?: (data: any) => void;
  onNotification?: (data: any) => void;
  onError?: (error: Error) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Connect to WebSocket server
    const token = localStorage.getItem('authToken');
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    socketRef.current = io(wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError(err.message);
      setIsConnected(false);
      if (options.onError) {
        options.onError(err);
      }
    });

    // PNR status update events
    socket.on('pnr_status_update', (data) => {
      console.log('PNR status update received:', data);
      if (options.onStatusUpdate) {
        options.onStatusUpdate(data);
      }
    });

    // Notification events
    socket.on('new_notification', (data) => {
      console.log('New notification received:', data);
      if (options.onNotification) {
        options.onNotification(data);
      }
    });

    // Authentication error
    socket.on('auth_error', (error) => {
      console.error('WebSocket auth error:', error);
      setError('Authentication failed');
      socket.disconnect();
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated, user, options]);

  const emit = (event: string, data?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  };

  const subscribe = (event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const unsubscribe = (event: string, callback?: (data: any) => void) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  };

  return {
    isConnected,
    error,
    emit,
    subscribe,
    unsubscribe,
  };
};