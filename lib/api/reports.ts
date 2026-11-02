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
    vehicle_ids?: number[] | null
    /** HH:MM in the app timezone. */
    delivery_time?: string
    is_active: boolean
    last_delivered_at?: string
    last_status?: 'queued' | 'delivered' | 'failed' | null
    last_attempted_at?: string | null
    last_error?: string | null
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
    filter?: string
    format: 'pdf' | 'csv'
    frequency: 'daily' | 'weekly' | 'monthly'
    day_of_week?: number
    day_of_month?: number
    recipients: string[]
    vehicle_ids?: number[] | null
    delivery_time?: string
    is_active?: boolean
}) => {
    const res = await apiClient.post('/analytics/reports/scheduled', data)
    return res.data?.data ?? res.data
}

/** Sends a scheduled report now: the retrigger after a failed delivery. */
export const runScheduledReport = async (id: number | string) => {
    const res = await apiClient.post(`/analytics/reports/scheduled/${id}/run`)
    return res.data?.data ?? res.data
}

export const getScheduledReport = async (id: number | string) => {
    const res = await apiClient.get(`/analytics/reports/scheduled/${id}`)
    return res.data?.data ?? res.data
}

export const updateScheduledReport = async (id: number | string, data: Partial<ScheduledReport>) => {
    const res = await apiClient.patch(`/analytics/reports/scheduled/${id}`, data)
    return res.data
}

export const deleteScheduledReport = async (id: number | string) => {
    const res = await apiClient.delete(`/analytics/reports/scheduled/${id}`)
    return res.data?.data ?? res.data
}

export const exportReport = async (params: {
    report_type: string
    format?: 'pdf' | 'csv' | 'excel'
    filter?: string
    start_date?: string
    end_date?: string
    vehicle_ids?: number[]
    limit?: number
}) => {
    const res = await apiClient.get('/analytics/reports/export', {
        params,
        paramsSerializer: { indexes: null },
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

// ── Report catalog ────────────────────────────────────────────────────────────

/** One catalogued report: the telemetry, fuel-by-source and utilization reports. */
export interface CatalogReport {
    type: string
    title: string
    category: string
    permission: string
    endpoint: string
    filters: string[]
    columns: string[]
    /** '60d' for the reporting store, 'long_term' for fuel estimates and purchases. */
    window: string
    allowed: boolean
}

export const getReportCatalog = async (): Promise<CatalogReport[]> => {
    const res = await apiClient.get('/analytics/reports/catalog')
    const body = res.data?.data ?? res.data
    return body?.reports ?? []
}

// ── Templates and runs (vehicle and driver reports) ───────────────────────────

export interface ReportTypeInfo {
    key: string
    label: string
    definition_version: number
}

export interface ReportField {
    key: string
    label: string
    description: string
    data_type: string
    group: string
    unit: string | null
}

export interface ReportTemplate {
    id: number
    name: string
    report_type: string
    definition_version?: number
    columns: string[]
    settings?: TemplateSettings | null
    created_at?: string
    updated_at?: string
}

/** Run defaults a template remembers; each run still states its own window. */
export interface TemplateSettings {
    period?: '1d' | '7d' | '30d'
    vehicle_ids?: number[] | null
    format?: 'csv' | 'xlsx'
}

export type RunStatus = 'pending' | 'processing' | 'ready' | 'failed'

export interface ReportRun {
    id: number
    template_name: string
    report_type: string
    format: 'csv' | 'xlsx'
    status: RunStatus
    progress?: number | null
    file_size_bytes?: number | null
    error_code?: string | null
    error_message?: string | null
    start_at?: string
    end_at?: string
    started_at?: string | null
    completed_at?: string | null
    expires_at?: string | null
    created_at?: string
}

export interface RunRequest {
    selection: { mode: 'all' } | { mode: 'ids'; ids: number[] } | { mode: 'cluster'; cluster_id: number }
    start_at: string
    end_at: string
    format: 'csv' | 'xlsx'
}

export const getReportTypes = async (): Promise<ReportTypeInfo[]> => {
    const res = await apiClient.get('/reports/types')
    return res.data?.data ?? []
}

export const getReportFields = async (type: string): Promise<ReportField[]> => {
    const res = await apiClient.get(`/reports/types/${type}/fields`)
    return (res.data?.data ?? res.data)?.fields ?? []
}

export const getReportTemplates = async (params?: { page?: number; per_page?: number; report_type?: string }) => {
    const res = await apiClient.get('/reports/templates', { params })
    return res.data?.data ?? res.data
}

export const createReportTemplate = async (data: { name: string; report_type: string; columns: string[]; settings?: TemplateSettings | null }) => {
    const res = await apiClient.post('/reports/templates', data)
    return res.data?.data ?? res.data
}

export const updateReportTemplate = async (id: number, data: Partial<{ name: string; report_type: string; columns: string[]; settings: TemplateSettings | null }>) => {
    const res = await apiClient.patch(`/reports/templates/${id}`, data)
    return res.data?.data ?? res.data
}

export const deleteReportTemplate = async (id: number) => {
    const res = await apiClient.delete(`/reports/templates/${id}`)
    return res.data
}

export const runReportTemplate = async (id: number, data: RunRequest): Promise<ReportRun> => {
    const res = await apiClient.post(`/reports/templates/${id}/runs`, data)
    return res.data?.data ?? res.data
}

export const getReportRuns = async (params?: { page?: number; per_page?: number; status?: RunStatus; report_type?: string }) => {
    const res = await apiClient.get('/reports/runs', { params })
    return res.data?.data ?? res.data
}

export const getReportRun = async (id: number): Promise<ReportRun> => {
    const res = await apiClient.get(`/reports/runs/${id}`)
    return res.data?.data ?? res.data
}

export const downloadReportRun = async (id: number) => {
    const res = await apiClient.get(`/reports/runs/${id}/download`, { responseType: 'blob' })
    return res.data as Blob
}
