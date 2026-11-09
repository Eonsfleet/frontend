import apiClient from './client'
import type { LegacyPeriod } from './analyticsOverview'
import type { MaintenanceCost, MaintenanceDue, MaintenanceWorkflow, ScheduleSummary, WorkshopSummary } from '@/types/analytics'

/**
 * Typed calls behind the Maintenance tab. Only the cost report reads a period; the
 * rest are all-time or have a window of their own. Amounts are kobo.
 */

const unwrap = <T,>(body: { data?: T } & Partial<T>): T => (body?.data ?? body) as T

export const getScheduleSummary = async (): Promise<ScheduleSummary> => {
    const body = unwrap<{ summary: ScheduleSummary }>((await apiClient.get('/analytics/maintenance/schedule-compliance')).data)
    return body.summary
}

export const getMaintenanceCost = async (filter: LegacyPeriod): Promise<MaintenanceCost> =>
    unwrap((await apiClient.get('/analytics/maintenance/cost-report', { params: { filter } })).data)

export const getMaintenanceWorkflow = async (): Promise<MaintenanceWorkflow> =>
    unwrap((await apiClient.get('/analytics/maintenance/workflow-report')).data)

export const getWorkshopSummary = async (): Promise<WorkshopSummary> =>
    unwrap((await apiClient.get('/analytics/maintenance/workshop-summary')).data)

/** Needs the insights permission, which is separate from the maintenance one. */
export const getMaintenanceDue = async (): Promise<MaintenanceDue> =>
    unwrap((await apiClient.get('/analytics/insights/predictive-maintenance')).data)
