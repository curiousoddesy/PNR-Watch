import { useEffect, useCallback, useState } from 'react';
import { webSocketService, WebSocketEvents } from '../services/websocket';

export const useWebSocketConnection = () => {
  const [isConnected, setIsConnected] = useState(webSocketService.getConnectionStatus());
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleError = (data: { error: string }) => {
      setConnectionError(data.error);
    };

    const handleMaxReconnectAttempts = () => {
      setConnectionError('Unable to connect to server. Please refresh the page.');
    };

    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);
    webSocketService.on('error', handleError);
    webSocketService.on('max-reconnect-attempts', handleMaxReconnectAttempts);

    return () => {
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.off('error', handleError);
      webSocketService.off('max-reconnect-attempts', handleMaxReconnectAttempts);
    };
  }, []);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
  };
};

export const useWebSocketEvent = <K extends keyof WebSocketEvents>(
  event: K,
  callback: WebSocketEvents[K],
  dependencies: any[] = []
) => {
  const memoizedCallback = useCallback(callback, dependencies);

  useEffect(() => {
    webSocketService.on(event, memoizedCallback);
    return () => {
      webSocketService.off(event, memoizedCallback);
    };
  }, [event, memoizedCallback]);
};

export const useRealTimePNRUpdates = () => {
  const [updatingPNRs, setUpdatingPNRs] = useState<Set<string>>(new Set());

  const handleStatusChecking = useCallback((data: { pnrId: string }) => {
    setUpdatingPNRs(prev => new Set(prev).add(data.pnrId));
  }, []);

  const handleStatusUpdated = useCallback((data: { pnrId: string }) => {
    setUpdatingPNRs(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.pnrId);
      return newSet;
    });
  }, []);

  const handleStatusError = useCallback((data: { pnrId: string }) => {
    setUpdatingPNRs(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.pnrId);
      return newSet;
    });
  }, []);

  useWebSocketEvent('pnr-status-checking', handleStatusChecking);
  useWebSocketEvent('pnr-status-updated', handleStatusUpdated);
  useWebSocketEvent('pnr-status-error', handleStatusError);

  return {
    updatingPNRs,
    requestStatusCheck: (pnrId: string) => webSocketService.requestPNRStatusCheck(pnrId),
    requestAllStatusCheck: () => webSocketService.requestAllPNRStatusCheck(),
  };
};