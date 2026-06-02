import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'
import Cookies from 'js-cookie'

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-Type': 'client',
        // 'X-Tenant': 'dkt',
    },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const { token, organization } = useAuthStore.getState()
    if (token) config.headers.Authorization = `Bearer ${token}`
    // if (organization?.attributes?.subdomain) config.headers['X-Tenant'] = organization.attributes.subdomain
    return config
})

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

apiClient.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config

        // Prevent infinite reload loop or clearing auth on failed login attempt.
        // Also exclude broadcasting/auth (WebSocket) and the subscription endpoint —
        // a subscription 401 should degrade gracefully, not force a full logout.
        if (
            original.url?.includes('/auth/login') ||
            original.url?.includes('/auth/refresh') ||
            original.url?.includes('/broadcasting/auth') ||
            original.url?.includes('/subscriptions/organization/current')
        ) {
            return Promise.reject(error)
        }

        if (error.response?.status === 401 && !original._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                })
                    .then((token) => {
                        original.headers.Authorization = `Bearer ${token}`
                        return apiClient(original)
                    })
                    .catch((err) => {
                        return Promise.reject(err)
                    })
            }

            original._retry = true
            isRefreshing = true

            try {
                const { refreshToken, setAuth } = useAuthStore.getState()
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
                    payload.user.relationships?.organization || null
                )

                processQueue(null, payload.access_token)
                original.headers.Authorization = `Bearer ${payload.access_token}`
                return apiClient(original)
            } catch (err) {
                processQueue(err, null)
                const { _hasHydrated } = useAuthStore.getState()
                if (_hasHydrated) {
                    useAuthStore.getState().clearAuth()
                    if (typeof window !== 'undefined') {
                        window.location.href = '/login'
                    }
                }
                return Promise.reject(err)
            } finally {
                isRefreshing = false
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
