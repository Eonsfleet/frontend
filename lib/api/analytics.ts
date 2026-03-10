import apiClient from './client'

// ── 3B. Fleet Utilization ─────────────────────────────────────────────────────

export const getFleetUtilizationSummary = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/utilization-summary')
    return res.data
}

export const getFleetVehicleList = async (params?: { filter?: string; per_page?: number; page?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/vehicle-list', { params })
    return res.data
}

export const getFleetAvailabilitySnapshot = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/availability-snapshot')
    return res.data
}

export const getFleetAvailabilityTrend = async (params?: { filter?: '30d' | '90d' | '1y' }): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/availability-trend', { params })
    return res.data
}

export const getFleetTopVehicles = async (params?: { limit?: number; filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/top-vehicles', { params })
    return res.data
}

export const getFleetAssetPerformance = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fleet/asset-performance')
    return res.data
}

// ── 3C. Driver Performance ────────────────────────────────────────────────────

export const getDriverTripSummary = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/trip-summary', { params })
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
}): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/top-by-trips', { params })
    return res.data
}

export const getDriverWorkloadDistribution = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/workload-distribution')
    return res.data
}

export const getDriverCompliance = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/compliance')
    return res.data
}

export const getDriverIncidentHistory = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/drivers/incident-history', { params })
    return res.data
}

// ── 3D. Fuel Management ───────────────────────────────────────────────────────

export const getFuelConsumptionReport = async (params?: {
    period?: 'daily' | 'weekly' | 'monthly'
    filter?: string
    date_from?: string
    date_to?: string
    vehicle_id?: number
    cluster_id?: number
    sort_by?: string
    per_page?: number
    page?: number
}): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/consumption-report', { params })
    return res.data
}

export const getFuelCostReport = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/cost-report', { params })
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
}): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/efficiency-report', { params })
    return res.data
}

export const getFuelAnomalyReport = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/anomaly-report', { params })
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
}): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/card-transactions', { params })
    return res.data
}

export const getFuelTopBottomVehicles = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/top-bottom-vehicles', { params })
    return res.data
}

export const getFuelDriverEfficiency = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/driver-efficiency', { params })
    return res.data
}

export const getFuelExecutiveKpis = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/fuel/executive-kpis')
    return res.data
}

// ── 3F. Incident Analytics ────────────────────────────────────────────────────

export const getIncidentSummary = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/summary')
    return res.data
}

export const getIncidentTypeDistribution = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/type-distribution')
    return res.data
}

export const getIncidentPriorityDistribution = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/priority-distribution')
    return res.data
}

export const getIncidentsOverTime = async (params?: { filter?: '7d' | '30d' | '90d' | '1y' }): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/over-time', { params })
    return res.data
}

export const getIncidentResolutionTime = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/resolution-time')
    return res.data
}

export const getIncidentsByVehicle = async (params?: { limit?: number }): Promise<any> => {
    const res = await apiClient.get('/analytics/incidents/by-vehicle', { params })
    return res.data
}

// ── 3G. Fleet Insights (AI/ML) ────────────────────────────────────────────────

export const getFleetHealthScore = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/fleet-health-score')
    return res.data
}

export const getCostPerKmTrend = async (params?: { filter?: string }): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/cost-per-km', { params })
    return res.data
}

export const getDriverRiskRanking = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/driver-risk-ranking')
    return res.data
}

export const getPredictiveMaintenance = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/predictive-maintenance')
    return res.data
}

export const getFuelMisuseProbability = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/insights/fuel-misuse-probability')
    return res.data
}

export const detectAnomalies = async (params: {
    days?: number
    target?: 'fuel' | 'maintenance' | 'trips'
    vehicle_ids?: number[]
    period?: string
}): Promise<any> => {
    const res = await apiClient.post('/analytics/insights/detect-anomalies', params, { params })
    return res.data
}

export const getDeviceStatusSummary = async (): Promise<any> => {
    const res = await apiClient.get('/analytics/gps/device-status')
    return res.data?.data ?? res.data
}
