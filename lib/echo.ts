import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import apiClient from '@/lib/api/client'

declare global {
    interface Window {
        Pusher: any
        Echo: Echo<any>
    }
}

if (typeof window !== 'undefined') {
    window.Pusher = Pusher
}

const endpoint = process.env.NEXT_PUBLIC_WEBSOCKET_HOST_URL || 'http://api.eonsfleet.local'

let echoInstance: Echo<any> | null = null

export const getEcho = () => {
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
            
            // authorizer: (channel: any, _options: any) => ({
            //     authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => {
            //         apiClient
            //             .post(`${endpoint}/broadcasting/auth`, {
            //                 socket_id: socketId,
            //                 channel_name: channel.name,
            //             })
            //             .then((response: any) => callback(null, response.data))
            //             .catch((error: any) => callback(new Error(error.message), null))
            //     },
            // }),
        })
    }

    return echoInstance
}

export default getEcho()
