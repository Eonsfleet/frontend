import apiClient from './client'

export interface CustomReport {
    id: number
    name: string
    report_type: string
    dimensions?: string[]
    metrics?: string[]
    filters?: any
    format: 'pdf' | 'csv' | 'json'
    frequency: 'once' | 'daily' | 'weekly' | 'monthly'
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
    return res.data
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
    return res.data
}

export const getCustomReport = async (id: number | string) => {
    const res = await apiClient.get(`/reports/custom/${id}`)
    return res.data
}

export const updateCustomReport = async (id: number | string, data: Partial<CustomReport>) => {
    const res = await apiClient.put(`/reports/custom/${id}`, data)
    return res.data
}

export const deleteCustomReport = async (id: number | string) => {
    const res = await apiClient.delete(`/reports/custom/${id}`)
    return res.data
}

export const getRecommendedReports = async () => {
    const res = await apiClient.get('/reports/recommended')
    return res.data
}
