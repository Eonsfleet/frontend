import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserProfile, Organization } from '@/types'

interface AuthState {
    token: string | null
    refreshToken: string | null
    expiresAt: string | null
    user: UserProfile | null
    organization: Organization | null
    setAuth: (token: string, refreshToken: string, user: UserProfile, org: Organization | null) => void
    updateUser: (user: Partial<UserProfile>) => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            refreshToken: null,
            expiresAt: null,
            user: null,
            organization: null,
            setAuth: (token, refreshToken, user, organization) =>
                set({ token, refreshToken, user, organization }),
            updateUser: (partial) =>
                set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),
            clearAuth: () =>
                set({ token: null, refreshToken: null, expiresAt: null, user: null, organization: null }),
        }),
        { name: 'eonsfleet-session' }
    )
)
