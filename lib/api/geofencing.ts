import apiClient from './client'
import { Paginated, Geofence, Vehicle } from '@/types'

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
}

export const getGeofences = async (params?: GeofenceListParams): Promise<GeofenceListResponse> => {
    const response = await apiClient.get<GeofenceListResponse>('/geofences', { params })
    return response.data
}

export const getGeofenceById = async (id: string): Promise<GeofenceDetailResponse> => {
    const response = await apiClient.get<GeofenceDetailResponse>(`/geofences/${id}`)
    return response.data
}

export const createGeofence = async (data: Partial<Geofence['attributes']>): Promise<GeofenceDetailResponse> => {
    const response = await apiClient.post<GeofenceDetailResponse>('/geofences', data)
    return response.data
}

export const updateGeofence = async (id: string, data: Partial<Geofence['attributes']>): Promise<GeofenceDetailResponse> => {
    const response = await apiClient.put<GeofenceDetailResponse>(`/geofences/${id}`, data)
    return response.data
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
