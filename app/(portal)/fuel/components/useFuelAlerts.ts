'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
    getFuelAlertLogs,
    getFuelLevelTrend,
    acknowledgeFuelAlert,
    resolveFuelAlert,
    markFuelAlertFalsePositive,
    type FuelAlertLogApiItem,
} from '@/lib/api/fuel'

export type AlertType = 'low_fuel' | 'fuel_theft' | 'rapid_drop' | 'unauthorized_drain' | 'sensor_error' | 'refill'
export type Severity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved'

export interface FuelAlertRow {
    id: string
    /** Numeric vehicle id (for the fuel-level-trend endpoint); null when unknown. */
    vehicleId: number | null
    title: string
    description: string
    vehicle: string
    model: string
    type: AlertType
    severity: Severity
    time: string
    date: string
    location: string
    status: AlertStatus
    // detail fields
    driver: string
    group: string
    fuelPercent: number
    fuelLiters: number
    fuelCapacity: number
    consumptionLph: number
    lastUpdated: string
    lat: number
    lng: number
}

export const TYPE_META: Record<AlertType, { label: string; badge: string }> = {
    low_fuel: { label: 'Low Fuel', badge: 'bg-amber-50 text-amber-600' },
    fuel_theft: { label: 'Fuel Theft', badge: 'bg-rose-50 text-rose-600' },
    rapid_drop: { label: 'Rapid Drop', badge: 'bg-purple-50 text-purple-600' },
    unauthorized_drain: { label: 'Unauthorized Drain', badge: 'bg-purple-50 text-purple-600' },
    sensor_error: { label: 'Sensor Error', badge: 'bg-emerald-50 text-emerald-600' },
    refill: { label: 'Refill', badge: 'bg-blue-50 text-blue-600' },
}

export const SEVERITY_META: Record<Severity, { label: string; badge: string }> = {
    critical: { label: 'Critical', badge: 'bg-rose-50 text-rose-600' },
    warning: { label: 'Warning', badge: 'bg-amber-50 text-amber-600' },
    info: { label: 'Info', badge: 'bg-blue-50 text-blue-600' },
}

export const STATUS_META: Record<AlertStatus, { label: string; badge: string }> = {
    new: { label: 'New', badge: 'bg-rose-50 text-rose-600' },
    acknowledged: { label: 'Acknowledged', badge: 'bg-blue-50 text-blue-600' },
    investigating: { label: 'Investigating', badge: 'bg-purple-50 text-purple-600' },
    resolved: { label: 'Resolved', badge: 'bg-emerald-50 text-emerald-600' },
}

export interface AlertKpis {
    critical: number
    lowFuel: number
    suspectedTheft: number
    unauthorizedDrain: number
    sensorError: number
    total: number
}

export interface AlertFilters {
    types: AlertType[]
    severities: Severity[]
    status: AlertStatus | 'all'
    vehicleId?: number | null
    date?: string
    startDate?: string
    endDate?: string
}

export const EMPTY_FILTERS: AlertFilters = { types: [], severities: [], status: 'all' }

export interface AlertTrendPoint {
    label: string
    value: number
}

