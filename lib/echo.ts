import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
    interface Window {
        Pusher: any
        Echo: Echo<any>
    }
}

if (typeof window !== 'undefined') {
    window.Pusher = Pusher
}


console.log(process.env.NEXT_PUBLIC_PUSHER_HOST)

const echoConfig: any = {
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY || 'your_pusher_key',
    wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST || 'reverb.eonsfleet.local',
    wsPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || '8080'),
    // wssPort: parseInt(process.env.NEXT_PUBLIC_PUSHER_PORT || '8080'),
    forceTLS: process.env.NEXT_PUBLIC_PUSHER_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: process.env.NEXT_PUBLIC_PUSHER_HOST + '/broadcasting/auth',
    auth: {
        headers: {
            'X-Request-Type': 'client',
        },
    },
}

let echoInstance: Echo<any> | null = null

export const getEcho = () => {
    if (typeof window === 'undefined') return null

    if (!echoInstance) {
        const token = typeof window !== 'undefined' ? (window as any).JS_COOKIE?.get('token') : null; // Fallback or use standard logic
        echoInstance = new Echo({
            ...echoConfig,
            auth: {
                headers: {
                    ...echoConfig.auth.headers,
                    Authorization: `Bearer ${token}`,
                }
            }
        })
    }

    return echoInstance
}

export default getEcho()
