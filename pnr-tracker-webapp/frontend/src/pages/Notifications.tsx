import React from 'react';
import { Typography, Box } from '@mui/material';

export const Notifications: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Notifications
      </Typography>
      <Typography variant="body1">
        Notification interface will be implemented in task 8.5
      </Typography>
    </Box>
  );
};