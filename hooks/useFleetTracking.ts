'use client'

import { useEffect, useState } from 'react'
import { useEcho } from './useEcho'
import { useAuthStore } from '@/store/authStore'
import { VehicleTelemetry, GeofenceAlert } from '@/types'
import { ALERTS_BUFFER_SIZE } from '@/lib/config'

export type { VehicleTelemetry }

export function useFleetTracking() {
    const { echo } = useEcho()
    const { organization } = useAuthStore()
    const [telemetryMap, setTelemetryMap] = useState<Record<string, VehicleTelemetry>>({})
    const [alerts, setAlerts] = useState<GeofenceAlert[]>([])

    const orgIdentifier = organization?.attributes?.identifier || organization?.id

    useEffect(() => {
        if (!echo || !orgIdentifier) return

        const channel = echo.private(`location.organization.${orgIdentifier}`)

        channel.listen('.current.recent', (packet: VehicleTelemetry) => {
            setTelemetryMap(prev => ({
                ...prev,
                [packet.vehicle_id]: {
                    vehicle_id: packet.vehicle_id,
                    latitude: packet.latitude,
                    longitude: packet.longitude,
                    speed: packet.speed,
                    heading: packet.heading,
                    status: packet.status,
                    fuel_level_percent: packet.fuel_level_percent,
                    fuel_level_liters: packet.fuel_level_liters,
                    gps_datetime: packet.gps_datetime,
                    address: packet.address,
                    ignition: packet.ignition,
                    movement: packet.movement,
                    odometer: packet.odometer,
                    metadata: packet.metadata ?? undefined
                }
            }))
        })

        // Geofence alerts
        channel.listen('.geofence.monitor', (alert: GeofenceAlert) => {
            setAlerts(prev => [alert, ...prev].slice(0, ALERTS_BUFFER_SIZE))
        })

        // Status changes
        echo.private(`vehicle.status.${orgIdentifier}`)
            .listen('.vehicle.status.changed', (event: { vehicle_id: string; new_status: string }) => {
                setTelemetryMap(prev => {
                    const existing = prev[event.vehicle_id]
                    if (!existing) return prev
                    return {
                        ...prev,
                        [event.vehicle_id]: {
                            ...existing,
                            status: event.new_status
                        }
                    }
                })
            })

        return () => {
            echo.leave(`location.organization.${orgIdentifier}`)
            echo.leave(`vehicle.status.${orgIdentifier}`)
        }
    }, [echo, orgIdentifier])

    return { telemetryMap, alerts }
}
