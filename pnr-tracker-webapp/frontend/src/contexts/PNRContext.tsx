import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { TrackedPNR, PNRStatusResult } from '../types';
import { apiClient } from '../services/api';

interface PNRState {
  pnrs: TrackedPNR[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

type PNRAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: TrackedPNR[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_PNR'; payload: TrackedPNR }
  | { type: 'REMOVE_PNR'; payload: string }
  | { type: 'UPDATE_PNR_STATUS'; payload: { pnrId: string; status: PNRStatusResult } }
  | { type: 'CLEAR_ERROR' };

const initialState: PNRState = {
  pnrs: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
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
      return {
        ...state,
        pnrs: state.pnrs.map(pnr =>
          pnr.id === action.payload.pnrId
            ? { ...pnr, currentStatus: action.payload.status }
            : pnr
        ),
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