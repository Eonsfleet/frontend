'use client'

/**
 * Data layer for the Real-time tab: the live tank levels the server reports,
 * kept current two ways. A poll refreshes the whole picture (burn rate and
 * range are computed server-side from recent readings), and the websocket
 * overlays each new packet's level and position the moment it arrives. A new
 * fuel alert (`fuel.alerts.{org}` / `.fuel_alert`) refetches everything that
 * shows alerts.
 *
 * Nothing is invented. A level the overlay cannot honestly convert stays as the
 * server gave it, and an overlay never changes how a figure was obtained.
 */

import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFuelRealtimeSnapshot, type FuelScopeFilters, type RealtimeFuelSnapshot, type RealtimeFuelVehicle } from '@/lib/api/fuelPage'
import { useAuthStore } from '@/store/authStore'
import { useEcho } from '@/hooks/useEcho'
import { useFuelLiveSync, type FuelLiveOverride } from './useFuelLiveSync'

export const LIVE_MINUTES = 15
export const LOW_FUEL_PERCENT = 20
export const FUEL_BOARD_KEY = ['fuel', 'realtime'] as const

/**
 * Lays the websocket's newest readings over the polled vehicles.
 *
 * A packet carrying a fuel level makes that vehicle live again (its reading is
 * as old as the packet). Litres from a packet are taken only where the server
 * already has litres for the vehicle: for a percent-only tank a packet's litres
 * would have no basis the page could name, so they stay unknown.
 */
export function applyLiveOverrides(
    vehicles: RealtimeFuelVehicle[],
    overrides: Record<number, FuelLiveOverride>,
    now: number = Date.now(),
): RealtimeFuelVehicle[] {
    return vehicles.map((v) => {
        const o = overrides[v.vehicle_id]
        if (!o) return v

        const next: RealtimeFuelVehicle = { ...v }
        const hasLevel = o.fuelPercent != null || o.fuelLiters != null
        if (hasLevel) {
            if (o.fuelPercent != null) next.level_percent = o.fuelPercent
            if (o.fuelLiters != null && v.basis !== 'percent_only' && v.basis !== null) next.level_litres = o.fuelLiters
            const at = o.lastUpdate ? Date.parse(o.lastUpdate) : NaN
            const ageMinutes = Number.isFinite(at) ? Math.max(0, Math.floor((now - at) / 60000)) : 0
            // Only a packet newer than the polled reading refreshes it.
            if (ageMinutes < v.age_minutes) {
                next.age_minutes = ageMinutes
                next.freshness = ageMinutes <= LIVE_MINUTES ? 'live' : 'stale'
                next.recorded_at = Number.isFinite(at) ? new Date(at).toISOString() : new Date(now).toISOString()
            }
        }
        if (o.lat != null && o.lng != null) {
            next.location = {
                latitude: o.lat,
                longitude: o.lng,
                at: o.lastUpdate ?? v.location?.at ?? new Date(now).toISOString(),
                address: v.location?.address ?? null,
                moving: o.speedKmh != null ? o.speedKmh > 0 : (v.location?.moving ?? null),
                speed_kph: o.speedKmh ?? v.location?.speed_kph ?? null,
            }
        }
        return next
    })
}

export type BoardSort = 'range' | 'level' | 'stale' | 'registration'

/** Lowest range first by default: the vehicle that will run dry soonest is the one to look at. */
export function sortBoard(vehicles: RealtimeFuelVehicle[], sort: BoardSort): RealtimeFuelVehicle[] {
    const key = (v: RealtimeFuelVehicle): number | string => {
        switch (sort) {
            case 'range': return v.hours_to_empty ?? Number.POSITIVE_INFINITY
            case 'level': return v.level_percent ?? Number.POSITIVE_INFINITY
            case 'stale': return -v.age_minutes
            case 'registration': return (v.registration_number ?? '').toLowerCase()
        }
    }
    return [...vehicles].sort((a, b) => {
        const x = key(a)
        const y = key(b)
        if (x < y) return -1
        if (x > y) return 1
        return a.vehicle_id - b.vehicle_id
    })
}

export function summarize(vehicles: RealtimeFuelVehicle[], silent: number) {
    const live = vehicles.filter((v) => v.freshness === 'live').length
    return {
        reporting: vehicles.length,
        live,
        stale: vehicles.length - live,
        silent,
        low: vehicles.filter((v) => v.level_percent != null && v.level_percent <= LOW_FUEL_PERCENT).length,
    }
}

export interface FuelBoard {
    vehicles: RealtimeFuelVehicle[]
    silent: RealtimeFuelSnapshot['silent']
    summary: ReturnType<typeof summarize>
    generatedAt: string | null
    isLoading: boolean
    isError: boolean
    isFetching: boolean
    refetch: () => void
}

export function useFuelBoard(filters: FuelScopeFilters, pollMs = 30_000): FuelBoard {
    const queryClient = useQueryClient()
    const { token, organization } = useAuthStore()
    const { subscribePrivate } = useEcho()
    const overrides = useFuelLiveSync()

    const query = useQuery({
        queryKey: [...FUEL_BOARD_KEY, filters],
        queryFn: () => getFuelRealtimeSnapshot(filters),
        refetchInterval: pollMs,
        staleTime: 10_000,
    })

    useEffect(() => {
        const org = organization?.attributes?.identifier || organization?.id
        if (!token || !org) return
        return subscribePrivate(`fuel.alerts.${org}`, '.fuel_alert', () => {
            queryClient.invalidateQueries({ queryKey: ['fuel'] })
        })
    }, [token, organization?.attributes?.identifier, organization?.id, subscribePrivate, queryClient])

    const merged = useMemo(
        // eslint-disable-next-line react-hooks/exhaustive-deps
        () => applyLiveOverrides(query.data?.vehicles ?? [], overrides),
        [query.data, overrides],
    )
    const silent = query.data?.silent ?? []

    return {
        vehicles: merged,
        silent,
        summary: useMemo(() => summarize(merged, silent.length), [merged, silent.length]),
        generatedAt: query.data?.generated_at ?? null,
        isLoading: query.isLoading,
        isError: query.isError,
        isFetching: query.isFetching,
        refetch: () => void query.refetch(),
    }
}
