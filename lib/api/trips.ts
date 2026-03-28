import apiClient from './client'
import { Trip, Paginated, CreateTripPayload, TripAttributes } from '@/types'

export interface TripListParams {
    page?: number
    q?: string
    status?: string
}

export interface TripListResponse {
    message: string
    data: {
        trips: Trip[]
        pagination: Paginated<Trip>['pagination']
    }
}

export interface TripDetailResponse {
    message: string
    data: Trip
}

export const getTrips = async (params?: TripListParams): Promise<TripListResponse> => {
    const response = await apiClient.get<TripListResponse>('/trips', { params })
    return response.data
}

export const getTripById = async (id: string): Promise<TripDetailResponse> => {
    const response = await apiClient.get<TripDetailResponse>(`/trips/${id}`)
    return response.data
}

export const createTrip = async (data: CreateTripPayload): Promise<TripDetailResponse> => {
    const response = await apiClient.post<TripDetailResponse>('/trips', data)
    return response.data
}

export const updateTripStatus = async (id: string, status: string): Promise<TripDetailResponse> => {
    const response = await apiClient.patch<TripDetailResponse>(`/trips/${id}/change-status`, { status })
    return response.data
}

export const updateTrip = async (id: string, data: Partial<TripAttributes>): Promise<TripDetailResponse> => {
    const response = await apiClient.patch<TripDetailResponse>(`/trips/${id}`, data)
    return response.data
}
export const calculateTripEstimate = async (data: {
    start_location: { name: string; coords: { latitude: number; longitude: number } }
    end_location: { name: string; coords: { latitude: number; longitude: number } }
}): Promise<{ message: string; data: { eta: string; distance_km: number } }> => {
    const response = await apiClient.post('/trips/calculate-estimate', data)
    return response.data
}

export const generateTripRoute = async (data: {
    start_location: { name: string; coords: { latitude: number; longitude: number } }
    end_location: { name: string; coords: { latitude: number; longitude: number } }
}): Promise<{ message: string; data: { waypoints: any[] } }> => {
    const response = await apiClient.post('/trips/generate-route', data)
    return response.data
}

export const getTripRoutes = async (tripId: string | number): Promise<{ data: any[] }> => {
    const response = await apiClient.get(`/trips/${tripId}/routes`)
    return response.data
}

export const getActiveTripForVehicle = async (vehicleId: string | number): Promise<Trip | null> => {
    const response = await apiClient.get<TripListResponse>('/trips', {
        params: { status: 'ongoing', vehicle_id: vehicleId }
    })
    return response.data.data.trips[0] || null
}

export const getLastTripForVehicle = async (vehicleId: string | number): Promise<Trip | null> => {
    const response = await apiClient.get<TripListResponse>('/trips', {
        params: { status: 'completed', vehicle_id: vehicleId, per_page: 1 }
    })
    return response.data.data.trips[0] || null
}

export const getMyTrips = async (params?: TripListParams): Promise<TripListResponse> => {
    const response = await apiClient.get<TripListResponse>('/trips/mine', { params })
    return response.data
}

export const getTripEvents = async (tripId: string | number): Promise<{ data: any[] }> => {
    const response = await apiClient.get(`/trips/${tripId}/events`)
    return response.data
}

export const getTripCheckpoints = async (tripId: string | number): Promise<{ data: any[] }> => {
    const response = await apiClient.get(`/trips/${tripId}/checkpoints`)
    return response.data
}
