import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  FormGroup,
  Chip,
  Stack,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Person, Save, Lock } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { profileUpdateValidationSchema } from '../../utils/validation';
import { apiClient } from '../../services/api';
import { NotificationSettings } from '../../types';
import * as yup from 'yup';

interface ProfileFormData {
  name: string;
  email: string;
}

interface PasswordChangeFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const passwordChangeValidationSchema = yup.object({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

export const ProfileManagement: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    user?.notificationPreferences || {
      emailEnabled: true,
      pushEnabled: false,
      inAppEnabled: true,
      statusTypes: ['confirmation', 'waitlist_movement', 'cancellation'],
    }
  );

  const profileForm = useForm<ProfileFormData>({
    resolver: yupResolver(profileUpdateValidationSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
    mode: 'onChange',
  });

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: yupResolver(passwordChangeValidationSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const onProfileSubmit = async (values: ProfileFormData) => {
    try {
      setIsUpdatingProfile(true);
      setProfileError(null);
      setProfileSuccess(null);
      await apiClient.updateProfile(values);
      await refreshUser();
      setProfileSuccess('Profile updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile';
      setProfileError(message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (values: PasswordChangeFormData) => {
    try {
      setIsChangingPassword(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      await apiClient.changePassword(values.currentPassword, values.newPassword);
      setPasswordSuccess('Password changed successfully');
      passwordForm.reset();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password';
      setPasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationSettingsChange = async (settings: NotificationSettings) => {
    try {
      setIsUpdatingNotifications(true);
      setNotificationError(null);
      setNotificationSuccess(null);
      await apiClient.updateNotificationSettings(settings);
      setNotificationSettings(settings);
      await refreshUser();
      setNotificationSuccess('Notification preferences updated successfully');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update notification settings';
      setNotificationError(message);
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const handleNotificationToggle = (field: keyof NotificationSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newSettings = {
      ...notificationSettings,
      [field]: event.target.checked,
    };
    setNotificationSettings(newSettings);
    handleNotificationSettingsChange(newSettings);
  };

  const handleStatusTypeToggle = (statusType: string) => {
    const currentTypes = notificationSettings.statusTypes;
    const newTypes = currentTypes.includes(statusType)
      ? currentTypes.filter(type => type !== statusType)
      : [...currentTypes, statusType];
    
    const newSettings = {
      ...notificationSettings,
      statusTypes: newTypes,
    };
    setNotificationSettings(newSettings);
    handleNotificationSettingsChange(newSettings);
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      {/* Profile Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          
          {profileError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {profileError}
            </Alert>
          )}
          
          {profileSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {profileSuccess}
            </Alert>
          )}

          <Box component="form" onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Full Name"
              {...profileForm.register('name')}
              error={Boolean(profileForm.formState.errors.name)}
              helperText={profileForm.formState.errors.name?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              {...profileForm.register('email')}
              error={Boolean(profileForm.formState.errors.email)}
              helperText={profileForm.formState.errors.email?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 2 }}
              disabled={isUpdatingProfile || !profileForm.formState.isValid}
              startIcon={isUpdatingProfile ? <CircularProgress size={20} /> : <Save />}
            >
              {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>
          
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          
          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {passwordSuccess}
            </Alert>
          )}

          <Box component="form" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Current Password"
              type={showCurrentPassword ? 'text' : 'password'}
              {...passwordForm.register('currentPassword')}
              error={Boolean(passwordForm.formState.errors.currentPassword)}
              helperText={passwordForm.formState.errors.currentPassword?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      edge="end"
                    >
                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="New Password"
              type={showNewPassword ? 'text' : 'password'}
              {...passwordForm.register('newPassword')}
              error={Boolean(passwordForm.formState.errors.newPassword)}
              helperText={passwordForm.formState.errors.newPassword?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              {...passwordForm.register('confirmPassword')}
              error={Boolean(passwordForm.formState.errors.confirmPassword)}
              helperText={passwordForm.formState.errors.confirmPassword?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 2 }}
              disabled={isChangingPassword || !passwordForm.formState.isValid}
              startIcon={isChangingPassword ? <CircularProgress size={20} /> : <Lock />}
            >
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          
          {notificationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {notificationError}
            </Alert>
          )}
          
          {notificationSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {notificationSuccess}
            </Alert>
          )}

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.emailEnabled}
                  onChange={handleNotificationToggle('emailEnabled')}
                  disabled={isUpdatingNotifications}
                />
              }
              label="Email Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.pushEnabled}
                  onChange={handleNotificationToggle('pushEnabled')}
                  disabled={isUpdatingNotifications}
                />
              }
              label="Push Notifications"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={notificationSettings.inAppEnabled}
                  onChange={handleNotificationToggle('inAppEnabled')}
                  disabled={isUpdatingNotifications}
                />
              }
              label="In-App Notifications"
            />
          </FormGroup>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Notification Types
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which status changes you want to be notified about:
          </Typography>
          
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {[
              { key: 'confirmation', label: 'Confirmation' },
              { key: 'waitlist_movement', label: 'Waitlist Movement' },
              { key: 'cancellation', label: 'Cancellation' },
            ].map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                onClick={() => handleStatusTypeToggle(key)}
                color={notificationSettings.statusTypes.includes(key) ? 'primary' : 'default'}
                variant={notificationSettings.statusTypes.includes(key) ? 'filled' : 'outlined'}
                disabled={isUpdatingNotifications}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};