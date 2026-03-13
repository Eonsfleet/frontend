import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import axios from 'axios'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/store/authStore'

declare global {
    interface Window {
        Pusher: any
        Echo: Echo<any>
    }
}

if (typeof window !== 'undefined') {
    window.Pusher = Pusher
}

const token = Cookies.get('ef-token') || useAuthStore.getState().token

// Broadcasting auth must go to the Laravel API server (strip /v1 suffix)
const getApiBase = () =>
    (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/v\d+\/?$/, '')

let echoInstance: Echo<any> | null = null

export const getEcho = (): Echo<any> | null => {
    if (typeof window === 'undefined') return null

    if (!echoInstance) {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'your_pusher_key',
            wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST || 'reverb.eonsfleet.local',
            wsPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || '8080'),
            wssPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || '443'),
            forceTLS: process.env.NEXT_PUBLIC_PUSHER_SCHEME === 'https',
            enabledTransports: ['ws', 'wss'],
            // authEndpoint: `${getApiBase()}/broadcasting/auth`,
            // auth: {
            //     headers: {
            //         Authorization: `Bearer ${token}`,
            //         'X-Request-Type': 'client',
            //         'Content-Type': 'application/x-www-form-urlencoded',
            //         'X-Tenant': 'dkt',
            //     },
            // },

            authorizer: (channel: any, _options: any) => ({
                authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => {
                    // Use plain axios (not apiClient) to avoid the 401 logout interceptor
                    const token = Cookies.get('ef-token') || useAuthStore.getState().token
                    const { organization } = useAuthStore.getState()
                    // const subdomain = organization?.attributes?.subdomain || 'dkt'

                    axios
                        .post(
                            `${getApiBase()}/broadcasting/auth`,
                            { socket_id: socketId, channel_name: channel.name },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    'X-Request-Type': 'client',
                                    // 'X-Tenant': subdomain,
                                    Accept: 'application/json',
                                    'Content-Type': 'application/json',
                                },
                            }
                        )
                        .then((response: any) => callback(null, response.data))
                        .catch((err: any) => callback(new Error(err.message), null))
                },
            }),
        })
    }

    return echoInstance
}

export const resetEcho = () => {
    if (echoInstance) {
        echoInstance.disconnect()
        echoInstance = null
    }
}

export default getEcho
