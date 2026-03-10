'use client'

import { useEffect, useState } from 'react'
import { useEcho } from './useEcho'
import { useAuthStore } from '@/store/authStore'

export function useVehicleTelemetry(vehicleId: string | null, deviceImei?: string | null) {
    const { echo } = useEcho()
    const { organization } = useAuthStore()
    const [telemetry, setTelemetry] = useState<any>(null)
    const [deviceStatus, setDeviceStatus] = useState<string | null>(null)

    const orgId = organization?.id

    useEffect(() => {
        if (!echo || !vehicleId || !orgId) return

        // Per-vehicle location
        const vehicleChannel = echo.private(`location.vehicle.${vehicleId}`)
        vehicleChannel.listen('.current.recent', (packet: any) => {
            setTelemetry(packet)
        })

        // Fuel level
        const fuelChannel = echo.private(`fuel.vehicle.${vehicleId}`)
        fuelChannel.listen('.fuel.level', (event: any) => {
            setTelemetry((prev: any) => prev ? {
                ...prev,
                fuel_level_percent: event.fuel_level_percent,
                fuel_level_liters: event.fuel_level_liters
            } : null)
        })

        // Device status
        let statusChannel: any = null
        if (deviceImei) {
            statusChannel = echo.private(`devicestatus.${orgId}.${deviceImei}`)
            statusChannel.listen('.device.status', (event: any) => {
                setDeviceStatus(event.status)
            })
        }

        return () => {
            echo.leave(`location.vehicle.${vehicleId}`)
            echo.leave(`fuel.vehicle.${vehicleId}`)
            if (deviceImei) {
                echo.leave(`devicestatus.${orgId}.${deviceImei}`)
            }
        }
    }, [echo, vehicleId, orgId, deviceImei])

    return { telemetry, deviceStatus }
}
