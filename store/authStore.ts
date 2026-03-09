import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UserProfile, Organization } from '@/types'
import Cookies from 'js-cookie'

interface AuthState {
    token: string | null
    refreshToken: string | null
    expiresAt: string | null
    user: UserProfile | null
    organization: Organization | null
    _hasHydrated: boolean
    setAuth: (token: string, refreshToken: string, user: UserProfile, org: Organization | null) => void
    setHasHydrated: (state: boolean) => void
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
            _hasHydrated: false,
            setHasHydrated: (state) => set({ _hasHydrated: state }),
            updateUser: (partial) =>
                set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),
            setAuth: (token, refreshToken, user, organization) => {
                set({ token, refreshToken, user, organization });
                // Note: We don't have expires_at here directly in the signature, 
                // but we can set a long enough default or pass it if needed.
                // For now, let's just ensure the cookie is set.
                Cookies.set('ef-token', token, {
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    expires: 7 // 7 days fallback
                });
            },
            clearAuth: () => {
                set({ token: null, refreshToken: null, expiresAt: null, user: null, organization: null });
                Cookies.remove('ef-token');
            },
        }),
        {
            name: 'eonsfleet-session',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true)
            }
        }
    )
)
