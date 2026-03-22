import apiClient from './client'

export interface CustomReport {
    id: number
    name: string
    report_type: string
    dimensions?: string[]
    metrics?: string[]
    filters?: any
    format: 'pdf' | 'csv' | 'json'
    schedule?: 'once' | 'daily' | 'weekly' | 'monthly'
    frequency?: 'once' | 'daily' | 'weekly' | 'monthly'
    day_of_week?: number
    day_of_month?: number
    recipients?: string[]
    is_active: boolean
    last_delivered_at?: string
    created_at: string
    updated_at: string
}

export const createCustomReport = async (data: Partial<CustomReport>) => {
    const res = await apiClient.post('/reports/custom', data)
    return res.data?.data ?? res.data
}

export const getCustomReports = async (params?: {
    page?: number
    per_page?: number
    report_type?: string
    is_active?: boolean
    sort_by?: string
    order?: 'asc' | 'desc'
}) => {
    const res = await apiClient.get('/reports/custom', { params })
    return res.data?.data ?? res.data
}

export const getCustomReport = async (id: number | string) => {
    const res = await apiClient.get(`/reports/custom/${id}`)
    return res.data?.data ?? res.data
}

export const updateCustomReport = async (id: number | string, data: Partial<CustomReport>) => {
    const res = await apiClient.patch(`/reports/custom/${id}`, data)
    return res.data?.data ?? res.data
}

export const deleteCustomReport = async (id: number | string) => {
    const res = await apiClient.delete(`/reports/custom/${id}`)
    return res.data?.data ?? res.data
}

export const getRecommendedReports = async () => {
    const res = await apiClient.get('/reports/recommended')
    return res.data?.data ?? res.data
}

// ── Scheduled Reports ─────────────────────────────────────────────────────────

export interface ScheduledReport {
    id: number
    name: string
    report_type: string
    filter?: string
    format: 'pdf' | 'csv'
    frequency: 'daily' | 'weekly' | 'monthly'
    day_of_week?: number
    day_of_month?: number
    recipients?: string[]
    is_active: boolean
    last_delivered_at?: string
    created_at: string
    updated_at: string
}

export const getScheduledReports = async (params?: {
    page?: number
    per_page?: number
    is_active?: boolean
}) => {
    const res = await apiClient.get('/analytics/reports/scheduled', { params })
    return res.data?.data ?? res.data
}

export const createScheduledReport = async (data: {
    name: string
    report_type: string
    filter?: '7d' | '30d' | '90d' | '1y'
    format: 'pdf' | 'csv'
    frequency: 'daily' | 'weekly' | 'monthly'
    day_of_week?: number
    day_of_month?: number
    recipients: string[]
    is_active?: boolean
}) => {
    const res = await apiClient.post('/analytics/reports/scheduled', data)
    return res.data?.data ?? res.data
}

export const getScheduledReport = async (id: number | string) => {
    const res = await apiClient.get(`/analytics/reports/scheduled/${id}`)
    return res.data?.data ?? res.data
}

export const updateScheduledReport = async (id: number | string, data: Partial<ScheduledReport>) => {
    const res = await apiClient.patch(`/analytics/reports/scheduled/${id}`, data)
    return res.data?.data ?? res.data
}

export const deleteScheduledReport = async (id: number | string) => {
    const res = await apiClient.delete(`/analytics/reports/scheduled/${id}`)
    return res.data?.data ?? res.data
}

export const exportReport = async (params: {
    report_type: string
    format?: 'pdf' | 'csv' | 'excel'
    filter?: '7d' | '30d' | '90d' | '1y'
    limit?: number
}) => {
    const res = await apiClient.get('/analytics/reports/export', {
        params,
        responseType: 'blob',
    })
    return res.data
}

// ── Report History ─────────────────────────────────────────────────────────────

export const getReportHistory = async (params?: { page?: number; per_page?: number }) => {
    const res = await apiClient.get('/analytics/reports/history', { params })
    return res.data?.data ?? res.data
}

export const downloadReportHistory = async (id: number | string) => {
    const res = await apiClient.get(`/analytics/reports/history/${id}/download`, {
        responseType: 'blob',
    })
    return res.data
}

export const deleteReportHistory = async (id: number | string) => {
    const res = await apiClient.delete(`/analytics/reports/history/${id}`)
    return res.data
}
