import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { PNR, PNRStatus } from '../types'

interface PNRFilters {
  status?: string
  trainNumber?: string
  dateRange?: {
    start: string
    end: string
  }
  searchTerm?: string
}

interface PNRSortConfig {
  field: keyof PNR
  direction: 'asc' | 'desc'
}

interface PNRState {
  pnrs: PNR[]
  selectedPNRs: Set<string>
  filters: PNRFilters
  sortConfig: PNRSortConfig | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setPNRs: (pnrs: PNR[]) => void
  addPNR: (pnr: PNR) => void
  updatePNR: (id: string, updates: Partial<PNR>) => void
  removePNR: (id: string) => void
  updatePNRStatus: (id: string, status: PNRStatus) => void
  
  // Selection
  selectPNR: (id: string) => void
  deselectPNR: (id: string) => void
  selectAllPNRs: () => void
  clearSelection: () => void
  togglePNRSelection: (id: string) => void
  
  // Filtering and Sorting
  setFilters: (filters: Partial<PNRFilters>) => void
  clearFilters: () => void
  setSortConfig: (config: PNRSortConfig | null) => void
  
  // Loading states
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Bulk operations
  bulkUpdateStatus: (ids: string[], status: string) => void
  bulkDelete: (ids: string[]) => void
}

export const usePNRStore = create<PNRState>()(
  devtools(
    persist(
      (set, get) => ({
        pnrs: [],
        selectedPNRs: new Set(),
        filters: {},
        sortConfig: null,
        isLoading: false,
        error: null,
        
        setPNRs: (pnrs) => set({ pnrs }),
        
        addPNR: (pnr) => set((state) => ({
          pnrs: [...state.pnrs, pnr]
        })),
        
        updatePNR: (id, updates) => set((state) => ({
          pnrs: state.pnrs.map(pnr => 
            pnr.id === id ? { ...pnr, ...updates } : pnr
          )
        })),
        
        removePNR: (id) => set((state) => ({
          pnrs: state.pnrs.filter(pnr => pnr.id !== id),
          selectedPNRs: new Set([...state.selectedPNRs].filter(selectedId => selectedId !== id))
        })),
        
        updatePNRStatus: (id, status) => set((state) => ({
          pnrs: state.pnrs.map(pnr => 
            pnr.id === id ? { ...pnr, status, updatedAt: new Date().toISOString() } : pnr
          )
        })),
        
        selectPNR: (id) => set((state) => ({
          selectedPNRs: new Set([...state.selectedPNRs, id])
        })),
        
        deselectPNR: (id) => set((state) => {
          const newSelection = new Set(state.selectedPNRs)
          newSelection.delete(id)
          return { selectedPNRs: newSelection }
        }),
        
        selectAllPNRs: () => set((state) => ({
          selectedPNRs: new Set(state.pnrs.map(pnr => pnr.id))
        })),
        
        clearSelection: () => set({ selectedPNRs: new Set() }),
        
        togglePNRSelection: (id) => set((state) => {
          const newSelection = new Set(state.selectedPNRs)
          if (newSelection.has(id)) {
            newSelection.delete(id)
          } else {
            newSelection.add(id)
          }
          return { selectedPNRs: newSelection }
        }),
        
        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters }
        })),
        
        clearFilters: () => set({ filters: {} }),
        
        setSortConfig: (config) => set({ sortConfig: config }),
        
        setLoading: (loading) => set({ isLoading: loading }),
        
        setError: (error) => set({ error }),
        
        bulkUpdateStatus: (ids, status) => set((state) => ({
          pnrs: state.pnrs.map(pnr => 
            ids.includes(pnr.id) 
              ? { 
                  ...pnr, 
                  status: { ...pnr.status, currentStatus: status },
                  updatedAt: new Date().toISOString() 
                } 
              : pnr
          )
        })),
        
        bulkDelete: (ids) => set((state) => ({
          pnrs: state.pnrs.filter(pnr => !ids.includes(pnr.id)),
          selectedPNRs: new Set([...state.selectedPNRs].filter(id => !ids.includes(id)))
        }))
      }),
      {
        name: 'pnr-store',
        partialize: (state) => ({ 
          pnrs: state.pnrs,
          filters: state.filters,
          sortConfig: state.sortConfig
        }),
      }
    ),
    { name: 'PNRStore' }
  )
)