'use client'

/**
 * Data layer for the Fuel Transactions tab.
 *
 * Uses /fuel-transactions with server-side filters. The mapper accepts a few
 * common API response shapes so the UI stays stable if the backend wraps rows as
 * JSON:API resources or plain objects.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getFuelExpenseMetrics, getFuelTransactions, type FuelPagination, type FuelTransactionApiItem } from '@/lib/api/fuel'

export type TxType = 'refill' | 'theft' | 'leakage'
export type PaymentMethod = 'fleet_card' | 'cash'

export interface FuelTransactionFilters {
    search: string
    vehicleId?: number
    type?: 'all' | TxType
    startDate?: string
    endDate?: string
    page: number
    perPage: number
    exportLimit: number
    sortBy: string
    orderBy: 'asc' | 'desc'
}

export interface TransactionRow {
    id: string
    date: string
    time: string
    vehicle: string
    vehicleModel: string
    type: TxType
    station: string
    driver: string
    volumeLiters: number | null
    amountNaira: number | null
    pricePerLiter: number | null
    payment: PaymentMethod
    hasReceipt: boolean
}

export interface TxKpis {
    totalFuelPurchasedLiters: number
    totalCostNaira: number
    avgPricePerLiter: number
    totalTransactions: number
    totalRefills: number
    pendingApprovalCount: number
}

const DEFAULT_PAGINATION: FuelPagination = {
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function firstRecord(...values: unknown[]) {
    for (const value of values) {
        const record = asRecord(value)
        if (Object.keys(record).length) return record
    }
    return {}
}

function readString(record: Record<string, unknown>, keys: string[], fallback = '—') {
    for (const key of keys) {
        const value = record[key]
        if (typeof value === 'string' && value.trim()) return value
        if (typeof value === 'number') return String(value)
    }
    return fallback
}

function readNumber(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key]
        const number = Number(value)
        if (Number.isFinite(number)) return number
    }
    return null
}

function formatDatePart(value: string, pattern: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : format(date, pattern)
}

function normalizeType(value: string): TxType {
    if (value === 'theft' || value === 'leakage') return value
    return 'refill'
}

function extractRows(data: Awaited<ReturnType<typeof getFuelTransactions>> | undefined): FuelTransactionApiItem[] {
    const payload = data?.data
    if (Array.isArray(payload)) return payload
    return payload?.fuel_transactions ?? payload?.transactions ?? []
}

function extractPagination(data: Awaited<ReturnType<typeof getFuelTransactions>> | undefined, fallbackPerPage: number): FuelPagination {
    const payload = data?.data
    const pagination = !Array.isArray(payload) ? payload?.pagination : undefined
    const metaPagination = data?.meta?.pagination
    const source = pagination ?? metaPagination
    if (!source) return { ...DEFAULT_PAGINATION, per_page: fallbackPerPage }
    const sourceRecord = source as FuelPagination & {
        current?: number
        lastPage?: number
        perPage?: number
    }
    return {
        total: sourceRecord.total ?? 0,
        per_page: sourceRecord.per_page ?? sourceRecord.perPage ?? fallbackPerPage,
        current_page: sourceRecord.current_page ?? sourceRecord.current ?? 1,
        last_page: sourceRecord.last_page ?? sourceRecord.lastPage ?? 1,
    }
}

function mapRow(item: FuelTransactionApiItem): TransactionRow {
    const attributes = firstRecord(item.attributes, item)
    const relationships = asRecord(item.relationships)
    const vehicle = firstRecord(attributes.vehicle, item.vehicle, relationships.vehicle)
    const driver = firstRecord(attributes.driver, item.driver, relationships.driver)
    const location = firstRecord(attributes.location, item.location)

    const type = normalizeType(readString(attributes, ['type'], 'refill').toLowerCase())
    const occurredAt = readString(attributes, ['occurred_at', 'transaction_date', 'timestamp', 'created_at'], '')
    const volume = readNumber(attributes, ['amount_liters', 'volume_liters', 'fuel_level_liters', 'liters', 'volume'])
    const amount = readNumber(attributes, ['amount_naira', 'total_cost', 'amount', 'cost', 'total_cost_naira'])
    const price = amount != null && volume ? Number((amount / Math.abs(volume)).toFixed(2)) : readNumber(attributes, ['price_per_liter', 'cost_per_liter'])
    const station = readString(
        attributes,
        ['fuel_station', 'station', 'station_name', 'merchant_name', 'address'],
        readString(location, ['address', 'name'], '—'),
    )

    return {
        id: readString(item, ['id'], crypto.randomUUID()),
        date: occurredAt ? formatDatePart(occurredAt, 'MMM d, yyyy') : '—',
        time: occurredAt ? formatDatePart(occurredAt, 'hh:mm a') : '—',
        vehicle: readString(vehicle, ['registration_number', 'registration', 'name'], readString(attributes, ['registration_number', 'vehicle_registration'], '—')),
        vehicleModel: [readString(vehicle, ['make'], ''), readString(vehicle, ['model'], '')].filter(Boolean).join(' ') || '—',
        type,
        station,
        driver: readString(driver, ['name', 'full_name'], readString(attributes, ['driver_name'], '—')),
        volumeLiters: volume == null ? null : Number((type === 'refill' ? Math.abs(volume) : -Math.abs(volume)).toFixed(1)),
        amountNaira: amount,
        pricePerLiter: price,
        payment: readString(attributes, ['payment_method', 'source'], '').toLowerCase().includes('card') ? 'fleet_card' : 'cash',
        hasReceipt: Boolean(attributes.receipt_url ?? attributes.receipt ?? attributes.fuel_expense_id),
    }
}

export const TX_TYPE_META: Record<TxType, { label: string; badge: string }> = {
    refill: { label: 'Refill', badge: 'bg-emerald-50 text-emerald-600' },
    theft: { label: 'Theft', badge: 'bg-rose-50 text-rose-600' },
    leakage: { label: 'Leakage', badge: 'bg-amber-50 text-amber-600' },
}

export function useFuelTransactions(filters: FuelTransactionFilters) {
    const params = {
        q: filters.search.trim() || undefined,
        vehicle_id: filters.vehicleId,
        type: filters.type && filters.type !== 'all' ? filters.type : undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
        per_page: filters.perPage,
        page: filters.page,
        sort_by: filters.sortBy || undefined,
        order_by: filters.orderBy,
    }

    const query = useQuery({
        queryKey: ['fuel-transactions', params],
        queryFn: () => getFuelTransactions(params),
    })
    const metricsQuery = useQuery({
        queryKey: ['fuel-expense-metrics'],
        queryFn: () => getFuelExpenseMetrics(),
    })

    const raw = useMemo(() => extractRows(query.data), [query.data])
    const rows = useMemo<TransactionRow[]>(() => raw.map(mapRow), [raw])
    const pagination = useMemo(() => extractPagination(query.data, filters.perPage), [query.data, filters.perPage])

    const kpis = useMemo<TxKpis>(() => {
        const metrics = metricsQuery.data?.data
        if (metrics) {
            return {
                totalFuelPurchasedLiters: Math.round(metrics.total_volume ?? 0),
                totalCostNaira: Number((metrics.total_cost ?? 0).toFixed(2)),
                avgPricePerLiter: Number((metrics.average_cost_per_liter ?? 0).toFixed(2)),
                totalTransactions: metrics.total_expenses ?? 0,
                totalRefills: metrics.total_expenses ?? 0,
                pendingApprovalCount: metrics.pending_approval_count ?? metrics.pending_count ?? 0,
            }
        }
        const purchased = rows.filter((r) => (r.volumeLiters ?? 0) > 0).reduce((s, r) => s + (r.volumeLiters ?? 0), 0)
        const cost = rows.reduce((s, r) => s + (r.amountNaira ?? 0), 0)
        const priced = rows.filter((r) => r.pricePerLiter != null)
        const avgPrice = priced.length ? priced.reduce((s, r) => s + (r.pricePerLiter ?? 0), 0) / priced.length : 0
        return {
            totalFuelPurchasedLiters: Math.round(purchased),
            totalCostNaira: Number(cost.toFixed(2)),
            avgPricePerLiter: Number(avgPrice.toFixed(2)),
            totalTransactions: pagination.total || rows.length,
            totalRefills: rows.filter((r) => r.type === 'refill').length,
            pendingApprovalCount: 0,
        }
    }, [metricsQuery.data, pagination.total, rows])

    return {
        rows,
        kpis,
        pagination,
        isLoading: query.isLoading,
        isError: query.isError,
    }
}
