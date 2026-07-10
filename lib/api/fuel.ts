import apiClient from './client'
import {
    FuelExpense,
    FuelExpenseMetrics,
    FuelCardAccount,
    FuelCardProviderType,
    FuelCardTransaction,
    FuelCardProvider,
    FuelReconciliationDiscrepancy,
    FuelReconciliationReport,
    FuelVehicle,
    FuelAbnormality,
    FuelSettings,
} from '@/types'

// ── Pagination shape returned by fuel API endpoints ──────────────────────────
export interface FuelPagination {
    total: number
    per_page: number
    current_page: number
    last_page: number
}

// ── 8.1 Fuel Expenses ────────────────────────────────────────────────────────

export interface FuelExpenseListParams {
    q?: string
    status?: string
    vehicle_id?: number
    user_id?: number
    start_date?: string
    end_date?: string
    page?: number
    per_page?: number
    sortBy?: string
    orderBy?: 'asc' | 'desc'
}

export interface FuelExpenseListResponse {
    message: string
    data: {
        fuel_expenses: FuelExpense[]
        pagination: FuelPagination
    }
    status: number
}

export const getFuelExpenses = async (params?: FuelExpenseListParams): Promise<FuelExpenseListResponse> => {
    const response = await apiClient.get<FuelExpenseListResponse>('/fuel-expenses', { params })
    return response.data
}

export const getFuelExpenseMetrics = async (): Promise<{ data: FuelExpenseMetrics }> => {
    const response = await apiClient.get<{ data: FuelExpenseMetrics }>('/fuel-expenses/metrics')
    return response.data
}

export interface CreateFuelExpensePayload {
    vehicle_id: number
    user_id: number
    cost_per_volume: number
    volume: number
    currency?: string | null
    fuel_transaction_id?: number | null
    purchase_from?: string | null
    receipt_url?: string | null
    reference_number?: string | null
    status?: 'pending_approval' | 'approved' | 'rejected' | 'reimbursed' | null
    entry_date: string
}

export const createFuelExpense = async (payload: CreateFuelExpensePayload): Promise<{ message: string; data: { fuel_expense: FuelExpense } }> => {
    const response = await apiClient.post('/fuel-expenses', payload)
    return response.data
}

export const updateFuelExpense = async (id: string | number, payload: Partial<CreateFuelExpensePayload>): Promise<{ message: string; data: { fuel_expense: FuelExpense } }> => {
    const response = await apiClient.put(`/fuel-expenses/${id}`, payload)
    return response.data
}

export const deleteFuelExpense = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/fuel-expenses/${id}`)
}

export const approveFuelExpense = async (id: string | number): Promise<{ message: string; data: { id: string | number; attributes: { status: string; approved_at: string } } }> => {
    const response = await apiClient.post(`/fuel-expenses/${id}/approve`)
    return response.data
}

export const rejectFuelExpense = async (id: string | number, reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/fuel-expenses/${id}/reject`, { reason })
    return response.data
}

export interface FuelExpenseExportParams {
    q?: string
    status?: string
    vehicle_id?: number
    user_id?: number
    type?: string
    start_date?: string
    end_date?: string
    limit?: number
}

export const exportFuelExpenses = async (params?: FuelExpenseExportParams): Promise<Blob> => {
    const response = await apiClient.get('/fuel-expenses/export', { params, responseType: 'blob' })
    return response.data
}

export const linkExpenseTransaction = async (id: string | number, fuel_transaction_id: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/fuel-expenses/${id}/link-transaction`, { fuel_transaction_id })
    return response.data
}

export const unlinkExpenseTransaction = async (id: string | number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/fuel-expenses/${id}/unlink-transaction`)
    return response.data
}

// ── 8.2 Fuel Card Management ─────────────────────────────────────────────────

// Provider types (configured by platform)
export const getFuelCardProviderTypes = async (): Promise<{ data: { provider_types: FuelCardProviderType[] } }> => {
    const response = await apiClient.get('/fuel-card/provider-types')
    return response.data
}

// Org fuel card account
export const getFuelCardAccount = async (): Promise<{ data: { account: FuelCardAccount } }> => {
    const response = await apiClient.get('/fuel-card/account')
    return response.data
}

