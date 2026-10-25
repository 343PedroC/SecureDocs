import { create } from 'zustand'

export type Role =
  | 'DIRECTOR'
  | 'DOCENTE_SUPERVISOR'
  | 'PASANTE'
  | 'ADMINISTRATIVO'
  | 'CLIENTE'
  | 'ADMIN_TI'
  | 'admin'
  | 'user'
  | 'auditor'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  isActive?: boolean
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  setAuth: (user: AuthUser, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  isAuthenticated: () => Boolean(get().token),
}))
