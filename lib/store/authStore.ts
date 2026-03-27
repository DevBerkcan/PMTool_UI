import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: string
  tenantId: string
}

export type AuthProvider = 'local' | 'entra'

interface AuthState {
  token: string | null
  user: User | null
  authProvider: AuthProvider | null
  isAuthenticated: boolean
  hasHydrated: boolean
  setHydrated: (value: boolean) => void
  login: (token: string, user: User, authProvider?: AuthProvider) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      authProvider: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHydrated: (value) => set({ hasHydrated: value }),
      login: (token, user, authProvider = 'local') => set({ token, user, authProvider, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, authProvider: null, isAuthenticated: false }),
    }),
    {
      name: 'pm-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        authProvider: state.authProvider,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
)
