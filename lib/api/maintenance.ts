import apiClient from './client'
import {
    MaintenanceSchedule,
    MaintenanceJob,
    MaintenanceAlert,
    MaintenanceLog,
    MaintenancePart,
    MaintenanceCostSummary,
    ConversationMessage,
    WorkflowHistoryEntry,
} from '@/types'

// ── Pagination shape (matches actual backend) ─────────────────────────────────
export interface ApiPagination {
    current_page: number
    per_page: number
    total: number
    last_page: number
}

// ── Response interfaces ───────────────────────────────────────────────────────

export interface MaintenanceListResponse {
    message: string
    data: {
        schedules: MaintenanceSchedule[]
        pagination: ApiPagination
    }
}

export interface MaintenanceScheduleDetailResponse {
    message: string
    data: { schedule: MaintenanceSchedule }
}

export interface MaintenanceJobListResponse {
    message: string
    data: {
        jobs: MaintenanceJob[]
        pagination: ApiPagination
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
        pagination: ApiPagination
    }
}

export interface MaintenanceAlertDetailResponse {
    message: string
    data: MaintenanceAlert
}

export interface MaintenanceLogListResponse {
    message: string
    data: {
        logs: MaintenanceLog[]
        pagination?: ApiPagination
    }
}

export interface MaintenancePartsResponse {
    message?: string
    data: { parts: MaintenancePart[] }
}

export interface MaintenanceCostSummaryResponse {
    message?: string
    data: { cost_summary: MaintenanceCostSummary }
}

export interface ConversationResponse {
    data: {
        conversation: {
            id: number | string
            messages: ConversationMessage[]
        }
    }
}

export interface HistoryResponse {
    data: { history: WorkflowHistoryEntry[] }
}

export interface ChecklistItem {
    id: number | string
    name: string
}

export interface ChecklistResponse {
    data: { checklists: ChecklistItem[] }
}

export interface WorkflowSettings {
    finance_threshold_enabled: boolean
    cost_threshold: number
    minimum_approvals: number
    required_role: string
}

export interface WorkflowSettingsResponse {
    message?: string
    data: {
        settings: WorkflowSettings
    }
}

// ── 0. Workflow Settings ─────────────────────────────────────────────────────

export const getWorkflowSettings = async (type: string = 'maintenance'): Promise<WorkflowSettingsResponse> => {
    const response = await apiClient.get<WorkflowSettingsResponse>(`/workflow-settings/${type}`)
    return response.data
}

export const updateWorkflowSettings = async (
    type: string = 'maintenance',
    data: Partial<WorkflowSettings>
): Promise<WorkflowSettingsResponse> => {
    const response = await apiClient.put<WorkflowSettingsResponse>(`/workflow-settings/${type}`, data)
    return response.data
}

// ── 1A. Scheduling ────────────────────────────────────────────────────────────

export const getMaintenances = async (params?: {
    page?: number
    per_page?: number
    status?: string
    q?: string
    orderBy?: 'asc' | 'desc'
    sortBy?: string
}): Promise<MaintenanceListResponse> => {
    const response = await apiClient.get<MaintenanceListResponse>('/maintenances', { params })
    return response.data
}

export const createSchedule = async (data: {
    vehicle_id: number | string
    service_type: string
    schedule_type: 'time' | 'mileage'
    interval_value?: number
    interval_unit?: 'days' | 'weeks' | 'months'
    schedule_date?: string
    is_recurring?: boolean
    end_date?: string
    occurrences?: number
    priority?: string
    description?: string
    service_duration?: number
    technician_id?: number | string
    vendor_id?: number | string
    turn_on_notification?: boolean
    checklists?: number[]
    note?: string
}): Promise<MaintenanceScheduleDetailResponse> => {
    const response = await apiClient.post<MaintenanceScheduleDetailResponse>('/maintenances/schedule', data)
    return response.data
}

