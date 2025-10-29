import React from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FlashOn as FlashOnIcon,
} from '@mui/icons-material';
import { webSocketService } from '../../services/websocket';

interface ManualRefreshButtonProps {
  pnrId?: string;
  variant?: 'button' | 'icon';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  isRefreshing?: boolean;
  showRealTime?: boolean;
  onTraditionalRefresh?: () => void;
}

export const ManualRefreshButton: React.FC<ManualRefreshButtonProps> = ({
  pnrId,
  variant = 'icon',
  size = 'medium',
  disabled = false,
  isRefreshing = false,
  showRealTime = true,
  onTraditionalRefresh,
}) => {
  const handleRealTimeRefresh = () => {
    if (pnrId) {
      webSocketService.requestPNRStatusCheck(pnrId);
    } else {
      webSocketService.requestAllPNRStatusCheck();
    }
  };

  const handleTraditionalRefresh = () => {
    if (onTraditionalRefresh) {
      onTraditionalRefresh();
    }
  };

  if (variant === 'button') {
    return (
      <>
        {showRealTime && (
          <Button
            variant="outlined"
            startIcon={<FlashOnIcon />}
            onClick={handleRealTimeRefresh}
            disabled={disabled || isRefreshing}
            size={size}
            color="secondary"
            sx={{ mr: 1 }}
          >
            Live Refresh
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={handleTraditionalRefresh}
          disabled={disabled || isRefreshing}
          size={size}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </>
    );
  }

  return (
    <>
      {showRealTime && (
        <Tooltip title="Live refresh (real-time)" arrow>
          <IconButton
            onClick={handleRealTimeRefresh}
            disabled={disabled || isRefreshing}
            size={size}
            color="secondary"
            sx={{ mr: 0.5 }}
          >
            <FlashOnIcon />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Manual refresh" arrow>
        <IconButton
          onClick={handleTraditionalRefresh}
          disabled={disabled || isRefreshing}
          size={size}
        >
          {isRefreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
        </IconButton>
      </Tooltip>
    </>
  );
};