import React from 'react';
import { Typography, Box } from '@mui/material';
import { ProfileManagement } from '../components/auth/ProfileManagement';

export const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Settings
      </Typography>
      <ProfileManagement />
    </Box>
  );
};