export const getScheduleById = async (id: string | number): Promise<MaintenanceScheduleDetailResponse> => {
    const response = await apiClient.get<MaintenanceScheduleDetailResponse>(`/maintenances/schedule/${id}`)
    return response.data
}

export const updateSchedule = async (
    id: string | number,
    data: Record<string, unknown>
): Promise<MaintenanceScheduleDetailResponse> => {
    const response = await apiClient.put<MaintenanceScheduleDetailResponse>(`/maintenances/schedule/${id}`, data)
    return response.data
}

export const deleteSchedule = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/maintenances/schedule/${id}`)
}

export const assignVendorToSchedule = async (
    id: string | number,
    data: { vendor_id: number | string; priority?: string }
): Promise<MaintenanceScheduleDetailResponse> => {
    const response = await apiClient.put<MaintenanceScheduleDetailResponse>(
        `/maintenances/schedule/${id}/assign-vendor`,
        data
    )
    return response.data
}

export const getVehicleMaintenanceSchedules = async (vehicleId: string | number): Promise<MaintenanceListResponse> => {
    const response = await apiClient.get<MaintenanceListResponse>(`/maintenances/schedule/vehicle/${vehicleId}`)
    return response.data
}

export const getScheduleChecklists = async (scheduleId: string | number): Promise<ChecklistResponse> => {
    const response = await apiClient.get<ChecklistResponse>(`/maintenances/schedule/${scheduleId}/checklists`)
    return response.data
}

export const getAllOrgChecklists = async (): Promise<ChecklistResponse> => {
    const response = await apiClient.get<ChecklistResponse>('/maintenances/schedule/checklists/all')
    return response.data
}

export const getChecklistTemplates = async (params?: { q?: string }): Promise<ChecklistResponse> => {
    const response = await apiClient.get<ChecklistResponse>('/maintenances/checklists', { params })
    return response.data
}

export const createChecklistItem = async (data: { name: string; description?: string }): Promise<any> => {
    const response = await apiClient.post('/maintenances/checklists', data)
    return response.data
}

export const getUpcomingMaintenance = async (): Promise<any> => {
    const response = await apiClient.get('/maintenances/upcoming')
    return response.data
}

export const getMaintenanceStats = async (params?: { filter?: string }): Promise<any> => {
    const response = await apiClient.get('/maintenances/stats', { params })
    return response.data
}

// ── 1B. Maintenance Logs ──────────────────────────────────────────────────────

export const getMaintenanceLogs = async (params?: {
    page?: number
    per_page?: number
}): Promise<MaintenanceLogListResponse> => {
    const response = await apiClient.get<MaintenanceLogListResponse>('/maintenances/logs', { params })
    return response.data
}

export const getLogsBySchedule = async (scheduleId: string | number): Promise<MaintenanceLogListResponse> => {
    const response = await apiClient.get<MaintenanceLogListResponse>(`/maintenances/logs/${scheduleId}`)
    return response.data
}

export const getMyAssignedLogs = async (): Promise<MaintenanceLogListResponse> => {
    const response = await apiClient.get<MaintenanceLogListResponse>('/maintenances/logs/assigned-to-me')
    return response.data
}

export const getLogMetrics = async (): Promise<any> => {
    const response = await apiClient.get('/maintenances/logs/metric')
    return response.data
}

export const updateLogStatus = async (logId: string | number, status: string): Promise<any> => {
    const response = await apiClient.put(`/maintenances/logs/update-status/${logId}`, { status })
    return response.data
}

export const assignLog = async (
    logId: string | number,
    data: { vendor_id?: number; technician_id?: number }
): Promise<any> => {
    const response = await apiClient.post(`/maintenances/logs/${logId}/assign`, data)
    return response.data
}

export const startLog = async (logId: string | number): Promise<any> => {
    const response = await apiClient.post(`/maintenances/logs/${logId}/start`)
    return response.data
}

export const completeLog = async (logId: string | number): Promise<any> => {
    const response = await apiClient.post(`/maintenances/logs/${logId}/complete`)
    return response.data
}

export const verifyLog = async (logId: string | number): Promise<any> => {
    const response = await apiClient.post(`/maintenances/logs/${logId}/verify`)
    return response.data
}

export const cancelLog = async (logId: string | number, reason: string): Promise<any> => {
    const response = await apiClient.post(`/maintenances/logs/${logId}/cancel`, { reason })
    return response.data
}

export const updateLogProgress = async (
    logId: string | number,
    data: { progress: number; note?: string }
): Promise<any> => {
    const response = await apiClient.patch(`/maintenances/logs/${logId}/progress`, data)
    return response.data
}

export const getLogParts = async (logId: string | number): Promise<MaintenancePartsResponse> => {
    const response = await apiClient.get<MaintenancePartsResponse>(`/maintenances/logs/${logId}/parts`)
    return response.data
}

export const addLogPart = async (
    logId: string | number,
    data: { name: string; quantity: number; unit_price_kobo: number; supplier?: string }
): Promise<any> => {
    const response = await apiClient.post(`/maintenances/logs/${logId}/parts`, data)
    return response.data
}

export const deleteLogPart = async (logId: string | number, partId: string | number): Promise<void> => {
    await apiClient.delete(`/maintenances/logs/${logId}/parts/${partId}`)
}

export const uploadLogAttachment = async (logId: string | number, formData: FormData): Promise<any> => {
    const response = await apiClient.post(`/maintenances/logs/${logId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

// ── 1C. Maintenance Alerts ────────────────────────────────────────────────────

export const getMaintenanceAlerts = async (params?: {
    page?: number
    per_page?: number
    status?: string
}): Promise<MaintenanceAlertListResponse> => {
    const response = await apiClient.get<MaintenanceAlertListResponse>('/maintenance/alerts', { params })
    return response.data
}

export const getMaintenanceAlertById = async (id: string | number): Promise<MaintenanceAlertDetailResponse> => {
    const response = await apiClient.get<MaintenanceAlertDetailResponse>(`/maintenance/alerts/${id}`)
    return response.data
}

export const acknowledgeMaintenanceAlert = async (id: string | number): Promise<any> => {
    const response = await apiClient.patch(`/maintenance/alerts/${id}/acknowledge`)
    return response.data
}

export const snoozeMaintenanceAlert = async (
    id: string | number,
    data: { snooze_days: number; reason?: string }
): Promise<any> => {
    const response = await apiClient.patch(`/maintenance/alerts/${id}/snooze`, data)
    return response.data
}

// B4 fix: payload is now required
export const createWorkOrderFromAlert = async (
    id: string | number,
    data: {
        title: string
        description: string
        fault_category: string
        cost_estimate_kobo?: number
        vendor_id?: number | string
        driver_id?: number | string
    }
): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.post<MaintenanceJobDetailResponse>(`/maintenance/alerts/${id}/work-order`, data)
    return response.data
}

