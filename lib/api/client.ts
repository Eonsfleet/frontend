import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-Type': 'client',
    },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { token, organization } = useAuthStore.getState()
    if (token) config.headers.Authorization = `Bearer ${token}`
    if (organization?.subdomain) config.headers['X-Tenant'] = organization.subdomain
    return config
})

apiClient.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config

        // Prevent infinite reload loop or clearing auth on failed login attempt
        if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
            return Promise.reject(error)
        }

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true
            try {
                const { refreshToken, setAuth, clearAuth } = useAuthStore.getState()
                if (!refreshToken) throw new Error('No refresh token')
                const { data } = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
                    { refresh_token: refreshToken },
                    { headers: { 'X-Request-Type': 'client' } }
                )
                // Extract from the new { data: { access_token, user, ... } } structure
                const payload = data.data
                setAuth(
                    payload.access_token,
                    payload.refresh_token,
                    payload.user,
                    payload.user.relationships.organization
                )
                original.headers.Authorization = `Bearer ${payload.access_token}`
                return apiClient(original)
            } catch {
                useAuthStore.getState().clearAuth()
                if (typeof window !== 'undefined') {
                    window.location.href = '/login'
                }
            }
        }
        if (error.response?.status === 403) {
            const code = error.response.data?.errors?.[0]?.code
            if (code === 'MODULE_NOT_IN_PLAN') {
                return Promise.reject({ ...error, isSubscriptionError: true })
            }
        }
        return Promise.reject(error)
    }
)

export default apiClient