export interface AlertPagination {
    current: number
    lastPage: number
    total: number
    perPage: number
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asNumber(value: unknown, fallback = 0) {
    const number = Number(value)
    return Number.isFinite(number) ? number : fallback
}

function normalizeType(value: unknown): AlertType {
    const type = String(value ?? '').toLowerCase()
    if (type.includes('theft')) return 'fuel_theft'
    if (type.includes('refill')) return 'refill'
    if (type.includes('rapid') || type.includes('drop')) return 'rapid_drop'
    if (type.includes('drain') || type.includes('leak')) return 'unauthorized_drain'
    if (type.includes('sensor')) return 'sensor_error'
    return 'low_fuel'
}

function normalizeSeverity(value: unknown): Severity {
    const severity = String(value ?? '').toLowerCase()
    if (severity === 'critical') return 'critical'
    if (severity === 'info' || severity === 'low') return 'info'
    return 'warning'
}

function normalizeStatus(value: unknown): AlertStatus {
    const status = String(value ?? '').toLowerCase()
    if (status === 'acknowledged') return 'acknowledged'
    if (status === 'investigating') return 'investigating'
    if (status === 'resolved') return 'resolved'
    return 'new'
}

function titleFor(type: AlertType) {
    return TYPE_META[type].label
}

function alertRows(payload: Awaited<ReturnType<typeof getFuelAlertLogs>> | undefined): FuelAlertLogApiItem[] {
    const data = payload?.data
    if (Array.isArray(data)) return data
    return data?.fuel_alerts ?? data?.fuel_alert_logs ?? data?.alert_logs ?? data?.alerts ?? []
}

function alertPagination(payload: Awaited<ReturnType<typeof getFuelAlertLogs>> | undefined): AlertPagination {
    const data = payload?.data
    const pagination = !Array.isArray(data) ? asRecord(data?.pagination) : {}
    return {
        current: asNumber(pagination.current ?? pagination.current_page, 1),
        lastPage: asNumber(pagination.lastPage ?? pagination.last_page, 1),
        total: asNumber(pagination.total, Array.isArray(data) ? data.length : 0),
        perPage: asNumber(pagination.perPage ?? pagination.per_page, 10),
    }
}

function mapAlertLog(item: FuelAlertLogApiItem, index: number): FuelAlertRow {
    const attributes = asRecord(item.attributes)
    const relationships = asRecord(item.relationships)
    const table = asRecord(item.table)
    const detail = asRecord(item.detail)
    const tableAlert = asRecord(table.alert)
    const tableType = asRecord(table.type)
    const tableSeverity = asRecord(table.severity)
    const tableTime = asRecord(table.time)
    const tableStatus = asRecord(table.status)
    const detailMetrics = asRecord(detail.metrics)
    const detailFuelLevel = asRecord(detailMetrics.fuel_level)
    const detailTimeline = asRecord(detail.timeline)
    const vehicle = asRecord(item.vehicle ?? table.vehicle ?? detail.vehicle ?? relationships.vehicle)
    const location = asRecord(item.location ?? table.location ?? detail.location ?? attributes.location)
    const type = normalizeType(tableType.key ?? item.type ?? attributes.type ?? attributes.alert_type)
    const severity = normalizeSeverity(tableSeverity.key ?? item.severity ?? attributes.severity)
    const status = normalizeStatus(tableStatus.key ?? item.status ?? attributes.status)
    const alertTime = asRecord(detailTimeline.alert_time)
    const timestamp = String(tableTime.iso ?? alertTime.iso ?? item.alert_time ?? item.occurred_at ?? item.created_at ?? attributes.alert_time ?? attributes.occurred_at ?? attributes.created_at ?? '')
    const date = new Date(timestamp)
    const hasDate = timestamp && !Number.isNaN(date.getTime())
    const fuelPercent = asNumber(detailFuelLevel.percent ?? attributes.fuel_percent ?? attributes.fuel_level_percent ?? attributes.current_fuel_level_percent)
    const fuelLiters = asNumber(detailFuelLevel.liters ?? attributes.fuel_liters ?? attributes.fuel_level_liters ?? attributes.current_fuel_level)

    const vehicleIdRaw = vehicle.id ?? attributes.vehicle_id ?? item.vehicle_id
    return {
        id: String(table.id ?? item.id ?? attributes.id ?? index),
        vehicleId: vehicleIdRaw != null && Number.isFinite(Number(vehicleIdRaw)) ? Number(vehicleIdRaw) : null,
        title: String(tableAlert.title ?? item.title ?? attributes.title ?? titleFor(type)),
        description: String(tableAlert.description ?? item.message ?? item.description ?? attributes.message ?? attributes.description ?? titleFor(type)),
        vehicle: String(vehicle.registration_number ?? attributes.registration_number ?? '—'),
        model: String(vehicle.label ?? vehicle.name ?? (`${String(vehicle.make ?? attributes.make ?? '')} ${String(vehicle.model ?? attributes.model ?? '')}`.trim() || '—')),
        type,
        severity,
        time: String(tableTime.time ?? (hasDate ? format(date, 'hh:mm a') : '—')),
        date: String(tableTime.date ?? (hasDate ? format(date, 'MMM d') : '—')),
        location: String(location.label ?? location.address ?? attributes.address ?? '—'),
        status,
        driver: String(attributes.driver_name ?? '—'),
        group: String(attributes.group_name ?? '—'),
        fuelPercent,
        fuelLiters,
        fuelCapacity: asNumber(detailMetrics.fuel_capacity_liters ?? attributes.fuel_capacity ?? attributes.tank_capacity, 100),
        consumptionLph: asNumber(detailMetrics.fuel_consumption_lph ?? attributes.consumption_lph ?? attributes.fuel_rate, 0),
        lastUpdated: String(detailTimeline.last_updated ?? (hasDate ? format(date, 'hh:mm a, MMM d, yyyy') : '—')),
        lat: asNumber(location.lat ?? location.latitude, 6.5244),
        lng: asNumber(location.lng ?? location.longitude, 3.3792),
    }
}

function alertSummary(payload: Awaited<ReturnType<typeof getFuelAlertLogs>> | undefined) {
    const data = payload?.data
    return Array.isArray(data) ? null : data?.summary ?? null
}

export function useFuelAlerts() {
    const [filters, setFilters] = useState<AlertFilters>(EMPTY_FILTERS)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: ['fuel-alert-logs', filters, search, page],
        queryFn: () => getFuelAlertLogs({
            search: search || undefined,
            page,
            per_page: 10,
            vehicle_id: filters.vehicleId ?? undefined,
            date: filters.date || undefined,
            start_date: filters.startDate || undefined,
            end_date: filters.endDate || undefined,
            type: filters.types.length ? filters.types.join(',') : undefined,
            severity: filters.severities.length ? filters.severities.join(',') : undefined,
            status: filters.status === 'all' ? undefined : filters.status,
        }),
        placeholderData: (previousData) => previousData,
    })

    const alerts = useMemo(() => alertRows(query.data).map((row, index) => mapAlertLog(row, index)), [query.data])

    const invalidate = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['fuel-alert-logs'] })
    }, [queryClient])

    // Status is owned by the backend: each action only calls the endpoint and refetches.
    // The row's status (and whether it still appears) reflects the server response,
    // never an optimistic frontend guess.
    const acknowledge = useCallback((id: string) => {
        return acknowledgeFuelAlert(Number(id)).finally(invalidate)
    }, [invalidate])

    const resolve = useCallback((id: string, notes?: string) => {
        return resolveFuelAlert(Number(id), notes).finally(invalidate)
    }, [invalidate])

    const markFalsePositive = useCallback((id: string, notes?: string) => {
        return markFuelAlertFalsePositive(Number(id), notes).finally(invalidate)
    }, [invalidate])

    const kpis = useMemo<AlertKpis>(() => ({
        critical: alertSummary(query.data)?.cards?.critical_alerts?.count ?? alerts.filter((a) => a.severity === 'critical').length,
        lowFuel: alertSummary(query.data)?.cards?.low_fuel?.count ?? alerts.filter((a) => a.type === 'low_fuel').length,
        suspectedTheft: alertSummary(query.data)?.cards?.suspected_theft?.count ?? alerts.filter((a) => a.type === 'fuel_theft').length,
        unauthorizedDrain: alertSummary(query.data)?.cards?.unauthorized_drain?.count ?? alerts.filter((a) => a.type === 'unauthorized_drain').length,
        sensorError: alertSummary(query.data)?.cards?.fuel_sensor_error?.count ?? alerts.filter((a) => a.type === 'sensor_error').length,
        total: (alertSummary(query.data)?.cards?.all_alerts?.count ?? alertPagination(query.data).total) || alerts.length,
    }), [alerts, query.data])

    // Accurate severity tab counts from the API summary (fall back to page counts).
    const tabCounts = useMemo(() => {
        const tabs = alertSummary(query.data)?.tabs
        return {
            all: tabs?.all ?? alertPagination(query.data).total ?? alerts.length,
            critical: tabs?.critical ?? alerts.filter((a) => a.severity === 'critical').length,
            warning: tabs?.warning ?? alerts.filter((a) => a.severity === 'warning').length,
            info: tabs?.info ?? alerts.filter((a) => a.severity === 'info').length,
        }
    }, [alerts, query.data])

    const activeFilterCount =
        filters.types.length
        + filters.severities.length
        + (filters.status !== 'all' ? 1 : 0)
        + (filters.startDate || filters.endDate ? 1 : 0)

    return {
        alerts,
        filtered: alerts,
        kpis,
        filters,
        setFilters: (next: AlertFilters) => {
            setFilters(next)
            setPage(1)
        },
        search,
        setSearch: (value: string) => {
            setSearch(value)
            setPage(1)
        },
        page,
        setPage,
        pagination: alertPagination(query.data),
        acknowledge,
        resolve,
        markFalsePositive,
        tabCounts,
        activeFilterCount,
        isLoading: query.isLoading && !query.data,
        isFetching: query.isFetching,
        isError: query.isError,
    }
}

