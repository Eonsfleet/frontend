'use client'

/**
 * Data layer for the Fuel Alerts tab.
 *
 * The fuel API exposes abnormalities per-vehicle (getVehicleAbnormalities), not a
 * fleet-wide alert feed, so the alert list here is a deterministic mock keyed off an
 * index — stable across renders and shaped so it can be swapped for a real
 * `/fuel-alerts` list endpoint later. The selected-alert detail (fuel level, live
 * location, today trend) is likewise mock/placeholder.
 */

import { useMemo } from 'react'
import { format, subMinutes } from 'date-fns'

export type AlertType = 'low_fuel' | 'fuel_theft' | 'rapid_drop' | 'unauthorized_drain' | 'sensor_error'
export type Severity = 'critical' | 'warning' | 'info'
export type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved'

export interface FuelAlertRow {
    id: string
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

const SEED: Omit<FuelAlertRow, 'time' | 'date' | 'lastUpdated'>[] = [
    { id: 'a1', title: 'Low Fuel Level', description: 'Fuel level is 15% (12.5 L)', vehicle: 'LAG 234 XF', model: 'Volvo FH16', type: 'low_fuel', severity: 'critical', location: 'Lekki-Epe Expressway, Lagos', status: 'new', driver: 'John Okeke', group: 'Heavy Trucks', fuelPercent: 15, fuelLiters: 12.5, fuelCapacity: 100, consumptionLph: 2.4, lat: 6.47, lng: 3.6 },
    { id: 'a2', title: 'Suspected Fuel Theft', description: 'Unusual fuel drain detected', vehicle: 'LAG 543 TY', model: 'Mercedes Actros', type: 'fuel_theft', severity: 'critical', location: 'Ijebu Ode, Ogun', status: 'new', driver: 'Peter Adams', group: 'Distribution', fuelPercent: 34, fuelLiters: 42, fuelCapacity: 120, consumptionLph: 3.1, lat: 6.82, lng: 3.92 },
    { id: 'a3', title: 'Rapid Fuel Drop', description: 'Fuel dropped by 35L in 15 mins', vehicle: 'LAG 876 GH', model: 'MAN TGX', type: 'rapid_drop', severity: 'warning', location: 'Ojota, Lagos', status: 'acknowledged', driver: 'Ahmed Yusuf', group: 'Long Haul', fuelPercent: 52, fuelLiters: 78, fuelCapacity: 150, consumptionLph: 2.8, lat: 6.58, lng: 3.38 },
    { id: 'a4', title: 'Low Fuel Level', description: 'Fuel level is 18% (18.6 L)', vehicle: 'LAG 112 KL', model: 'Scania R450', type: 'low_fuel', severity: 'warning', location: 'Apapa, Lagos', status: 'new', driver: 'Emeka Obi', group: 'Regional', fuelPercent: 18, fuelLiters: 18.6, fuelCapacity: 100, consumptionLph: 2.2, lat: 6.45, lng: 3.36 },
    { id: 'a5', title: 'Unauthorized Drain', description: 'Fuel drained during idle', vehicle: 'LAG 908 MN', model: 'Volvo FM', type: 'unauthorized_drain', severity: 'critical', location: 'Victoria Island, Lagos', status: 'new', driver: 'Grace Eze', group: 'Heavy Trucks', fuelPercent: 40, fuelLiters: 60, fuelCapacity: 150, consumptionLph: 3.0, lat: 6.43, lng: 3.42 },
    { id: 'a6', title: 'Fuel Sensor Error', description: 'Sensor data inconsistent', vehicle: 'LAG 765 PQ', model: 'Iveco Stralis', type: 'sensor_error', severity: 'info', location: 'Ibadan, Oyo', status: 'investigating', driver: 'Musa Bello', group: 'Distribution', fuelPercent: 62, fuelLiters: 74, fuelCapacity: 120, consumptionLph: 2.5, lat: 7.38, lng: 3.9 },
    { id: 'a7', title: 'Rapid Fuel Drop', description: 'Fuel dropped by 28L in 10 mins', vehicle: 'LAG 345 JK', model: 'TATA Prima', type: 'rapid_drop', severity: 'warning', location: 'Abeokuta, Ogun', status: 'acknowledged', driver: 'Tunde Bakare', group: 'Long Haul', fuelPercent: 47, fuelLiters: 56, fuelCapacity: 120, consumptionLph: 2.7, lat: 7.15, lng: 3.35 },
    { id: 'a8', title: 'Low Fuel Level', description: 'Fuel level is 20% (20.1 L)', vehicle: 'LAG 678 RT', model: 'Ashok Leyland', type: 'low_fuel', severity: 'warning', location: 'Sagamu, Ogun', status: 'resolved', driver: 'John Okeke', group: 'Regional', fuelPercent: 20, fuelLiters: 20.1, fuelCapacity: 100, consumptionLph: 2.3, lat: 6.84, lng: 3.64 },
]

export interface AlertKpis {
    critical: number
    lowFuel: number
    suspectedTheft: number
    unauthorizedDrain: number
    sensorError: number
    total: number
}

export interface AlertTrendPoint {
    label: string
    value: number
}

export function useFuelAlerts() {
    const alerts = useMemo<FuelAlertRow[]>(() => {
        const base = new Date()
        // Spread times descending from a fixed reference so the list reads like a feed.
        const gaps = [0, 34, 68, 103, 143, 176, 210, 258]
        return SEED.map((a, i) => {
            const t = subMinutes(base, gaps[i])
            return {
                ...a,
                time: format(t, 'hh:mm a'),
                date: format(t, 'MMM d'),
                lastUpdated: format(t, 'hh:mm a, MMM d, yyyy'),
            }
        })
    }, [])

    const kpis = useMemo<AlertKpis>(() => ({
        critical: alerts.filter((a) => a.severity === 'critical').length,
        lowFuel: alerts.filter((a) => a.type === 'low_fuel').length + 9,
        suspectedTheft: alerts.filter((a) => a.type === 'fuel_theft').length + 2,
        unauthorizedDrain: alerts.filter((a) => a.type === 'unauthorized_drain').length + 1,
        sensorError: alerts.filter((a) => a.type === 'sensor_error').length,
        total: 24,
    }), [alerts])

    return { alerts, kpis }
}

/** Today fuel-level trend for the selected alert's vehicle. */
export function useAlertFuelTrend(alert: FuelAlertRow | null): AlertTrendPoint[] {
    return useMemo(() => {
        if (!alert) return []
        const out: AlertTrendPoint[] = []
        const start = alert.fuelCapacity * 0.7
        const points = 13
        for (let i = 0; i < points; i++) {
            const hour = i * 2
            const label = hour === 0 ? '12 AM' : hour < 12 ? `${String(hour).padStart(2, '0')} AM` : hour === 12 ? '12 PM' : `${String(hour - 12).padStart(2, '0')} PM`
            const value = Math.max(alert.fuelLiters, start - (start - alert.fuelLiters) * (i / (points - 1)))
            out.push({ label: i === points - 1 ? 'Now' : label, value: Number(value.toFixed(1)) })
        }
        return out
    }, [alert])
}
