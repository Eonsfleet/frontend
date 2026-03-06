import apiClient from './client'
import { Trip, Paginated } from '@/types'

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

export const createTrip = async (data: any): Promise<TripDetailResponse> => {
    const response = await apiClient.post<TripDetailResponse>('/trips', data)
    return response.data
}

export const updateTripStatus = async (id: string, status: string): Promise<TripDetailResponse> => {
    const response = await apiClient.patch<TripDetailResponse>(`/trips/${id}/change-status`, { status })
    return response.data
}
export const updateTrip = async (id: string, data: any): Promise<TripDetailResponse> => {
    const response = await apiClient.patch<TripDetailResponse>(`/trips/${id}`, data)
    return response.data
}
