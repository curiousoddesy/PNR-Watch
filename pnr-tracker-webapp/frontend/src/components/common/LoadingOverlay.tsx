import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Backdrop,
  Paper,
} from '@mui/material';
import { Train as TrainIcon } from '@mui/icons-material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Loading...',
  transparent = false,
}) => {
  if (transparent) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: open ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1,
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Backdrop
      sx={{ 
        color: '#fff', 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}
      open={open}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          minWidth: 200,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <TrainIcon color="primary" />
          <CircularProgress size={24} />
        </Box>
        <Typography variant="body1" color="text.primary">
          {message}
        </Typography>
      </Paper>
    </Backdrop>
  );
};