export const getAlertHistory = async (id: string | number): Promise<HistoryResponse> => {
    const response = await apiClient.get<HistoryResponse>(`/maintenance/alerts/${id}/history`)
    return response.data
}

export const getAlertConversation = async (id: string | number): Promise<ConversationResponse> => {
    const response = await apiClient.get<ConversationResponse>(`/maintenance/alerts/${id}/conversation`)
    return response.data
}

export const postAlertMessage = async (
    id: string | number,
    data: { body: string; is_internal?: boolean }
): Promise<any> => {
    const response = await apiClient.post(`/maintenance/alerts/${id}/messages`, data)
    return response.data
}

// ── 1D. Maintenance Jobs ──────────────────────────────────────────────────────

export const getMaintenanceJobs = async (params?: {
    page?: number
    per_page?: number
    status?: string
    vehicle_id?: string
    q?: string
}): Promise<MaintenanceJobListResponse> => {
    const response = await apiClient.get<MaintenanceJobListResponse>('/maintenance/jobs', { params })
    return response.data
}

export const createMaintenanceJob = async (data: {
    vehicle_id: number | string
    title: string
    description: string
    fault_category: string
    cost_estimate_kobo: number
    driver_id?: number | string
}): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.post<MaintenanceJobDetailResponse>('/maintenance/jobs', data)
    return response.data
}