export interface CreateFuelCardAccountPayload {
    provider_type: 'ovh' | 'total' | 'generic_csv'
    account_name: string
    virtual_account_number?: string
    contact_name?: string
    contact_email?: string
    contact_phone?: string
    vehicle_ids: number[]
    metadata?: Record<string, unknown>
}

export const createFuelCardAccount = async (payload: CreateFuelCardAccountPayload): Promise<{ message: string; data: { account: FuelCardAccount } }> => {
    const response = await apiClient.post('/fuel-card/account', payload)
    return response.data
}

export const updateFuelCardAccount = async (accountId: number, payload: Partial<Omit<CreateFuelCardAccountPayload, 'provider_type' | 'vehicle_ids'>>): Promise<{ message: string; data: { account: FuelCardAccount } }> => {
    const response = await apiClient.put(`/fuel-card/account/${accountId}`, payload)
    return response.data
}

export const addVehiclesToAccount = async (accountId: number, vehicle_ids: number[]): Promise<{ message: string; data: { account: FuelCardAccount } }> => {
    const response = await apiClient.post(`/fuel-card/account/${accountId}/vehicles`, { vehicle_ids })
    return response.data
}

export const removeVehicleFromAccount = async (accountId: number, vehicleId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/fuel-card/account/${accountId}/vehicles/${vehicleId}`)
    return response.data
}

// Card transactions
export interface CardTransactionListParams {
    vehicle_id?: number
    start_date?: string
    end_date?: string
    per_page?: number
    page?: number
}

export interface CardTransactionListResponse {
    data: {
        fuel_card_transactions: FuelCardTransaction[]
        pagination: FuelPagination
    }
}

export const getCardTransactions = async (params?: CardTransactionListParams): Promise<CardTransactionListResponse> => {
    const response = await apiClient.get<CardTransactionListResponse>('/fuel-card/transactions', { params })
    return response.data
}

// Fuel transactions
export interface FuelTransactionListParams {
    q?: string
    vehicle_id?: number
    type?: string
    start_date?: string
    end_date?: string
    per_page?: number
    page?: number
    sort_by?: string
    order_by?: 'asc' | 'desc'
}

export type FuelTransactionApiItem = {
    id?: string | number
    attributes?: Record<string, unknown>
    relationships?: Record<string, unknown>
    [key: string]: unknown
}

export interface FuelTransactionListResponse {
    data:
        | FuelTransactionApiItem[]
        | {
            fuel_transactions?: FuelTransactionApiItem[]
            transactions?: FuelTransactionApiItem[]
            pagination?: FuelPagination
        }
    meta?: {
        pagination?: FuelPagination
    }
}

export const getFuelTransactions = async (params?: FuelTransactionListParams): Promise<FuelTransactionListResponse> => {
    const response = await apiClient.get<FuelTransactionListResponse>('/fuel-transactions', { params })
    return response.data
}

export const linkTransactionToVehicle = async (transactionId: string, vehicle_id: number): Promise<{ message: string; data: { fuel_card_transaction: FuelCardTransaction } }> => {
    const response = await apiClient.post(`/fuel-card/transactions/${transactionId}/link-vehicle`, { vehicle_id })
    return response.data
}

export const createExpenseFromTransaction = async (transactionId: string): Promise<{ message: string; data: { expense: FuelExpense } }> => {
    const response = await apiClient.post(`/fuel-card/transactions/${transactionId}/create-expense`)
    return response.data
}

export const approveCardTransaction = async (transactionId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/fuel-card/transactions/${transactionId}/approve`)
    return response.data
}

