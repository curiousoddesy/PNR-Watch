import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Train as TrainIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useWebSocketEvent } from '../../hooks/useWebSocket';

interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
}

export const RealTimeNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);

  // Handle WebSocket notifications
  useWebSocketEvent('notification', (data: { type: string; title: string; message: string }) => {
    const notification: NotificationData = {
      id: Date.now().toString(),
      type: data.type as 'success' | 'error' | 'info' | 'warning',
      title: data.title,
      message: data.message,
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, notification]);
  }, []);

  // Handle PNR status updates
  useWebSocketEvent('pnr-status-updated', (data: { pnrId: string; status: any }) => {
    const notification: NotificationData = {
      id: Date.now().toString(),
      type: 'success',
      title: 'PNR Status Updated',
      message: `PNR ${data.status.pnr} status has been updated to: ${data.status.status}`,
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, notification]);
  }, []);

  // Handle PNR status errors
  useWebSocketEvent('pnr-status-error', (data: { pnrId: string; error: string }) => {
    const notification: NotificationData = {
      id: Date.now().toString(),
      type: 'error',
      title: 'PNR Check Failed',
      message: `Failed to check PNR status: ${data.error}`,
      timestamp: new Date(),
    };

    setNotifications(prev => [...prev, notification]);
  }, []);

  // Show notifications one by one
  useEffect(() => {
    if (notifications.length > 0 && !currentNotification) {
      setCurrentNotification(notifications[0]);
      setNotifications(prev => prev.slice(1));
    }
  }, [notifications, currentNotification]);

  const handleClose = () => {
    setCurrentNotification(null);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'info':
        return <InfoIcon />;
      default:
        return <TrainIcon />;
    }
  };

  return (
    <Snackbar
      open={!!currentNotification}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      {currentNotification && (
        <Alert
          severity={currentNotification.type}
          icon={getIcon(currentNotification.type)}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
          sx={{ minWidth: 300 }}
        >
          <AlertTitle>{currentNotification.title}</AlertTitle>
          <Typography variant="body2">
            {currentNotification.message}
          </Typography>
        </Alert>
      )}
    </Snackbar>
  );
};