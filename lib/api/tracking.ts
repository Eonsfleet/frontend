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

export const getVehiclePlayback = async (vehicleId: string | number, startDate: string, endDate: string) => {
    const res = await apiClient.get(`/vehicles/${vehicleId}/playback`, {
        params: { start_date: startDate, end_date: endDate }
    })
    return res.data
}

export const getDeviceStatus = async (deviceIdent: string) => {
    const res = await apiClient.get(`/tracker/${deviceIdent}`)
    return res.data
}

export const getDevices = async (params?: any): Promise<{ data: { devices: any[], pagination: any } }> => {
    const res = await apiClient.get('/devices', { params })
    return res.data
}

/**
 * Device hardware record (IMEI, phone number, online status, linked hardware
 * model) — distinct from getDeviceStatus, which hits /tracker/{imei} and only
 * returns GPS telemetry, not device attributes. `id` is the device's own DB
 * id/uuid (relationships.device.id on a vehicle), not its IMEI.
 */
export const getDeviceById = async (id: string | number) => {
    const res = await apiClient.get(`/devices/${id}`)
    return res.data
}

export const getTripPlayback = async (vehicleId: string | number, tripId: string | number, params?: {
    include_gps_points?: boolean
    include_events?: boolean
    point_interval?: number
}) => {
    const res = await apiClient.get(`/vehicles/${vehicleId}/trips/${tripId}/playback`, { params })
    return res.data
}

export const getVehicleSensorHealth = async (vehicleId: string | number, params?: {
    include_history?: boolean
    anomaly_threshold?: string
}) => {
    const res = await apiClient.get(`/vehicles/${vehicleId}/sensors/health`, { params })
    return res.data
}