export const getMaintenanceJobById = async (id: string | number): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.get<MaintenanceJobDetailResponse>(`/maintenance/jobs/${id}`)
    return response.data
}

// B1 fix: payload key is `to_status`, not `status`
export const transitionMaintenanceJob = async (
    id: string | number,
    data: { to_status: string; reason?: string; notes?: string }
): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.patch<MaintenanceJobDetailResponse>(`/maintenance/jobs/${id}/transition`, data)
    return response.data
}

/** @deprecated Use transitionMaintenanceJob — kept for backward compat with existing Kanban */
export const updateMaintenanceJobStatus = async (
    id: string,
    status: string
): Promise<MaintenanceJobDetailResponse> => transitionMaintenanceJob(id, { to_status: status })

export const approveMaintenanceJob = async (
    id: string | number,
    data: {
        decision: 'approved' | 'rejected'
        reason?: string
        from_status?: string
        to_status?: string
    }
): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.post<MaintenanceJobDetailResponse>(`/maintenance/jobs/${id}/approve`, data)
    return response.data
}

export const assignMaintenanceJob = async (
    id: string | number,
    data: { vendor_id: number | string }
): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.post<MaintenanceJobDetailResponse>(`/maintenance/jobs/${id}/assign`, data)
    return response.data
}

export const getJobCostSummary = async (id: string | number): Promise<MaintenanceCostSummaryResponse> => {
    const response = await apiClient.get<MaintenanceCostSummaryResponse>(`/maintenance/jobs/${id}/cost-summary`)
    return response.data
}

export const verifyMaintenanceJob = async (id: string | number): Promise<MaintenanceJobDetailResponse> => {
    const response = await apiClient.post<MaintenanceJobDetailResponse>(`/maintenance/jobs/${id}/verify`)
    return response.data
}

export const reviewMaintenanceJob = async (
    id: string | number,
    data: { rating: number; comment?: string }
): Promise<any> => {
    const response = await apiClient.post(`/maintenance/jobs/${id}/review`, data)
    return response.data
}

export const getJobHistory = async (id: string | number): Promise<HistoryResponse> => {
    const response = await apiClient.get<HistoryResponse>(`/maintenance/jobs/${id}/history`)
    return response.data
}

export const getJobConversation = async (id: string | number): Promise<ConversationResponse> => {
    const response = await apiClient.get<ConversationResponse>(`/maintenance/jobs/${id}/conversation`)
    return response.data
}

export const postJobMessage = async (
    id: string | number,
    data: { body: string; is_internal?: boolean }
): Promise<any> => {
    const response = await apiClient.post(`/maintenance/jobs/${id}/messages`, data)
    return response.data
}

export const deleteMaintenanceJob = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/maintenance/jobs/${id}`)
}

// ── 1E. Maintenance Analytics ─────────────────────────────────────────────────

export const getMaintenanceScheduleCompliance = async (): Promise<any> => {
    const response = await apiClient.get('/analytics/maintenance/schedule-compliance')
    return response.data
}

export const getMaintenanceCostReport = async (params?: { filter?: string }): Promise<any> => {
    const response = await apiClient.get('/analytics/maintenance/cost-report', { params })
    return response.data
}

export const getMaintenanceWorkflowReport = async (): Promise<any> => {
    const response = await apiClient.get('/analytics/maintenance/workflow-report')
    return response.data
}

export const getMaintenanceDocumentCompliance = async (): Promise<any> => {
    const response = await apiClient.get('/analytics/maintenance/document-compliance')
    return response.data
}

export const getMaintenanceWorkshopSummary = async (): Promise<any> => {
    const response = await apiClient.get('/analytics/maintenance/workshop-summary')
    return response.data
}
