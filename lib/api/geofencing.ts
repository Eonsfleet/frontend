import apiClient from './client'
import { Paginated, Geofence, Vehicle } from '@/types'

/** Form data type — accepts alert_type (UI field name) which is mapped to trigger_type before sending */
export interface GeofenceFormData extends Omit<Partial<Geofence['attributes']>, 'trigger_type'> {
    alert_type?: 'enter' | 'exit' | 'both'
    trigger_type?: 'enter' | 'exit' | 'both'
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
    const payload = { ...rest, ...(alert_type ? { trigger_type: alert_type } : {}) }
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
    const payload = { ...rest, ...(alert_type ? { trigger_type: alert_type } : {}) }
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
