import apiClient from './client'
import { Paginated, FuelExpense, FuelCardProvider, FuelReconciliationDiscrepancy } from '@/types'

// Expenses
export interface FuelExpenseListResponse {
    message: string
    data: {
        expenses: FuelExpense[]
        pagination: Paginated<FuelExpense>['pagination']
    }
}

export const getFuelExpenses = async (params?: { page?: number; per_page?: number; status?: string }): Promise<FuelExpenseListResponse> => {
    const response = await apiClient.get<FuelExpenseListResponse>('/fuel-expenses', { params })
    return response.data
}

export const createFuelExpense = async (data: Partial<FuelExpense['attributes']>): Promise<{ message: string, data: FuelExpense }> => {
    const response = await apiClient.post<{ message: string, data: FuelExpense }>('/fuel-expenses', data)
    return response.data
}

export const approveFuelExpense = async (id: string, note?: string): Promise<{ message: string, data: FuelExpense }> => {
    const response = await apiClient.post<{ message: string, data: FuelExpense }>(`/fuel-expenses/${id}/approve`, { note })
    return response.data
}

export const rejectFuelExpense = async (id: string, rejection_reason: string): Promise<{ message: string, data: FuelExpense }> => {
    const response = await apiClient.post<{ message: string, data: FuelExpense }>(`/fuel-expenses/${id}/reject`, { rejection_reason })
    return response.data
}

// Card Providers
export interface FuelCardProviderListResponse {
    message: string
    data: FuelCardProvider[]
}

export const getFuelCardProviders = async (): Promise<FuelCardProviderListResponse> => {
    const response = await apiClient.get<FuelCardProviderListResponse>('/fuel-card-providers')
    return response.data
}

export const syncFuelCardProvider = async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/fuel-card-providers/${id}/sync`)
    return response.data
}

// Reconciliation
export interface DiscrepancyListResponse {
    message: string
    data: {
        discrepancies: FuelReconciliationDiscrepancy[]
        pagination: Paginated<FuelReconciliationDiscrepancy>['pagination']
    }
}

export const getDiscrepancies = async (params?: { page?: number; per_page?: number }): Promise<DiscrepancyListResponse> => {
    const response = await apiClient.get<DiscrepancyListResponse>('/fuel-reconciliation/discrepancies', { params })
    return response.data
}

export const runReconciliationEngine = async (): Promise<{ message: string, discrepancies_found: number }> => {
    const response = await apiClient.post<{ message: string, discrepancies_found: number }>('/fuel-reconciliation/run')
    return response.data
}

// Reports
export const getIftaReport = async (month: string, year: string): Promise<any> => {
    const response = await apiClient.get('/fuel/compliance/ifta-report', { params: { month, year } })
    return response.data
}

export const getTheftSummary = async (): Promise<any> => {
    const response = await apiClient.get('/fuel/reports/theft-summary')
    return response.data
}
