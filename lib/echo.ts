import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import axios from 'axios'
import Cookies from 'js-cookie'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

declare global {
    interface Window {
        Pusher: any
        Echo: Echo<any>
    }
}

if (typeof window !== 'undefined') {
    window.Pusher = Pusher
    // Enable Pusher debug logging in development
    if (process.env.NODE_ENV !== 'production') {
        Pusher.logToConsole = true
    }
}

// Broadcasting auth must go to the Laravel API server (strip /v1 suffix)
const getApiBase = () =>
    (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/v\d+\/?$/, '')

let echoInstance: Echo<any> | null = null
let connectionFailureNotified = false

export const getEcho = (): Echo<any> | null => {
    if (typeof window === 'undefined') return null

    if (!echoInstance) {
        const config = {
            broadcaster: 'reverb' as const,
            key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '',
            wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST || '',
            wsPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || '8080'),
            wssPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || '443'),
            forceTLS: process.env.NEXT_PUBLIC_PUSHER_SCHEME === 'https',
            enabledTransports: ['ws', 'wss'] as any,
        }

        echoInstance = new Echo({
            ...config,
            authorizer: (channel: any, _options: any) => ({
                authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => {
                    // Read token fresh at auth time — never at module load
                    const token = Cookies.get('ef-token') || useAuthStore.getState().token
                    const { organization } = useAuthStore.getState()
                    const subdomain = organization?.attributes?.subdomain || 'dkt'

                    axios
                        .post(
                            `${getApiBase()}/broadcasting/auth`,
                            { socket_id: socketId, channel_name: channel.name },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'X-Request-Type': 'client',
                                    'X-Tenant': subdomain,
                                    Accept: 'application/json',
                                    'Content-Type': 'application/json',
                                },
                            }
                        )
                        .then((response: any) => callback(null, response.data))
                        .catch((err: any) => {
                            console.error(`[Echo] Auth failed: ${channel.name}`, err?.response?.status)
                            if (err?.response?.status === 403) {
                                toast.error('Real-time authentication failed. Please refresh the page.')
                            }
                            callback(new Error(err.message), null)
                        })
                },
            }),
        })

        // Bind connection lifecycle events
        const pusher = (echoInstance as any).connector?.pusher
        if (pusher) {
            pusher.connection.bind('connecting', () => {
                if (process.env.NODE_ENV !== 'production') console.log('[Echo] Connecting...')
            })
            pusher.connection.bind('connected', () => {
                connectionFailureNotified = false
                if (process.env.NODE_ENV !== 'production') console.log('[Echo] Connected. Socket ID:', pusher.connection.socket_id)
            })
            pusher.connection.bind('disconnected', () => {
                if (process.env.NODE_ENV !== 'production') console.warn('[Echo] Disconnected')
            })
            pusher.connection.bind('failed', () => {
                console.error('[Echo] Connection FAILED — check wsHost/wsPort/key')
                if (!connectionFailureNotified) {
                    connectionFailureNotified = true
                    toast.error('Real-time connection failed. Live updates are unavailable.', { duration: 6000 })
                }
            })
            pusher.connection.bind('unavailable', () => {
                console.error('[Echo] Connection UNAVAILABLE')
                if (!connectionFailureNotified) {
                    connectionFailureNotified = true
                    toast.warning('Real-time connection unavailable. Live updates may be delayed.', { duration: 6000 })
                }
            })
            pusher.connection.bind('error', (err: any) => console.error('[Echo] Connection error:', err))
        }
    }

    return echoInstance
}

export const resetEcho = () => {
    if (echoInstance) {
        echoInstance.disconnect()
        echoInstance = null
        connectionFailureNotified = false
    }
}

export default getEcho
