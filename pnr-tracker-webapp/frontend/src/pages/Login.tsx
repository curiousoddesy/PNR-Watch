import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
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
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { loginValidationSchema } from '../utils/validation';
import { LoginCredentials } from '../types';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error, clearError, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginCredentials>({
    resolver: yupResolver(loginValidationSchema),
    mode: 'onChange',
  });

  const onSubmit = async (values: LoginCredentials) => {
    try {
      setIsSubmitting(true);
      await login(values);
      // Navigation will be handled by the useEffect above
    } catch (error) {
      // Error is handled by the AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
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
                Sign In
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Welcome back to PNR Tracker
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
                  id="email"
                  label="Email Address"
                  autoComplete="email"
                  autoFocus
                  {...register('email')}
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isSubmitting || !isValid}
                  startIcon={isSubmitting && <CircularProgress size={20} />}
                >
                  {isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component={RouterLink}
                    to="/forgot-password"
                    variant="body2"
                    sx={{ display: 'block', mb: 1 }}
                  >
                    Forgot your password?
                  </Link>
                  <Link
                    component={RouterLink}
                    to="/register"
                    variant="body2"
                  >
                    Don't have an account? Sign Up
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