import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  CircularProgress,
} from '@mui/material';
import { Email, ArrowBack } from '@mui/icons-material';
import { passwordResetValidationSchema } from '../utils/validation';
import { apiClient } from '../services/api';

interface ForgotPasswordFormData {
  email: string;
}

export const ForgotPassword: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(passwordResetValidationSchema),
    mode: 'onChange',
  });

  const onSubmit = async (values: ForgotPasswordFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await apiClient.requestPasswordReset(values.email);
      setIsSuccess(true);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  Check Your Email
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  We've sent a password reset link to{' '}
                  <strong>{getValues('email')}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Please check your email and click the link to reset your password.
                  If you don't see the email, check your spam folder.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="contained"
                  startIcon={<ArrowBack />}
                  fullWidth
                >
                  Back to Sign In
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
                Enter your email address and we'll send you a link to reset your password.
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
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isSubmitting || !isValid}
                  startIcon={isSubmitting && <CircularProgress size={20} />}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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