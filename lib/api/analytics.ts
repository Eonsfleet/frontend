import apiClient from './client'

// ── 3. Fleet Utilization ─────────────────────────────────────────────────────

export const getFleetUtilizationSummary = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/utilization-summary', { params })
    return res.data?.data ?? res.data
}

export const getFleetVehicleList = async (params?: { filter?: string; limit?: number; page?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/vehicle-list', { params })
    return res.data?.data ?? res.data
}

export const getFleetAvailabilitySnapshot = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/availability-snapshot')
    return res.data?.data ?? res.data
}

export const getFleetAvailabilityTrend = async (params?: { filter?: '7d' | '30d' | '90d' | '1y' }): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/availability-trend', { params })
    return res.data?.data ?? res.data
}

export const getFleetTopVehicles = async (params?: { limit?: number; filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/top-vehicles', { params })
    return res.data?.data ?? res.data
}

export const getFleetAssetPerformance = async (params?: { limit?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/asset-performance', { params })
    return res.data?.data ?? res.data
}

// ── 4. Driver Performance ────────────────────────────────────────────────────

export const getDriverTripSummary = async (params?: { filter?: string; limit?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/trip-summary', { params })
    return res.data?.data ?? res.data
}

export const getTopDriversByTrips = async (params?: {
    filter?: string
    limit?: number
}): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/top-by-trips', { params })
    return res.data?.data ?? res.data
}

export const getDriverWorkloadDistribution = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/workload-distribution', { params })
    return res.data?.data ?? res.data
}

export const getDriverCompliance = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/compliance')
    return res.data?.data ?? res.data
}

export const getDriverIncidentHistory = async (params?: { limit?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/incident-history', { params })
    return res.data?.data ?? res.data
}

// ── 5. Fuel Intelligence ───────────────────────────────────────────────────────

export const getFuelConsumptionReport = async (params?: {
    filter?: string
}): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/consumption-report', { params })
    return res.data?.data ?? res.data
}

export const getFuelCostReport = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/cost-report')
    return res.data?.data ?? res.data
}

export const getFuelEfficiencyReport = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/efficiency-report')
    return res.data?.data ?? res.data
}

export const getFuelAnomalyReport = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/anomaly-report')
    return res.data?.data ?? res.data
}

export const getFuelCardTransactions = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/card-transactions')
    return res.data?.data ?? res.data
}

export const getFuelTopBottomVehicles = async (params?: { months?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/top-bottom-vehicles', { params })
    return res.data?.data ?? res.data
}

export const getFuelDriverEfficiency = async (params?: {
    start_date?: string
    end_date?: string
    period?: string
}): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/driver-efficiency', { params })
    return res.data?.data ?? res.data
}

export const getFuelExecutiveKpis = async (params?: {
    period?: string
    filter?: string
}): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/executive-kpis', { params })
    return res.data?.data ?? res.data
}

// ── 6. Maintenance Analytics ────────────────────────────────────────────────

export const getMaintenanceScheduleCompliance = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/maintenance/schedule-compliance')
    return res.data?.data ?? res.data
}

export const getMaintenanceCostReport = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/maintenance/cost-report', { params })
    return res.data?.data ?? res.data
}

export const getMaintenanceWorkflowReport = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/maintenance/workflow-report')
    return res.data?.data ?? res.data
}

export const getMaintenanceDocumentCompliance = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/maintenance/document-compliance')
    return res.data?.data ?? res.data
}

export const getMaintenanceWorkshopSummary = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/maintenance/workshop-summary')
    return res.data?.data ?? res.data
}

export const getMaintenancePredictiveInsights = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/maintenance/predictive-insights')
    return res.data?.data ?? res.data
}

// ── 7. Incident Analytics ────────────────────────────────────────────────────

export const getIncidentSummary = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/summary')
    return res.data?.data ?? res.data
}

export const getIncidentTypeDistribution = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/type-distribution')
    return res.data?.data ?? res.data
}

export const getIncidentPriorityDistribution = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/priority-distribution')
    return res.data?.data ?? res.data
}

export const getIncidentsOverTime = async (params?: { filter?: '7d' | '30d' | '90d' | '1y' }): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/over-time', { params })
    return res.data?.data ?? res.data
}

export const getIncidentResolutionTime = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/resolution-time')
    return res.data?.data ?? res.data
}

export const getIncidentsByVehicle = async (params?: { limit?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/by-vehicle', { params })
    return res.data?.data ?? res.data
}

// ── 8. GPS & Routes ──────────────────────────────────────────────────────────

export const getGpsTripSummary = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/gps/trip-summary', { params })
    return res.data?.data ?? res.data
}

export const getGpsTripsOverTime = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/gps/trips-over-time', { params })
    return res.data?.data ?? res.data
}

export const getGpsDistanceMileage = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/gps/distance-mileage', { params })
    return res.data?.data ?? res.data
}

export const getGpsTopByDistance = async (params?: { filter?: string; limit?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/gps/top-by-distance', { params })
    return res.data?.data ?? res.data
}

export const getGeofenceActivity = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/gps/geofence-activity', { params })
    return res.data?.data ?? res.data
}

export const getDeviceStatusSummary = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/gps/device-status')
    return res.data?.data ?? res.data
}

// ── 9. Fleet Insights (AI/ML) ────────────────────────────────────────────────

export const getFleetHealthScore = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/fleet-health-score')
    return res.data?.data ?? res.data
}

export const getCostPerKmTrend = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/cost-per-km', { params })
    return res.data?.data ?? res.data
}

export const getDriverRiskRanking = async (params?: { limit?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/driver-risk-ranking', { params })
    return res.data?.data ?? res.data
}

export const getPredictiveMaintenance = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/predictive-maintenance')
    return res.data?.data ?? res.data
}

export const getFuelMisuseProbability = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/fuel-misuse-probability')
    return res.data?.data ?? res.data
}

export const detectAnomalies = async (params: {
    days?: number
}): Promise<any> => {
    const res = await apiClient.post('/analytics/insights/detect-anomalies', params)
    return res.data?.data ?? res.data
}
