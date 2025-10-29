import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Tooltip,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeStatusIndicatorProps {
  isChecking: boolean;
  lastUpdated: string;
  hasError?: boolean;
  errorMessage?: string;
  onManualRefresh?: () => void;
  showManualRefresh?: boolean;
}

export const RealTimeStatusIndicator: React.FC<RealTimeStatusIndicatorProps> = ({
  isChecking,
  lastUpdated,
  hasError = false,
  errorMessage,
  onManualRefresh,
  showManualRefresh = true,
}) => {
  const getStatusIcon = () => {
    if (isChecking) {
      return <CircularProgress size={16} />;
    }
    if (hasError) {
      return <ErrorIcon color="error" />;
    }
    return <CheckCircleIcon color="success" />;
  };

  const getStatusText = () => {
    if (isChecking) {
      return 'Checking...';
    }
    if (hasError) {
      return 'Check failed';
    }
    return 'Up to date';
  };

  const getStatusColor = (): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (isChecking) {
      return 'info';
    }
    if (hasError) {
      return 'error';
    }
    return 'success';
  };

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Tooltip 
        title={
          hasError && errorMessage 
            ? `Error: ${errorMessage}` 
            : `Last updated ${formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}`
        }
        arrow
      >
        <Chip
          icon={getStatusIcon()}
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          variant="outlined"
        />
      </Tooltip>

      {showManualRefresh && onManualRefresh && (
        <Tooltip title="Refresh now" arrow>
          <IconButton
            size="small"
            onClick={onManualRefresh}
            disabled={isChecking}
            sx={{ ml: 0.5 }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Box display="flex" alignItems="center" gap={0.5}>
        <ScheduleIcon fontSize="small" color="action" />
        <Typography variant="caption" color="text.secondary">
          {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
        </Typography>
      </Box>
    </Box>
  );
};