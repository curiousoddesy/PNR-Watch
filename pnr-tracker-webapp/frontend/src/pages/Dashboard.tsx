import React from 'react';
import { Typography, Box } from '@mui/material';

export const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1">
        Welcome to your PNR tracking dashboard. This page will show an overview of your tracked PNRs and recent notifications.
      </Typography>
    </Box>
  );
};