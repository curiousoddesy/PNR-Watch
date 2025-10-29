import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Train as TrainIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import { pnrValidationSchema } from '../../utils/validation';
import { usePNR } from '../../contexts/PNRContext';

interface AddPNRFormProps {
  onSuccess?: () => void;
}

export const AddPNRForm: React.FC<AddPNRFormProps> = ({ onSuccess }) => {
  const { addPNR, error, clearError } = usePNR();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      pnr: '',
    },
    validationSchema: pnrValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      setIsSubmitting(true);
      setSuccessMessage(null);
      clearError();

      try {
        await addPNR(values.pnr);
        setSuccessMessage(`PNR ${values.pnr} has been added successfully!`);
        resetForm();
        onSuccess?.();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (error) {
        // Error is handled by the PNR context
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handlePNRChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 10) {
      formik.setFieldValue('pnr', value);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrainIcon color="primary" />
        Add New PNR
      </Typography>
      
      <Box component="form" onSubmit={formik.handleSubmit}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        <Box display="flex" gap={2} alignItems="flex-start">
          <TextField
            fullWidth
            id="pnr"
            name="pnr"
            label="PNR Number"
            placeholder="Enter 10-digit PNR"
            value={formik.values.pnr}
            onChange={handlePNRChange}
            onBlur={formik.handleBlur}
            error={formik.touched.pnr && Boolean(formik.errors.pnr)}
            helperText={formik.touched.pnr && formik.errors.pnr}
            disabled={isSubmitting}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TrainIcon color="action" />
                </InputAdornment>
              ),
            }}
            inputProps={{
              maxLength: 10,
              pattern: '[0-9]*',
              inputMode: 'numeric',
            }}
          />
          
          <Button
            type="submit"
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <AddIcon />}
            disabled={isSubmitting || !formik.isValid || !formik.values.pnr}
            sx={{ minWidth: 120, height: 56 }}
          >
            {isSubmitting ? 'Adding...' : 'Add PNR'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Enter a 10-digit PNR number to start tracking its status
        </Typography>
      </Box>
    </Paper>
  );
};