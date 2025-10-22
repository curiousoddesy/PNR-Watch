import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { registrationValidationSchema } from '../utils/validation';
import { UserRegistration } from '../types';

interface RegistrationFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, error, clearError, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const form = useForm<RegistrationFormData>({
    resolver: yupResolver(registrationValidationSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const { register: registerField, handleSubmit, formState: { errors, isValid } } = form;

  const onSubmit = async (values: RegistrationFormData) => {
    try {
      setIsSubmitting(true);
      const { confirmPassword, acceptTerms, ...registrationData } = values;
      await register(registrationData as UserRegistration);
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

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
                Sign Up
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your PNR Tracker account
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
                  label="Full Name"
                  autoComplete="name"
                  autoFocus
                  {...registerField('name')}
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
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
                  autoComplete="email"
                  {...registerField('email')}
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
                  autoComplete="new-password"
                  {...registerField('password')}
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
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  {...registerField('confirmPassword')}
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
                <FormControlLabel
                  control={
                    <Checkbox
                      {...registerField('acceptTerms')}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      I accept the{' '}
                      <Link href="#" underline="hover">
                        Terms and Conditions
                      </Link>{' '}
                      and{' '}
                      <Link href="#" underline="hover">
                        Privacy Policy
                      </Link>
                    </Typography>
                  }
                  sx={{ mt: 1 }}
                />
                {errors.acceptTerms && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
                    {errors.acceptTerms?.message}
                  </Typography>
                )}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isSubmitting || !isValid}
                  startIcon={isSubmitting && <CircularProgress size={20} />}
                >
                  {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                </Button>
                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component={RouterLink}
                    to="/login"
                    variant="body2"
                  >
                    Already have an account? Sign In
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