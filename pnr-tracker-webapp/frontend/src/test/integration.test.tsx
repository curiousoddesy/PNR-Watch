import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import axios from 'axios';

// Components
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Dashboard } from '../pages/Dashboard';
import { AuthProvider } from '../contexts/AuthContext';
import { PNRProvider } from '../contexts/PNRContext';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Test theme
const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <AuthProvider>
            <PNRProvider>
              {children}
            </PNRProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Frontend Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock axios create
    mockedAxios.create = vi.fn(() => mockedAxios as any);
    mockedAxios.interceptors = {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    } as any;
  });

  describe('Authentication Flow', () => {
    it('should render login page for unauthenticated users', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should handle login form submission', async () => {
      const mockLoginResponse = {
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com'
          }
        }
      };

      mockedAxios.post = vi.fn().mockResolvedValue(mockLoginResponse);

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });

    it('should render registration form', () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      expect(screen.getByText(/sign up/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should handle registration form submission', async () => {
      const mockRegisterResponse = {
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: '1',
            name: 'New User',
            email: 'new@example.com'
          }
        }
      };

      mockedAxios.post = vi.fn().mockResolvedValue(mockRegisterResponse);

      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(nameInput, { target: { value: 'New User' } });
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', {
          name: 'New User',
          email: 'new@example.com',
          password: 'password123'
        });
      });
    });
  });

  describe('Dashboard Integration', () => {
    beforeEach(() => {
      // Mock authenticated state
      localStorage.setItem('authToken', 'mock-token');
      
      // Mock user data API call
      mockedAxios.get = vi.fn().mockImplementation((url) => {
        if (url === '/user/profile') {
          return Promise.resolve({
            data: {
              id: '1',
              name: 'Test User',
              email: 'test@example.com'
            }
          });
        }
        if (url === '/pnrs') {
          return Promise.resolve({
            data: [
              {
                id: '1',
                pnr: '1234567890',
                currentStatus: {
                  pnr: '1234567890',
                  from: 'Delhi',
                  to: 'Mumbai',
                  date: '2024-01-15',
                  status: 'Confirmed',
                  lastUpdated: new Date()
                }
              }
            ]
          });
        }
        if (url === '/notifications') {
          return Promise.resolve({
            data: []
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });
    });

    it('should render dashboard with PNR data', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Should show PNR data
      await waitFor(() => {
        expect(screen.getByText('1234567890')).toBeInTheDocument();
        expect(screen.getByText('Delhi')).toBeInTheDocument();
        expect(screen.getByText('Mumbai')).toBeInTheDocument();
      });
    });

    it('should handle PNR addition', async () => {
      const mockAddPNRResponse = {
        data: {
          id: '2',
          pnr: '9876543210',
          currentStatus: {
            pnr: '9876543210',
            from: 'Chennai',
            to: 'Bangalore',
            date: '2024-01-20',
            status: 'Waitlist',
            lastUpdated: new Date()
          }
        }
      };

      mockedAxios.post = vi.fn().mockResolvedValue(mockAddPNRResponse);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/add pnr/i)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/add pnr/i);
      fireEvent.click(addButton);

      // Should open add PNR dialog/form
      await waitFor(() => {
        const pnrInput = screen.getByLabelText(/pnr number/i);
        expect(pnrInput).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error messages for failed API calls', async () => {
      mockedAxios.post = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid credentials' }
        }
      });

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error('Network Error'));

      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      render(
        <TestWrapper>
          <Register />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should validate PNR format', async () => {
      // Mock authenticated state
      localStorage.setItem('authToken', 'mock-token');
      
      mockedAxios.get = vi.fn().mockResolvedValue({
        data: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com'
        }
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        const addButton = screen.getByText(/add pnr/i);
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        const pnrInput = screen.getByLabelText(/pnr number/i);
        const submitButton = screen.getByRole('button', { name: /add/i });

        fireEvent.change(pnrInput, { target: { value: '123' } }); // Invalid PNR
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/pnr must be 10 digits/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile-friendly layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should render mobile navigation
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <Login />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);

      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(document.activeElement).toBe(passwordInput);
    });
  });

  describe('WebSocket Integration', () => {
    it('should establish WebSocket connection', () => {
      // Mock WebSocket
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
        send: vi.fn()
      };

      global.WebSocket = vi.fn(() => mockWebSocket) as any;

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:3001');
    });
  });
});