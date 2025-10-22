import * as yup from 'yup';

// PNR validation schema
export const pnrValidationSchema = yup.object({
  pnr: yup
    .string()
    .required('PNR is required')
    .matches(/^\d{10}$/, 'PNR must be exactly 10 digits')
    .test('not-all-same', 'PNR cannot be all same digits', (value) => {
      if (!value) return true;
      return !value.split('').every(digit => digit === value[0]);
    }),
});

// User registration validation schema
export const registrationValidationSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
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
  acceptTerms: yup
    .boolean()
    .required('You must accept the terms and conditions')
    .oneOf([true], 'You must accept the terms and conditions'),
});

// Login validation schema
export const loginValidationSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required'),
});

// Password reset validation schema
export const passwordResetValidationSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
});

// Profile update validation schema
export const profileUpdateValidationSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
});

// Utility function to validate PNR format
export const validatePNRFormat = (pnr: string): boolean => {
  return /^\d{10}$/.test(pnr) && !pnr.split('').every(digit => digit === pnr[0]);
};

// Utility function to format PNR for display
export const formatPNR = (pnr: string): string => {
  if (pnr.length === 10) {
    return `${pnr.slice(0, 3)}-${pnr.slice(3, 7)}-${pnr.slice(7)}`;
  }
  return pnr;
};