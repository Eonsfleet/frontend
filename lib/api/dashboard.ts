import apiClient from './client'

export interface Alert {
    id: number
    type: string
    severity: 'critical' | 'warning' | 'informational'
    title: string
    description: string
    vehicle_id: number
    vehicle_registration: string
    created_at: string
    updated_at: string
    meta: any
    action_url?: string
}

export interface MaintenanceSchedule {
    id: number
    vehicle_id: number
    vehicle_registration: string
    service_type: string
    due_date: string
    due_days: number
    status: string
    estimated_cost_kobo: number
    assigned_technician: string | null
    priority: 'high' | 'medium' | 'low'
}

export interface MaintenanceDay {
    date: string
    count: number
    schedules: MaintenanceSchedule[]
}



export const getAlerts = async (params?: {
    severity?: string
    limit?: number
    page?: number
    type?: string
}) => {
    const res = await apiClient.get('/dashboard/alerts', { params })
    return res.data
}

export const getMaintenanceForecast = async (params?: {
    days?: number
    vehicle_id?: number
    cluster_id?: number
    status?: string
    sort_by?: string
}) => {
    const res = await apiClient.get('/dashboard/maintenance-forecast', { params })
    return res.data
}
export const getVehicleStats = async () => {
    const res = await apiClient.get('/dashboard/vehicles/total?include=trend')
    return res.data?.data ?? res.data
}

export const getActiveTrips = async () => {
    const res = await apiClient.get('/dashboard/trips/active?include=trend')
    return res.data?.data ?? res.data
}

export const getEfficiencyStats = async () => {
    const res = await apiClient.get('/dashboard/efficiency/average?include=trend')
    return res.data?.data ?? res.data
}

export const getRecentIncidents = async () => {
    const res = await apiClient.get('/dashboard/incidents/recent?include=trend')
    return res.data?.data ?? res.data
}

export const getVehicleStatus = async () => {
    const res = await apiClient.get('/dashboard/vehicles/status')
    return res.data?.data ?? res.data
}

export const getActivityLogs = async () => {
    const res = await apiClient.get('/organization/activity-log/summary')
    return res.data?.data ?? res.data
}

export const getVehiclesWeekly = async () => {
    const res = await apiClient.get('/dashboard/vehicles/weekly')
    return res.data?.data ?? res.data
}

export const getTripsWeekly = async () => {
    const res = await apiClient.get('/dashboard/trips/weekly')
    return res.data?.data ?? res.data
}

export const getIncidentsWeekly = async () => {
    const res = await apiClient.get('/dashboard/incidents/weekly')
    return res.data?.data ?? res.data
}

export const getEfficiencyWeekly = async () => {
    const res = await apiClient.get('/dashboard/efficiency/weekly')
    return res.data?.data ?? res.data
}
