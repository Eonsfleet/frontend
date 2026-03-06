import apiClient from './client'
import { UserProfile, Paginated } from '@/types'

export interface ListDriversParams {
    page?: number
    per_page?: number
    q?: string
    status?: string
}

export interface DriverListResponse {
    message: string
    data: {
        users: UserProfile[]
        pagination: Paginated<any>['pagination']
    }
}

export const getDrivers = async (params: ListDriversParams): Promise<Paginated<UserProfile>> => {
    const response = await apiClient.get<DriverListResponse>('/users', {
        params: { ...params, role: 'driver' }
    })
    return {
        data: response.data.data.users,
        pagination: response.data.data.pagination
    }
}

export const getDriverById = async (id: string | number): Promise<{ data: UserProfile }> => {
    const response = await apiClient.get<{ data: UserProfile }>(`/users/${id}`)
    return response.data
}

export const createDriver = async (data: any): Promise<{ data: UserProfile }> => {
    const response = await apiClient.post<{ data: UserProfile }>('/users', { ...data, role: 'driver' })
    return response.data
}

export const updateDriver = async (id: string | number, data: any): Promise<{ data: UserProfile }> => {
    const response = await apiClient.put<{ data: UserProfile }>(`/users/${id}`, data)
    return response.data
}

export const deleteDriver = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
}
