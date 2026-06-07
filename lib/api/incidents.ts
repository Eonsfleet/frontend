import apiClient from './client'
import { Incident, IncidentStatus, ConversationMessage, WorkflowHistoryEntry } from '@/types'
import { ApiPagination } from './maintenance'

export interface IncidentListResponse {
    message: string
    data: {
        incidents: Incident[]
        pagination: ApiPagination
    }
}

export interface IncidentDetailResponse {
    message: string
    data: Incident
}

export interface IncidentConversationResponse {
    data: {
        conversation: {
            id: number | string
            attributes?: {
                title?: string
                status?: string
                participants?: unknown[]
                last_activity_at?: string
                created_at?: string
            }
            relationships?: {
                messages?: ConversationMessage[]
            }
        }
    }
}

export interface IncidentHistoryResponse {
    data: { history: WorkflowHistoryEntry[] }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const getIncidents = async (params?: {
    page?: number
    per_page?: number
    status?: IncidentStatus
    type?: string
    q?: string
    orderBy?: 'asc' | 'desc'
}): Promise<IncidentListResponse> => {
    const response = await apiClient.get<IncidentListResponse>('/incidents', { params })
    return response.data
}

export const getIncidentById = async (id: string): Promise<IncidentDetailResponse> => {
    const response = await apiClient.get<IncidentDetailResponse>(`/incidents/${id}`)
    return response.data
}

export const createIncident = async (data: {
    vehicle_id?: number | string
    victim_name?: string
    type: string
    date: string
    time: string
    street?: string
    state?: string
    city?: string
    coords?: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    media?: string[]
    witness?: Array<{ name: string; phone: string; statement?: string }>
}): Promise<IncidentDetailResponse> => {
    const response = await apiClient.post<IncidentDetailResponse>('/incidents', data)
    return response.data
}

// PRD: use PUT (not PATCH); editable only in `reported` status
export const updateIncident = async (id: string, data: {
    description?: string
    priority?: string
    media?: string[]
}): Promise<IncidentDetailResponse> => {
    const response = await apiClient.put<IncidentDetailResponse>(`/incidents/${id}`, data)
    return response.data
}

export const deleteIncident = async (id: string): Promise<void> => {
    await apiClient.delete(`/incidents/${id}`)
}

// ── Workflow Transitions ───────────────────────────────────────────────────────

export const transitionIncidentState = async (
    id: string,
    action: string,
    payload?: Record<string, unknown>
): Promise<IncidentDetailResponse> => {
    const response = await apiClient.post<IncidentDetailResponse>(`/incidents/${id}/${action}`, payload)
    return response.data
}

// reported → under_investigation; requires assigned_to (user ID)
export const startInvestigation = (id: string, assignedTo: number | string) =>
    transitionIncidentState(id, 'investigate', { assigned_to: assignedTo })

// under_investigation → action_required; no body required
// B2 fix: 'action-required' not the legacy 'action'
export const requireAction = (id: string) =>
    transitionIncidentState(id, 'action-required')

// action_required → action_taken; requires action_taken string
export const logActionTaken = (id: string, actionTaken: string) =>
    transitionIncidentState(id, 'action-taken', { action_taken: actionTaken })

// action_taken → pending_resolution; requires resolved_notes
export const submitForResolution = (id: string, resolvedNotes: string) =>
    transitionIncidentState(id, 'pending-resolution', { resolved_notes: resolvedNotes })

// pending_resolution → resolved; requires resolved_notes
export const resolveIncident = (id: string, resolvedNotes: string) =>
    transitionIncidentState(id, 'resolve', { resolved_notes: resolvedNotes })

// resolved → closed; notes optional
export const closeIncident = (id: string, notes?: string) =>
    transitionIncidentState(id, 'close', notes ? { notes } : undefined)

// any open → cancelled; reason required
export const cancelIncident = (id: string, reason: string) =>
    transitionIncidentState(id, 'cancel', { reason })

// any open → dismissed; reason required; fleet_manager only
export const dismissIncident = (id: string, reason: string) =>
    transitionIncidentState(id, 'dismiss', { reason })

// any open → escalated; reason + severity required
export const escalateIncident = (id: string, reason: string, severity: string) =>
    transitionIncidentState(id, 'escalate', { reason, severity })

export const linkJobToIncident = async (id: string, job_id: number | string): Promise<any> => {
    const response = await apiClient.post(`/incidents/${id}/link-job`, { job_id })
    return response.data
}

// ── Conversation & History ────────────────────────────────────────────────────

export const getIncidentConversation = async (id: string): Promise<IncidentConversationResponse> => {
    const response = await apiClient.get<IncidentConversationResponse>(`/incidents/${id}/conversation`)
    return response.data
}

export const postIncidentMessage = async (
    id: string,
    data: { body: string; is_internal?: boolean }
): Promise<any> => {
    const response = await apiClient.post(`/incidents/${id}/messages`, data)
    return response.data
}

export const getIncidentHistory = async (id: string): Promise<IncidentHistoryResponse> => {
    const response = await apiClient.get<IncidentHistoryResponse>(`/incidents/${id}/history`)
    return response.data
}
