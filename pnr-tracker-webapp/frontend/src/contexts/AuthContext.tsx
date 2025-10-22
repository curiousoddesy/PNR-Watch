import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthResult, LoginCredentials, UserRegistration } from '../types';
import { apiClient } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: UserRegistration) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          dispatch({ type: 'AUTH_START' });
          const user = await apiClient.getCurrentUser();
          dispatch({ type: 'AUTH_SUCCESS', payload: user });
        } catch (error) {
          // Token might be expired, try to refresh
          try {
            await apiClient.refreshToken();
            const user = await apiClient.getCurrentUser();
            dispatch({ type: 'AUTH_SUCCESS', payload: user });
          } catch (refreshError) {
            apiClient.clearToken();
            dispatch({ type: 'AUTH_ERROR', payload: 'Session expired' });
          }
        }
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: 'No authentication token' });
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      const result: AuthResult = await apiClient.login(credentials);
      dispatch({ type: 'AUTH_SUCCESS', payload: result.user });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  };

  const register = async (userData: UserRegistration): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      const result: AuthResult = await apiClient.register(userData);
      dispatch({ type: 'AUTH_SUCCESS', payload: result.user });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const user = await apiClient.getCurrentUser();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to refresh user data';
      dispatch({ type: 'AUTH_ERROR', payload: message });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};