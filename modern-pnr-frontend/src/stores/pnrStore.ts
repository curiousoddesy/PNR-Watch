import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { PNR, PNRStatus } from '../types'

interface PNRState {
  pnrs: PNR[]
  recentQueries: string[]
  isLoading: boolean
  error: string | null

  addPNR: (pnr: PNR) => void
  removePNR: (id: string) => void
  updatePNRStatus: (id: string, status: PNRStatus) => void
  addToRecent: (pnrNumber: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const usePNRStore = create<PNRState>()(
  devtools(
    persist(
      (set) => ({
        pnrs: [],
        recentQueries: [],
        isLoading: false,
        error: null,

        addPNR: (pnr) => set((state) => ({
          pnrs: [...state.pnrs.filter(p => p.id !== pnr.id), pnr]
        })),

        removePNR: (id) => set((state) => ({
          pnrs: state.pnrs.filter(pnr => pnr.id !== id)
        })),

        updatePNRStatus: (id, status) => set((state) => ({
          pnrs: state.pnrs.map(pnr =>
            pnr.id === id ? { ...pnr, status, updatedAt: new Date().toISOString() } : pnr
          )
        })),

        addToRecent: (pnrNumber) => set((state) => ({
          recentQueries: [
            pnrNumber,
            ...state.recentQueries.filter(q => q !== pnrNumber)
          ].slice(0, 4)
        })),

        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error }),
      }),
      {
        name: 'pnr-store',
        partialize: (state) => ({
          pnrs: state.pnrs,
          recentQueries: state.recentQueries,
        }),
      }
    ),
    { name: 'PNRStore' }
  )
)
