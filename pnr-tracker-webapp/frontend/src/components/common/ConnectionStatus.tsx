import React from 'react';
import {
  Box,
  Chip,
  Tooltip,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useWebSocketConnection } from '../../hooks/useWebSocket';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionError } = useWebSocketConnection();
  const [showError, setShowError] = React.useState(false);

  React.useEffect(() => {
    if (connectionError) {
      setShowError(true);
    }
  }, [connectionError]);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  return (
    <>
      <Tooltip 
        title={isConnected ? 'Real-time updates active' : 'Connecting to server...'}
        arrow
      >
        <Chip
          icon={isConnected ? <WifiIcon /> : <WifiOffIcon />}
          label={isConnected ? 'Live' : 'Offline'}
          color={isConnected ? 'success' : 'warning'}
          size="small"
          variant="outlined"
          sx={{
            '& .MuiChip-icon': {
              animation: !isConnected ? 'pulse 2s infinite' : 'none',
            },
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 },
            },
          }}
        />
      </Tooltip>

      <Snackbar
        open={showError && !!connectionError}
        autoHideDuration={null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          action={
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton
                size="small"
                color="inherit"
                onClick={handleRetry}
                title="Retry connection"
              >
                <RefreshIcon />
              </IconButton>
              <IconButton
                size="small"
                color="inherit"
                onClick={handleCloseError}
                title="Dismiss"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          }
        >
          Connection lost: {connectionError}
        </Alert>
      </Snackbar>
    </>
  );
};