'use client'

/**
 * Live overlay for the fuel module's per-vehicle status/location/fuel-level
 * data. Reuses the exact same WS channels the tracking module subscribes to
 * (see app/(portal)/tracking/hooks/useVehicleLocations.ts) —
 * `org.{org}.tracking` / `.vehicle.location.updated` carries GPS (lat/lng),
 * speed, is_online *and* fuel_level_percent/fuel_level_liters on one packet,
 * and `vehicle.status.{org}` / `.vehicle.status.changed` carries online/offline
 * transitions.
 *
 * It used to listen on `location.organization.{org}` / `.current.recent`, which
 * the Laravel broadcaster retired: nothing publishes there any more, so this
 * overlay silently received nothing and the page was live in name only —
 * every vehicle sat at speed 0 (hence "idle") on a 10s REST poll.
 *
 * Unlike tracking's location channel, no DB-id-to-uuid resolution is needed
 * here: the WS packet's `vehicle_id` is the plain numeric DB id, which is
 * exactly what the vehicles list `id` field already is.
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
            `org.${orgIdentifier}.tracking`,
            '.vehicle.location.updated',
            (packet: any) => {
                const id = Number(packet?.vehicle_id)
                if (!Number.isFinite(id)) return
                // A packet on this channel is by definition a live position, so
                // is_online defaults to true when the payload omits it — passed
                // as an override so a real `false` still comes through.
                const normalized = normalizeTelemetry(packet, {
                    is_online: packet.is_online ?? true,
                })
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
                            packet.timestamp ||
                            packet.timestamp_utc ||
                            packet.updated_at ||
                            packet.gps_datetime ||
                            prev[id]?.lastUpdate,
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
