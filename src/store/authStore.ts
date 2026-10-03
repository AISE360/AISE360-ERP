import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  user: Profile | null
  loading: boolean
  setUser: (user: Profile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))

// Founders + admins see everything (finance, expenses, credentials).
// Employees only see operational screens; finance tables are also
// locked for them by Supabase RLS, so this is just the UI layer.
export function isPrivilegedRole(role?: string | null): boolean {
  return role === 'founder' || role === 'admin'
}

export function useIsPrivileged(): boolean {
  return useAuthStore((s) => isPrivilegedRole(s.user?.role))
}
