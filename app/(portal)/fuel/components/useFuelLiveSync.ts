'use client'

/**
 * Live overlay for the fuel module's per-vehicle status/location/fuel-level
 * data. Reuses the exact same WS channels the tracking module already
 * subscribes to (see app/(portal)/tracking/hooks/useVehicleLocations.ts) —
 * `location.organization.{org}` / `.current.recent` already carries GPS
 * (latitude/longitude) *and* fuel_level_percent/fuel_level_liters on the same
 * packet, and `vehicle.status.{org}` / `.vehicle.status.changed` carries
 * online/offline transitions.
 *
 * Unlike tracking's location channel, no DB-id-to-uuid resolution is needed
 * here: the WS packet's `vehicle_id` is the plain numeric DB id, which is
 * exactly what `/fuel/vehicles`' `id` field already is.
 */

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEcho } from '@/hooks/useEcho'
import { normalizeTelemetry } from '@/lib/utils'

export interface FuelLiveOverride {
    lat?: number
    lng?: number
    fuelPercent?: number
    fuelLiters?: number
    isOnline?: boolean
    speedKmh?: number
    lastUpdate?: string
}

export function useFuelLiveSync(): Record<number, FuelLiveOverride> {
    const { token, organization } = useAuthStore()
    const { subscribePrivate } = useEcho()
    const [overrides, setOverrides] = useState<Record<number, FuelLiveOverride>>({})

    useEffect(() => {
        const orgIdentifier = organization?.attributes?.identifier || organization?.id
        if (!token || !orgIdentifier) return

        const locationUnsubscribe = subscribePrivate(
            `location.organization.${orgIdentifier}`,
            '.current.recent',
            (packet: any) => {
                const id = Number(packet?.vehicle_id)
                if (!Number.isFinite(id)) return
                const normalized = normalizeTelemetry(packet)
                if (!normalized) return

                setOverrides((prev) => ({
                    ...prev,
                    [id]: {
                        ...prev[id],
                        lat: normalized.lat ?? prev[id]?.lat,
                        lng: normalized.lng ?? prev[id]?.lng,
                        fuelPercent: normalized.fuel_level_percent ?? prev[id]?.fuelPercent,
                        fuelLiters: normalized.fuel_level_liters ?? prev[id]?.fuelLiters,
                        isOnline: normalized.is_online ?? prev[id]?.isOnline,
                        speedKmh: normalized.speed ?? prev[id]?.speedKmh,
                        lastUpdate:
                            packet.timestamp_utc || packet.updated_at || packet.gps_datetime || prev[id]?.lastUpdate,
                    },
                }))
            },
        )

        const statusUnsubscribe = subscribePrivate(
            `vehicle.status.${orgIdentifier}`,
            '.vehicle.status.changed',
            (data: any) => {
                const id = Number(data?.vehicle_id)
                if (!Number.isFinite(id)) return
                setOverrides((prev) => ({
                    ...prev,
                    [id]: {
                        ...prev[id],
                        isOnline: data.new_status ? data.new_status !== 'offline' : prev[id]?.isOnline,
                    },
                }))
            },
        )

        return () => {
            locationUnsubscribe?.()
            statusUnsubscribe?.()
        }
    }, [token, organization?.attributes?.identifier, organization?.id, subscribePrivate])

    return overrides
}
