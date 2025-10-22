import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
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
  Link,
  Container,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';
import * as yup from 'yup';
import { apiClient } from '../services/api';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const resetPasswordValidationSchema = yup.object({
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordValidationSchema),
    mode: 'onChange',
  });

  const onSubmit = async (values: ResetPasswordFormData) => {
    if (!token) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      await apiClient.resetPassword(token, values.password);
      setIsSuccess(true);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (!token) {
    return null; // Will redirect via useEffect
  }

  if (isSuccess) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Card sx={{ width: '100%', maxWidth: 400 }}>
            <CardContent sx={{ p: 4 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <Typography component="h1" variant="h4" gutterBottom>
                  Password Reset Successful
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  Your password has been successfully reset. You can now sign in with your new password.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  fullWidth
                >
                  Sign In
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardContent sx={{ p: 4 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Typography component="h1" variant="h4" gutterBottom>
                Reset Password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Enter your new password below.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                sx={{ width: '100%' }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  {...register('password')}
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
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
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  error={Boolean(errors.confirmPassword)}
                  helperText={errors.confirmPassword?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={handleToggleConfirmPasswordVisibility}
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
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isSubmitting || !isValid}
                  startIcon={isSubmitting && <CircularProgress size={20} />}
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component={RouterLink}
                    to="/login"
                    variant="body2"
                  >
                    Back to Sign In
                  </Link>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};