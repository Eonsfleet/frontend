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

export const getGeofences = async (params?: { page?: number; per_page?: number }): Promise<GeofenceListResponse> => {
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
