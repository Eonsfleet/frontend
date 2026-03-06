import apiClient from './client'
import { Paginated, Incident, IncidentStatus } from '@/types'

export interface IncidentListResponse {
    message: string
    data: {
        incidents: Incident[]
        pagination: Paginated<Incident>['pagination']
    }
}

export interface IncidentDetailResponse {
    message: string
    data: Incident
}

export const getIncidents = async (params?: { page?: number; per_page?: number; status?: IncidentStatus }): Promise<IncidentListResponse> => {
    const response = await apiClient.get<IncidentListResponse>('/incidents', { params })
    return response.data
}

export const getIncidentById = async (id: string): Promise<IncidentDetailResponse> => {
    const response = await apiClient.get<IncidentDetailResponse>(`/incidents/${id}`)
    return response.data
}

export const createIncident = async (data: any): Promise<IncidentDetailResponse> => {
    const response = await apiClient.post<IncidentDetailResponse>('/incidents', data)
    return response.data
}

// 9-State Machine Transition API Calls
export const transitionIncidentState = async (id: string, action: string, payload?: { note?: string, assignee_id?: string }): Promise<IncidentDetailResponse> => {
    // Action maps to the endpoint, e.g., 'investigate' -> /incidents/{id}/investigate
    const response = await apiClient.post<IncidentDetailResponse>(`/incidents/${id}/${action}`, payload)
    return response.data
}

// Additional specific bindings matching the PRD
export const startInvestigation = (id: string, note?: string) => transitionIncidentState(id, 'investigate', { note })
export const requireAction = (id: string, note?: string) => transitionIncidentState(id, 'action', { note })
export const logActionTaken = (id: string, note?: string) => transitionIncidentState(id, 'action-taken', { note }) // Assuming kabab-case or exact match from backend
export const resolveIncident = (id: string, note?: string) => transitionIncidentState(id, 'resolve', { note })
export const closeIncident = (id: string, note?: string) => transitionIncidentState(id, 'close', { note })
export const cancelIncident = (id: string, note?: string) => transitionIncidentState(id, 'cancel', { note })
export const escalateIncident = (id: string, note?: string) => transitionIncidentState(id, 'escalate', { note })
export const dismissIncident = (id: string, note?: string) => transitionIncidentState(id, 'dismiss', { note })

export const linkJobToIncident = async (id: string, job_id: string): Promise<any> => {
    const response = await apiClient.post(`/incidents/${id}/link-job`, { job_id })
    return response.data
}
