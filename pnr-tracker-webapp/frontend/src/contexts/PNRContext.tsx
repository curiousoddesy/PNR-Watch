import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { TrackedPNR, PNRStatusResult } from '../types';
import { apiClient } from '../services/api';
import { webSocketService } from '../services/websocket';

interface PNRState {
  pnrs: TrackedPNR[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  checkingPNRs: Set<string>;
}

type PNRAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: TrackedPNR[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_PNR'; payload: TrackedPNR }
  | { type: 'REMOVE_PNR'; payload: string }
  | { type: 'UPDATE_PNR_STATUS'; payload: { pnrId: string; status: PNRStatusResult } }
  | { type: 'SET_PNR_CHECKING'; payload: string }
  | { type: 'SET_PNR_ERROR'; payload: { pnrId: string; error: string } }
  | { type: 'CLEAR_ERROR' };

const initialState: PNRState = {
  pnrs: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  checkingPNRs: new Set(),
};

const pnrReducer = (state: PNRState, action: PNRAction): PNRState => {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        pnrs: action.payload,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case 'ADD_PNR':
      return {
        ...state,
        pnrs: [...state.pnrs, action.payload],
        lastUpdated: new Date().toISOString(),
      };
    case 'REMOVE_PNR':
      return {
        ...state,
        pnrs: state.pnrs.filter(pnr => pnr.id !== action.payload),
        lastUpdated: new Date().toISOString(),
      };
    case 'UPDATE_PNR_STATUS':
      const newCheckingPNRs = new Set(state.checkingPNRs);
      newCheckingPNRs.delete(action.payload.pnrId);
      return {
        ...state,
        pnrs: state.pnrs.map(pnr =>
          pnr.id === action.payload.pnrId
            ? { ...pnr, currentStatus: action.payload.status }
            : pnr
        ),
        checkingPNRs: newCheckingPNRs,
        lastUpdated: new Date().toISOString(),
      };
    case 'SET_PNR_CHECKING':
      return {
        ...state,
        checkingPNRs: new Set(state.checkingPNRs).add(action.payload),
      };
    case 'SET_PNR_ERROR':
      const errorCheckingPNRs = new Set(state.checkingPNRs);
      errorCheckingPNRs.delete(action.payload.pnrId);
      return {
        ...state,
        pnrs: state.pnrs.map(pnr =>
          pnr.id === action.payload.pnrId
            ? { 
                ...pnr, 
                currentStatus: { 
                  ...pnr.currentStatus, 
                  error: action.payload.error,
                  lastUpdated: new Date().toISOString()
                } 
              }
            : pnr
        ),
        checkingPNRs: errorCheckingPNRs,
        lastUpdated: new Date().toISOString(),
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

interface PNRContextType extends PNRState {
  fetchPNRs: () => Promise<void>;
  addPNR: (pnr: string) => Promise<void>;
  removePNR: (pnrId: string) => Promise<void>;
  checkPNRStatus: (pnrId: string) => Promise<void>;
  checkAllPNRs: () => Promise<void>;
  clearError: () => void;
}

const PNRContext = createContext<PNRContextType | undefined>(undefined);

interface PNRProviderProps {
  children: ReactNode;
}

export const PNRProvider: React.FC<PNRProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(pnrReducer, initialState);

  // Set up WebSocket event listeners
  useEffect(() => {
    const handlePNRStatusUpdated = (data: { pnrId: string; status: PNRStatusResult }) => {
      dispatch({ type: 'UPDATE_PNR_STATUS', payload: data });
    };

    const handlePNRStatusChecking = (data: { pnrId: string }) => {
      dispatch({ type: 'SET_PNR_CHECKING', payload: data.pnrId });
    };

    const handlePNRStatusError = (data: { pnrId: string; error: string }) => {
      dispatch({ type: 'SET_PNR_ERROR', payload: data });
    };

    const handlePNRAdded = (data: TrackedPNR) => {
      dispatch({ type: 'ADD_PNR', payload: data });
    };

    const handlePNRRemoved = (data: { pnrId: string }) => {
      dispatch({ type: 'REMOVE_PNR', payload: data.pnrId });
    };

    // Subscribe to WebSocket events
    webSocketService.on('pnr-status-updated', handlePNRStatusUpdated);
    webSocketService.on('pnr-status-checking', handlePNRStatusChecking);
    webSocketService.on('pnr-status-error', handlePNRStatusError);
    webSocketService.on('pnr-added', handlePNRAdded);
    webSocketService.on('pnr-removed', handlePNRRemoved);

    // Cleanup on unmount
    return () => {
      webSocketService.off('pnr-status-updated', handlePNRStatusUpdated);
      webSocketService.off('pnr-status-checking', handlePNRStatusChecking);
      webSocketService.off('pnr-status-error', handlePNRStatusError);
      webSocketService.off('pnr-added', handlePNRAdded);
      webSocketService.off('pnr-removed', handlePNRRemoved);
    };
  }, []);

  const fetchPNRs = async (): Promise<void> => {
    try {
      dispatch({ type: 'FETCH_START' });
      const pnrs = await apiClient.getPNRs();
      dispatch({ type: 'FETCH_SUCCESS', payload: pnrs });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch PNRs';
      dispatch({ type: 'FETCH_ERROR', payload: message });
      throw error;
    }
  };

  const addPNR = async (pnr: string): Promise<void> => {
    try {
      const newPNR = await apiClient.addPNR(pnr);
      dispatch({ type: 'ADD_PNR', payload: newPNR });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add PNR';
      dispatch({ type: 'FETCH_ERROR', payload: message });
      throw error;
    }
  };

  const removePNR = async (pnrId: string): Promise<void> => {
    try {
      await apiClient.removePNR(pnrId);
      dispatch({ type: 'REMOVE_PNR', payload: pnrId });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove PNR';
      dispatch({ type: 'FETCH_ERROR', payload: message });
      throw error;
    }
  };

  const checkPNRStatus = async (pnrId: string): Promise<void> => {
    try {
      const status = await apiClient.checkPNRStatus(pnrId);
      dispatch({ type: 'UPDATE_PNR_STATUS', payload: { pnrId, status } });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to check PNR status';
      dispatch({ type: 'FETCH_ERROR', payload: message });
      throw error;
    }
  };

  const checkAllPNRs = async (): Promise<void> => {
    try {
      dispatch({ type: 'FETCH_START' });
      const statuses = await apiClient.checkAllPNRs();
      
      // Update each PNR with its new status
      statuses.forEach(status => {
        const pnr = state.pnrs.find(p => p.pnr === status.pnr);
        if (pnr) {
          dispatch({ type: 'UPDATE_PNR_STATUS', payload: { pnrId: pnr.id, status } });
        }
      });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to check all PNRs';
      dispatch({ type: 'FETCH_ERROR', payload: message });
      throw error;
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: PNRContextType = {
    ...state,
    fetchPNRs,
    addPNR,
    removePNR,
    checkPNRStatus,
    checkAllPNRs,
    clearError,
  };

  return <PNRContext.Provider value={value}>{children}</PNRContext.Provider>;
};

export const usePNR = (): PNRContextType => {
  const context = useContext(PNRContext);
  if (context === undefined) {
    throw new Error('usePNR must be used within a PNRProvider');
  }
  return context;
};