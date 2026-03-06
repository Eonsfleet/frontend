import apiClient from './client'
import { Paginated } from '@/types'

export interface Vendor {
    id: number
    attributes: {
        business_name: string
        business_type: string
        location: string // JSON stringified
        website: string
        has_onboarded: boolean
        avatar?: string | null
    }
    relationships: {
        user: {
            f_name: string
            l_name: string
            email: string
            phone_number: string
        }
        referred_by: string | null
    }
}

export const getVendors = async (params?: { category?: string }): Promise<{
    data: Vendor[],
    meta: { current: number; lastPage: number; total: number; perPage: number }
}> => {
    const response = await apiClient.get<{
        data: { vendors: Vendor[], pagination: any }
    }>('/vendors/directory', { params })

    return {
        data: response.data.data.vendors,
        meta: {
            current: response.data.data.pagination.current,
            lastPage: response.data.data.pagination.lastPage,
            total: response.data.data.pagination.total,
            perPage: response.data.data.pagination.perPage
        }
    }
}

export const getVendorById = async (id: string | number): Promise<{ data: Vendor }> => {
    const response = await apiClient.get<{ data: Vendor }>(`/vendors/${id}`)
    return response.data
}

export const inviteVendor = async (data: { email: string; business_name: string; category: string }): Promise<{ message: string }> => {
    const response = await apiClient.post('/vendors/invite', data)
    return response.data
}

// Workshop specific actions
export interface WorkshopJob {
    id: string
    vehicle: { make: string; model: string; plate_number: string }
    status: 'pending' | 'accepted' | 'in_progress' | 'completed'
    description: string
    reported_at: string
}

export const getWorkshopJobs = async (): Promise<{ data: WorkshopJob[] }> => {
    const response = await apiClient.get('/workshop/jobs')
    return response.data
}

export const acceptJob = async (jobId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/workshop/jobs/${jobId}/accept`)
    return response.data
}

export const completeJob = async (jobId: string, notes: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/workshop/jobs/${jobId}/complete`, { notes })
    return response.data
}