export const disputeCardTransaction = async (transactionId: string, reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/fuel-card/transactions/${transactionId}/dispute`, { reason })
    return response.data
}

export const matchCardTransaction = async (transactionId: string, fuel_transaction_id: number): Promise<{ message: string; data: { transaction: FuelCardTransaction; matched_to: unknown; discrepancy_percent: number } }> => {
    const response = await apiClient.post(`/fuel-card/transactions/${transactionId}/match`, { fuel_transaction_id })
    return response.data
}

export const ingestCardData = async (formData: FormData): Promise<{ message: string; data: { created: number; skipped: number } }> => {
    const response = await apiClient.post('/fuel-card/ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
}

// Read-only provider list (backoffice managed)
export const getFuelCardProviders = async (): Promise<{ message: string; data: FuelCardProvider[] }> => {
    const response = await apiClient.get('/fuel-card-providers')
    return response.data
}

// ── 8.3 Reconciliation ───────────────────────────────────────────────────────

export interface ReconciliationParams {
    start_date?: string
    end_date?: string
    vehicle_id?: number
}

export const getReconciliationReport = async (params?: ReconciliationParams): Promise<{ data: FuelReconciliationReport }> => {
    const response = await apiClient.get('/fuel-reconciliation/report', { params })
    return response.data
}

export const runReconciliationEngine = async (params?: ReconciliationParams): Promise<{ message: string; data: { matched_count: number; unmatched_transactions_count: number; unmatched_expenses_count: number } }> => {
    const response = await apiClient.post('/fuel-reconciliation/run', {}, { params })
    return response.data
}

export interface DiscrepancyListParams {
    vehicle_id?: number
    start_date?: string
    end_date?: string
    per_page?: number
    page?: number
}

export interface DiscrepancyListResponse {
    data: {
        discrepancies: FuelReconciliationDiscrepancy[]
        pagination: FuelPagination
    }
}

export const getDiscrepancies = async (params?: DiscrepancyListParams): Promise<DiscrepancyListResponse> => {
    const response = await apiClient.get<DiscrepancyListResponse>('/fuel-reconciliation/discrepancies', { params })
    return response.data
}

// ── 8.4 Reports ──────────────────────────────────────────────────────────────

export const getIftaReport = async (quarter: number, year: number): Promise<{
    message: string;
    data: {
        quarter: number;
        year: number;
        period_start: string;
        period_end: string;
        by_jurisdiction: Array<{
            jurisdiction_code: string;
            fuel_liters: number;
            fuel_gallons: number;
            distance_km: number | null;
            distance_miles: number | null;
        }>;
        distance_source: string | null;
    }
}> => {
    const response = await apiClient.get('/fuel/compliance/ifta-report', { params: { quarter, year } })
    return response.data
}

export const getTheftSummary = async (params?: { start_date?: string; end_date?: string }): Promise<{ message: string; data: { total_incidents: number; total_liters_lost: number; vehicles_affected: number[]; incidents: Array<{ vehicle_id: number; registration_number: string; alert_id: number; liters_lost: number; confidence: number; occurred_at: string; location: { lat: number; lng: number; address: string } }> } }> => {
    const response = await apiClient.get('/fuel/reports/theft-summary', { params })
    return response.data
}

export const getCostAnalysis = async (params?: { start_date?: string; end_date?: string }): Promise<{ message: string; data: { total_cost_kobo: number; total_volume_liters: number; average_cost_per_liter_kobo: number; by_vehicle: Array<{ vehicle_id: number; registration_number: string; make: string; model: string; total_cost_kobo: number; total_liters: number }> } }> => {
    const response = await apiClient.get('/fuel/reports/cost-analysis', { params })
    return response.data
}

// ── 8.7 Fuel Analytics Reports ───────────────────────────────────────────────

export interface FuelConsumptionReport {
    period: string
    total_liters: number
    trend: Array<{ date: string; liters: number }>
}

export const getFuelConsumptionReport = async (params?: { period?: string }): Promise<{ message: string; data: FuelConsumptionReport }> => {
    const response = await apiClient.get('/analytics/fuel/consumption-report', { params })
    return response.data
}

export interface FuelCostReport {
    currency: string
    months: Array<{ month: string; total_cost: number; liters: number }>
}

export const getFuelCostReport = async (params?: { period?: string }): Promise<{ message: string; data: FuelCostReport }> => {
    const response = await apiClient.get('/analytics/fuel/cost-report', { params })
    return response.data
}

export interface FuelEfficiencyReport {
    months: Array<{ month: string; efficiency_l_per_100km: number; distance_km: number }>
    fleet_average: number
}

export const getFuelEfficiencyReport = async (params?: { period?: string }): Promise<{ message: string; data: FuelEfficiencyReport }> => {
    const response = await apiClient.get('/analytics/fuel/efficiency-report', { params })
    return response.data
}

export interface FuelDistribution {
    total_vehicles: number
    layers: Array<{ range: string; vehicle_count: number; percentage: number }>
}

export const getFuelDistribution = async (): Promise<{ message: string; data: FuelDistribution }> => {
    const response = await apiClient.get('/fuel/vehicles/distribution')
    return response.data
}

export interface FuelEfficiencyGraph {
    filter: string
    labels: string[]
    efficiency_data: number[]
    average_efficiency_km_per_liter: number
}

export const getFuelEfficiencyGraph = async (params?: { filter?: string }): Promise<{ message: string; data: FuelEfficiencyGraph }> => {
    const response = await apiClient.get('/fuel-consumptions/efficiency-graph', { params })
    return response.data
}

export interface TopFuelConsumer {
    vehicle_id: number
    fuel_used_liters: number
    distance_km: number
    segment_count: number
    vehicle: { id: number; registration_number: string; make: string; model: string }
}

export interface TopFuelConsumersResponse {
    filter: string
    period: { start_at: string; end_at: string; timezone: string }
    vehicles: TopFuelConsumer[]
    total_fuel_used_liters: number
}

export const getTopFuelConsumers = async (params?: { filter?: string }): Promise<{ message: string; data: TopFuelConsumersResponse }> => {
    const response = await apiClient.get('/fuel-consumptions/top-consumers', { params })
    return response.data
}

// ── 8.5 Live Fuel Monitor ────────────────────────────────────────────────────

export interface FuelVehicleListParams {
    per_page?: number
    page?: number
    search?: string
    filter?: string
}

export interface FuelVehicleListResponse {
    data: {
        vehicles: FuelVehicle[]
        pagination: FuelPagination
    }
}

export const getFuelVehicles = async (params?: FuelVehicleListParams): Promise<FuelVehicleListResponse> => {
    const response = await apiClient.get<FuelVehicleListResponse>('/fuel/vehicles', { params })
    return response.data
}

export const getVehicleCurrentFuel = async (vehicleId: string | number): Promise<{ data: { vehicle: FuelVehicle['attributes'] & { id: number; device_has_fuel: boolean }; fuel_level: FuelVehicle['fuel_level'] } }> => {
    const response = await apiClient.get(`/fuel/vehicles/${vehicleId}/current`)
    return response.data
}

export const getVehicleFuelHistory = async (vehicleId: string | number, params?: { start_date?: string; end_date?: string }): Promise<{ data: { history: Array<{ timestamp: string; fuel_level_liters: number; fuel_level_percent: number; data_quality_score: number }> } }> => {
    const response = await apiClient.get(`/fuel/vehicles/${vehicleId}/history`, { params })
    return response.data
}

export interface AbnormalityListParams {
    type?: string
    status?: string
    start_date?: string
    end_date?: string
    per_page?: number
    page?: number
}

export const getVehicleAbnormalities = async (vehicleId: number, params?: AbnormalityListParams): Promise<{ data: { abnormalities: FuelAbnormality[]; pagination: FuelPagination } }> => {
    const response = await apiClient.get(`/fuel/vehicles/${vehicleId}/abnormalities`, { params })
    return response.data
}

// ── 8.6 Alert Actions ────────────────────────────────────────────────────────

export const acknowledgeFuelAlert = async (alertId: number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/fuel-alerts/${alertId}/acknowledge`)
    return response.data
}

export const resolveFuelAlert = async (alertId: number, notes?: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/fuel-alerts/${alertId}/resolve`, { notes })
    return response.data
}

export const markFuelAlertFalsePositive = async (alertId: number, notes?: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/fuel-alerts/${alertId}/false-positive`, { notes })
    return response.data
}

// ── 8.7 Settings ─────────────────────────────────────────────────────────────

export const getFuelSettings = async (): Promise<{ data: FuelSettings }> => {
    const response = await apiClient.get('/fuel-settings')
    return response.data
}

export const updateFuelSettings = async (payload: Partial<FuelSettings>): Promise<{ message: string; data: FuelSettings }> => {
    const response = await apiClient.put('/fuel-settings', payload)
    return response.data
}
