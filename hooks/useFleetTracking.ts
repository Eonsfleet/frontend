'use client'

import { useEffect, useState } from 'react'
import { useEcho } from './useEcho'
import { useAuthStore } from '@/store/authStore'

export interface VehicleTelemetry {
    vehicle_id: string
    latitude: number
    longitude: number
    speed: number
    heading: number
    status: string
    fuel_level_percent: number
    fuel_level_liters: number
    gps_datetime: string
    address: string
    ignition: string
    movement: string
    odometer: number
    metadata?: {
        engine_rpm?: number
        engine_temperature?: number
        battery_voltage?: number
        idling?: boolean
        eco_score?: number
        [key: string]: unknown
    }
}

export function useFleetTracking() {
    const { echo } = useEcho()
    const { organization } = useAuthStore()
    const [telemetryMap, setTelemetryMap] = useState<Record<string, VehicleTelemetry>>({})
    const [alerts, setAlerts] = useState<any[]>([])

    const orgId = organization?.id

    useEffect(() => {
        if (!echo || !orgId) return

        const channel = echo.private(`location.organization.${orgId}`)

        channel.listen('.current.recent', (packet: any) => {
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
        channel.listen('.geofence.monitor', (alert: any) => {
            setAlerts(prev => [alert, ...prev].slice(0, 50))
        })

        // Status changes
        echo.private(`vehicle.status.${orgId}`)
            .listen('.vehicle.status.changed', (event: any) => {
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
            echo.leave(`location.organization.${orgId}`)
            echo.leave(`vehicle.status.${orgId}`)
        }
    }, [echo, orgId])

    return { telemetryMap, alerts }
}
