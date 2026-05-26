import apiClient from './client'
import { Paginated, Geofence, Vehicle } from '@/types'

/** Form data type — accepts alert_type (UI field name) which is mapped to trigger_type before sending */
export interface GeofenceFormData extends Omit<Partial<Geofence['attributes']>, 'trigger_type'> {
    alert_type?: 'enter' | 'exit' | 'both'
    trigger_type?: 'enter' | 'exit' | 'both'
}

/**
 * Maps UI trigger type values to the backend's expected values.
 * Backend uses: 'entry', 'exit', 'both'  (not 'enter')
 */
const normalizeTriggerType = (value?: string): string | undefined => {
    if (!value) return undefined
    const map: Record<string, string> = {
        enter: 'entry',
        entry: 'entry',
        exit: 'exit',
        both: 'both',
    }
    return map[value] ?? value
}

/**
 * Normalizes coordinates to the format the backend expects:
 * - polygon: array of { lat, lng } objects
 * - circle: { lat, lng } object
 * Handles GeoJSON geometry objects and { latitude, longitude } shapes from older code.
 */
const normalizeCoordinates = (coordinates: any, type?: string): any => {
    if (!coordinates) return coordinates

    // GeoJSON Polygon geometry: { type: 'Polygon', coordinates: [[[lng, lat], ...]] }
    if (coordinates.type === 'Polygon' && Array.isArray(coordinates.coordinates)) {
        const ring: number[][] = coordinates.coordinates[0]
        return ring.map((p: number[]) => ({ lat: p[1], lng: p[0] }))
    }

    // Circle center with latitude/longitude keys → convert to lat/lng
    if (type === 'circle' && coordinates.latitude != null && coordinates.longitude != null) {
        return { lat: coordinates.latitude, lng: coordinates.longitude }
    }

    return coordinates
}

export interface GeofenceListResponse {
    message: string
    data: {
        geofences: Geofence[]
        pagination: Paginated<Geofence>['pagination']
    }
}

export interface GeofenceDetailResponse {
    message: string
    data: Geofence
}

export interface GeofenceListParams {
    page?: number
    per_page?: number
    q?: string
    status?: string
}

export const getGeofences = async (params?: GeofenceListParams): Promise<GeofenceListResponse> => {
    const response = await apiClient.get<GeofenceListResponse>('/geofences', { params })
    return response.data
}

export const getGeofenceById = async (id: string): Promise<GeofenceDetailResponse> => {
    const response = await apiClient.get<any>(`/geofences/${id}`)
    // API returns { data: { geofence: Geofence } } — normalize to { data: Geofence }
    const raw = response.data
    return {
        message: raw.message,
        data: raw.data?.geofence ?? raw.data,
    }
}

export const createGeofence = async (data: GeofenceFormData): Promise<GeofenceDetailResponse> => {
    const { alert_type, ...rest } = data
    const rawTrigger = alert_type ?? rest.trigger_type
    const payload = {
        ...rest,
        trigger_type: normalizeTriggerType(rawTrigger),
        coordinates: normalizeCoordinates(rest.coordinates, rest.type),
    }
    const response = await apiClient.post<any>('/geofences', payload)
    // API returns { data: { geofence: Geofence } } — normalize to { data: Geofence }
    const raw = response.data
    return {
        message: raw.message,
        data: raw.data?.geofence ?? raw.data,
    }
}

export const updateGeofence = async (id: string, data: GeofenceFormData): Promise<GeofenceDetailResponse> => {
    const { alert_type, ...rest } = data
    const rawTrigger = alert_type ?? rest.trigger_type
    const payload = {
        ...rest,
        trigger_type: normalizeTriggerType(rawTrigger),
        coordinates: normalizeCoordinates(rest.coordinates, rest.type),
    }
    const response = await apiClient.put<any>(`/geofences/${id}`, payload)
    // API returns { data: { geofence: Geofence } } — normalize to { data: Geofence }
    const raw = response.data
    return {
        message: raw.message,
        data: raw.data?.geofence ?? raw.data,
    }
}

export const deleteGeofence = async (id: string): Promise<void> => {
    await apiClient.delete(`/geofences/${id}`)
}

export const getGeofenceVehicles = async (id: string): Promise<{ data: Vehicle[] }> => {
    const response = await apiClient.get<{ data: Vehicle[] }>(`/geofences/${id}/vehicles`)
    return response.data
}

export const bulkAssignVehicles = async (geofenceId: string | number, vehicleIds: (string | number)[], preserveExisting: boolean = true) => {
    const res = await apiClient.post(`/geofences/${geofenceId}/bulk-assign`, {
        vehicle_ids: vehicleIds,
        preserve_existing: preserveExisting
    })
    return res.data
}

export const getGeofenceAnalytics = async (geofenceId: string | number, params?: { days?: number; include_timeline?: boolean; include_ranking?: boolean }) => {
    const res = await apiClient.get(`/geofences/${geofenceId}/analytics`, { params })
    return res.data
}

export const getGeofenceAlerts = async (geofenceId: string | number, params?: { page?: number; per_page?: number }) => {
    const res = await apiClient.get(`/geofences/${geofenceId}/alerts`, { params })
    return res.data
}
