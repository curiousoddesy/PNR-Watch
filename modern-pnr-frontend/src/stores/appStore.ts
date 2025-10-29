import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { ConnectionState, RealtimeEvent, UserPresence } from '../types'

interface ThemeState {
  mode: 'light' | 'dark' | 'auto'
  customColors: Record<string, string>
  accessibility: {
    reducedMotion: boolean
    highContrast: boolean
    fontSize: 'small' | 'medium' | 'large'
  }
}

interface ConnectivityState {
  isOnline: boolean
  isConnected: boolean
  lastSyncTime: number | null
}

interface RealtimeState {
  connection: ConnectionState
  events: RealtimeEvent[]
  userPresence: Map<string, UserPresence>
  isSubscribed: boolean
}

interface AppState {
  theme: ThemeState
  connectivity: ConnectivityState
  realtime: RealtimeState
  // Actions
  setThemeMode: (mode: ThemeState['mode']) => void
  setAccessibilityPreference: (key: keyof ThemeState['accessibility'], value: any) => void
  setConnectivity: (connectivity: Partial<ConnectivityState>) => void
  setConnectionState: (connection: ConnectionState) => void
  addRealtimeEvent: (event: RealtimeEvent) => void
  updateUserPresence: (userId: string, presence: UserPresence) => void
  setSubscriptionStatus: (isSubscribed: boolean) => void
  clearRealtimeEvents: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        theme: {
          mode: 'auto',
          customColors: {},
          accessibility: {
            reducedMotion: false,
            highContrast: false,
            fontSize: 'medium',
          },
        },
        connectivity: {
          isOnline: navigator.onLine,
          isConnected: false,
          lastSyncTime: null,
        },
        realtime: {
          connection: {
            isConnected: false,
            isConnecting: false,
            connectionId: null,
            lastConnectedAt: null,
            reconnectAttempts: 0,
            error: null,
          },
          events: [],
          userPresence: new Map(),
          isSubscribed: false,
        },
        setThemeMode: (mode) =>
          set((state) => ({
            theme: { ...state.theme, mode },
          })),
        setAccessibilityPreference: (key, value) =>
          set((state) => ({
            theme: {
              ...state.theme,
              accessibility: { ...state.theme.accessibility, [key]: value },
            },
          })),
        setConnectivity: (connectivity) =>
          set((state) => ({
            connectivity: { ...state.connectivity, ...connectivity },
          })),
        setConnectionState: (connection) =>
          set((state) => ({
            realtime: { ...state.realtime, connection },
          })),
        addRealtimeEvent: (event) =>
          set((state) => ({
            realtime: {
              ...state.realtime,
              events: [...state.realtime.events.slice(-99), event], // Keep last 100 events
            },
          })),
        updateUserPresence: (userId, presence) =>
          set((state) => {
            const newPresence = new Map(state.realtime.userPresence)
            newPresence.set(userId, presence)
            return {
              realtime: { ...state.realtime, userPresence: newPresence },
            }
          }),
        setSubscriptionStatus: (isSubscribed) =>
          set((state) => ({
            realtime: { ...state.realtime, isSubscribed },
          })),
        clearRealtimeEvents: () =>
          set((state) => ({
            realtime: { ...state.realtime, events: [] },
          })),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({ theme: state.theme }),
      }
    ),
    { name: 'AppStore' }
  )
)