import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  theme: {
    mode: 'light' | 'dark' | 'auto'
  }
  isOnline: boolean

  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void
  setOnline: (isOnline: boolean) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        theme: { mode: 'auto' },
        isOnline: navigator.onLine,

        setThemeMode: (mode) => set({ theme: { mode } }),
        setOnline: (isOnline) => set({ isOnline }),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({ theme: state.theme }),
      }
    ),
    { name: 'AppStore' }
  )
)
