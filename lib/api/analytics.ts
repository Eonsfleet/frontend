import apiClient from './client'

export const getFuelConsumptionReport = async (params: {
    period: 'daily' | 'weekly' | 'monthly'
    date_from?: string
    date_to?: string
    vehicle_id?: number
    cluster_id?: number
    sort_by?: string
    per_page?: number
    page?: number
}) => {
    const res = await apiClient.get('/analytics/fuel/consumption-report', { params })
    return res.data
}

export const getFuelEfficiencyReport = async (params?: {
    date_from?: string
    date_to?: string
    vehicle_id?: number
    driver_id?: number
    cluster_id?: number
    include_baseline?: boolean
    sort_by?: string
    per_page?: number
}) => {
    const res = await apiClient.get('/analytics/fuel/efficiency-report', { params })
    return res.data
}

export const getTopDriversByTrips = async (params?: {
    limit?: number
    period?: string
    date_from?: string
    date_to?: string
    cluster_id?: number
    include_metrics?: boolean
    order?: 'asc' | 'desc'
}) => {
    const res = await apiClient.get('/analytics/drivers/top-by-trips', { params })
    return res.data
}

export const getFuelCardTransactions = async (params?: {
    date_from?: string
    date_to?: string
    card_id?: number
    vehicle_id?: number
    status?: string
    merchant?: string
    sort_by?: string
    per_page?: number
    page?: number
}) => {
    const res = await apiClient.get('/analytics/fuel/card-transactions', { params })
    return res.data
}

export const detectAnomalies = async (days: number = 30) => {
    const res = await apiClient.post('/analytics/insights/detect-anomalies', { days })
    return res.data
}
export const getDeviceStatusSummary = async () => {
    const res = await apiClient.get('/analytics/gps/device-status')
    return res.data?.data ?? res.data
}
