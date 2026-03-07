import apiClient from './client'
import { Paginated, MaintenanceSchedule, MaintenanceJob, MaintenanceAlert } from '@/types'

export interface MaintenanceListResponse {
    message: string
    data: {
        schedules: MaintenanceSchedule[]
        pagination: Paginated<MaintenanceSchedule>['pagination']
    }
}

export interface MaintenanceJobListResponse {
    message: string
    data: {
        jobs: MaintenanceJob[]
        pagination: Paginated<MaintenanceJob>['pagination']
    }
}

export interface MaintenanceJobDetailResponse {
    message: string
    data: MaintenanceJob
}

export interface MaintenanceAlertListResponse {
    message: string
    data: {
        alerts: MaintenanceAlert[]
        pagination: Paginated<MaintenanceAlert>['pagination']
    }
}

export const getMaintenances = async (params?: { page?: number; status?: string }): Promise<MaintenanceListResponse> => {
    const response = await apiClient.get<MaintenanceListResponse>('/maintenances', { params })
    return response.data
}

export const getMaintenanceJobs = async (params?: { page?: number; status?: string; vehicle_id?: string }): Promise<MaintenanceJobListResponse> => {
    const response = await apiClient.get<MaintenanceJobListResponse>('/maintenance/jobs', { params })
    return response.data
}

export const getMaintenanceJobById = async (id: string): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.get<MaintenanceJobDetailResponse>(`/maintenance/jobs/${id}`)
    return response.data
}

export const updateMaintenanceJobStatus = async (id: string, status: string): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.patch<MaintenanceJobDetailResponse>(`/maintenance/jobs/${id}/transition`, { status })
    return response.data
}

export const getMaintenanceAlerts = async (params?: { page?: number; status?: string }): Promise<MaintenanceAlertListResponse> => {
    const response = await apiClient.get<MaintenanceAlertListResponse>('/maintenance/alerts', { params })
    return response.data
}

export const acknowledgeMaintenanceAlert = async (id: string): Promise<any> => {
    const response = await apiClient.patch(`/maintenance/alerts/${id}/acknowledge`)
    return response.data
}

export const createWorkOrderFromAlert = async (id: string): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.post<MaintenanceJobDetailResponse>(`/maintenance/alerts/${id}/work-order`)
    return response.data
}

export const getVehicleMaintenanceSchedules = async (vehicleId: string | number): Promise<{ data: any[] }> => {
    const response = await apiClient.get(`/maintenances/schedule/vehicle/${vehicleId}`)
    return response.data
}
