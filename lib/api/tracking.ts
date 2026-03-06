import apiClient from './client'

export interface TrackingMetric {
    total_active_assets: number
    moving_assets: number
    idle_assets: number
    offline_assets: number
}

export interface PlaybackMovement {
    id: number
    vehicle_id: number
    lat: number
    lng: number
    speed: number
    heading: number
    timestamp: string
}

export const getTrackingMetrics = async () => {
    const res = await apiClient.get('/tracker/metrics')
    return res.data
}

export const getVehiclePlayback = async (vehicleId: string | number, start: string, end: string) => {
    const res = await apiClient.post('/tracker/playback', {
        vehicle_id: vehicleId,
        start_time: start,
        end_time: end
    })
    return res.data
}

export const getDeviceStatus = async (deviceIdent: string) => {
    const res = await apiClient.get(`/tracker/${deviceIdent}`)
    return res.data
}
