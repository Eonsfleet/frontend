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
export type EditableFuelExpenseStatus = 'pending_approval' | 'approved' | 'rejected' | 'reimbursed'

export type ReconciliationStatus = 'all' | 'reconciled' | 'unreconciled' | 'pending' | 'disputed'

export interface FuelTransactionFilters {
    search: string
    vehicleId?: number
    type?: 'all' | TxType
    reconciliationStatus?: ReconciliationStatus
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
    occurredAt: string
    vehicle: string
    vehicleModel: string
    vehicleId: number | null
    type: TxType
    /** How the transaction was recorded, e.g. "device" or "manual". */
    source: string
    station: string
    driver: string
    userId: number | null
    volumeLiters: number | null
    amountNaira: number | null
    pricePerLiter: number | null
    payment: PaymentMethod
    hasReceipt: boolean
    currency: string
    receiptUrl: string
    referenceNumber: string
    status: EditableFuelExpenseStatus
    canManage: boolean
    // Device-detected telemetry (present on source: "device" transactions).
    lat: number | null
    lng: number | null
    odometerKm: number | null
    confidence: number | null
    fuelLevelBefore: number | null
    fuelLevelAfter: number | null
}

export interface TxKpis {
    totalFuelPurchasedLiters: number
    totalCostNaira: number
    avgPricePerLiter: number
    avgDistancePerLiter: number
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

function readString(record: Record<string, unknown>, keys: string[], fallback = '-') {
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

/**
 * Reads { latitude, longitude } from the `location` field, which the API returns
 * either as an object or as a single-element array of that object.
 */
function readLatLng(location: unknown): { lat: number | null; lng: number | null } {
    const point = Array.isArray(location) ? location[0] : location
    const record = asRecord(point)
    return {
        lat: readNumber(record, ['latitude', 'lat']),
        lng: readNumber(record, ['longitude', 'lng']),
    }
}

function formatDatePart(value: string, pattern: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '-' : format(date, pattern)
}

function normalizeType(value: string): TxType {
    if (value === 'theft' || value === 'leakage') return value
    return 'refill'
}

function normalizeStatus(value: string): EditableFuelExpenseStatus {
    if (value === 'approved' || value === 'rejected' || value === 'reimbursed') return value
    return 'pending_approval'
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
    const driver = firstRecord(attributes.driver, item.driver, relationships.driver, attributes.user, item.user, relationships.user)
    const metadata = asRecord(attributes.metadata)

    const backendId = readString(item, ['id'], readString(attributes, ['id'], ''))
    const type = normalizeType(readString(attributes, ['type'], 'refill').toLowerCase())
    const source = readString(attributes, ['source'], '-')
    const occurredAt = readString(attributes, ['occurred_at', 'entry_date', 'transaction_date', 'timestamp', 'created_at'], '')
    const volume = readNumber(attributes, ['amount_liters', 'volume_liters', 'fuel_level_liters', 'liters', 'volume'])
    const amount = readNumber(attributes, ['amount_naira', 'total_cost', 'amount', 'cost', 'total_cost_naira'])
    const price = amount != null && volume ? Number((amount / Math.abs(volume)).toFixed(2)) : readNumber(attributes, ['price_per_liter', 'cost_per_liter', 'cost_per_volume'])
    const { lat, lng } = readLatLng(attributes.location ?? item.location)
    // Device transactions carry no station name — fall back to a coordinate label.
    const station = readString(
        attributes,
        ['fuel_station', 'station', 'station_name', 'merchant_name', 'purchase_from', 'address'],
        lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '-',
    )
    const vehicleId = readNumber(attributes, ['vehicle_id']) ?? readNumber(vehicle, ['id'])
    const userId = readNumber(attributes, ['user_id', 'driver_id']) ?? readNumber(driver, ['id'])
    const receiptUrl = readString(attributes, ['receipt_url', 'receipt'], '')

    return {
        id: backendId || crypto.randomUUID(),
        date: occurredAt ? formatDatePart(occurredAt, 'MMM d, yyyy') : '-',
        time: occurredAt ? formatDatePart(occurredAt, 'hh:mm a') : '-',
        occurredAt,
        vehicle: readString(vehicle, ['registration_number', 'registration', 'name'], readString(attributes, ['registration_number', 'vehicle_registration'], '-')),
        vehicleModel: [readString(vehicle, ['make'], ''), readString(vehicle, ['model'], '')].filter(Boolean).join(' ') || '-',
        vehicleId,
        type,
        source,
        station,
        driver: readString(driver, ['name', 'full_name'], readString(attributes, ['driver_name'], '-')),
        userId,
        volumeLiters: volume == null ? null : Number((type === 'refill' ? Math.abs(volume) : -Math.abs(volume)).toFixed(1)),
        amountNaira: amount,
        pricePerLiter: price,
        payment: readString(attributes, ['payment_method', 'source'], '').toLowerCase().includes('card') ? 'fleet_card' : 'cash',
        hasReceipt: Boolean(receiptUrl || attributes.fuel_expense_id),
        currency: readString(attributes, ['currency'], 'NGN'),
        receiptUrl,
        referenceNumber: readString(attributes, ['reference_number', 'reference', 'external_id'], ''),
        status: normalizeStatus(readString(attributes, ['status'], 'pending_approval')),
        // Device-detected transactions aren't editable expense records — only rows
        // backed by a fuel expense can be edited/deleted through the expense endpoints.
        canManage: Boolean(backendId) && attributes.fuel_expense_id != null,
        lat,
        lng,
        odometerKm: readNumber(attributes, ['odometer_at_event', 'odometer']),
        confidence: readNumber(attributes, ['confidence']),
        fuelLevelBefore: readNumber(metadata, ['previous_fuel_level']),
        fuelLevelAfter: readNumber(metadata, ['current_fuel_level']),
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
        reconciliation_status: filters.reconciliationStatus && filters.reconciliationStatus !== 'all' ? filters.reconciliationStatus : undefined,
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
        // Transaction count isn't part of the metrics payload, so it always comes
        // from pagination (fall back to the loaded rows before the first page lands).
        const totalTransactions = pagination.total || rows.length
        const totalRefills = rows.filter((r) => r.type === 'refill').length

        if (metrics) {
            // The metrics endpoint exposes cost/volume/averages (new field names,
            // with the legacy expense-ledger names kept as fallbacks).
            const avgCostPerLitre = metrics.avg_cost_per_litre ?? metrics.average_cost_per_liter ?? 0
            return {
                totalFuelPurchasedLiters: Math.round(metrics.total_volume ?? 0),
                totalCostNaira: Number((metrics.total_cost ?? 0).toFixed(2)),
                avgPricePerLiter: Number(avgCostPerLitre.toFixed(2)),
                avgDistancePerLiter: Number((metrics.avg_distance_per_litre ?? 0).toFixed(2)),
                totalTransactions,
                totalRefills,
                pendingApprovalCount: metrics.pending_approval_count ?? metrics.pending_count ?? 0,
            }
        }
        // Fallback: derive from the loaded rows until the metrics query resolves.
        const purchased = rows.filter((r) => (r.volumeLiters ?? 0) > 0).reduce((s, r) => s + (r.volumeLiters ?? 0), 0)
        const cost = rows.reduce((s, r) => s + (r.amountNaira ?? 0), 0)
        const priced = rows.filter((r) => r.pricePerLiter != null)
        const avgPrice = priced.length ? priced.reduce((s, r) => s + (r.pricePerLiter ?? 0), 0) / priced.length : 0
        return {
            totalFuelPurchasedLiters: Math.round(purchased),
            totalCostNaira: Number(cost.toFixed(2)),
            avgPricePerLiter: Number(avgPrice.toFixed(2)),
            avgDistancePerLiter: 0,
            totalTransactions,
            totalRefills,
            pendingApprovalCount: 0,
        }
    }, [metricsQuery.data, pagination.total, rows])

    return {
        rows,
        kpis,
        // Metrics feed the KPI stat cards from a separate query; expose its loading
        // state so the cards can show skeletons independently of the table.
        kpisLoading: metricsQuery.isLoading,
        pagination,
        isLoading: query.isLoading,
        isError: query.isError,
    }
}