/**
 * Fuel-level trend for the selected alert's vehicle — same endpoint the Real-time
 * tab's Fuel Level Trend uses (/fuel/level-trend), keyed off the clicked alert's
 * vehicle id. Returns the loading flag so the panel can show a spinner.
 */
export function useAlertFuelTrend(alert: FuelAlertRow | null): { points: AlertTrendPoint[]; isLoading: boolean } {
    const vehicleId = alert?.vehicleId ?? null

    const query = useQuery({
        queryKey: ['fuel-alert-level-trend', vehicleId],
        queryFn: () => getFuelLevelTrend({ vehicle_id: vehicleId!, filter: '24hrs' }),
        enabled: vehicleId != null,
    })

    return useMemo(() => {
        const data = query.data?.data
        let points: AlertTrendPoint[] = []
        if (Array.isArray(data)) {
            points = data.map((p, i) => ({ label: p.label ?? String(i), value: asNumber(p.value) }))
        } else if (data?.labels?.length) {
            const values = data.fuel_data ?? data.values ?? []
            points = data.labels.map((label, i) => ({ label, value: asNumber(values[i]) }))
        } else if (data?.trend?.length || data?.history?.length) {
            points = (data.trend ?? data.history ?? []).map((p, i) => ({ label: p.label ?? String(i), value: asNumber(p.value) }))
        }
        return { points, isLoading: query.isFetching }
    }, [query.data, query.isFetching])
}

