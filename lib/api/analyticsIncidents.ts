import apiClient from './client'
import type { IncidentPriorityRow, IncidentResolution, IncidentTypeRow, IncidentVehicleRow } from '@/types/analytics'

/**
 * Typed calls behind the Incidents tab, besides the summary and the over-time
 * series (analyticsOverview.ts). Everything here is all-time: none of these
 * endpoints reads a period. A driver-role user gets only their own incidents.
 */

const unwrap = <T,>(body: { data?: T } & Partial<T>): T => (body?.data ?? body) as T

/** The backend sends labels, data and a `detail` list; the list is what is used. */
export const getIncidentTypes = async (): Promise<IncidentTypeRow[]> => {
    const body = unwrap<{ detail?: IncidentTypeRow[] }>((await apiClient.get('/analytics/incidents/type-distribution')).data)
    return body.detail ?? []
}

export const getIncidentPriorities = async (): Promise<IncidentPriorityRow[]> => {
    const body = unwrap<{ detail?: IncidentPriorityRow[] }>((await apiClient.get('/analytics/incidents/priority-distribution')).data)
    return body.detail ?? []
}

export const getIncidentResolution = async (): Promise<IncidentResolution> =>
    unwrap((await apiClient.get('/analytics/incidents/resolution-time')).data)

export const INCIDENT_VEHICLE_LIMIT = 10

export const getIncidentVehicles = async (limit = INCIDENT_VEHICLE_LIMIT): Promise<IncidentVehicleRow[]> => {
    const body = unwrap<IncidentVehicleRow[]>((await apiClient.get('/analytics/incidents/by-vehicle', { params: { limit } })).data)
    return Array.isArray(body) ? body : []
}
