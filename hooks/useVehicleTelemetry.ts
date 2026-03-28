'use client'

import { useEffect, useState } from 'react'
import { getEcho } from '@/lib/echo'
import { useAuthStore } from '@/store/authStore'
import { VehicleTelemetry } from '@/types'

export function useVehicleTelemetry(
    vehicleId: string | null,
    deviceId?: string | null,   // vehicle.attributes.device_id → devicestatus.{orgId}.{deviceId}
    imei?: string | null        // vehicle.relationships.device.data.imei → location.{imei}
) {
    const { organization } = useAuthStore()
    const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null)
    const [deviceStatus, setDeviceStatus] = useState<string | null>(null)

    const orgIdentifier = organization?.attributes?.identifier || organization?.id

    useEffect(() => {
        const echo = getEcho()
        if (!echo || !vehicleId || !orgIdentifier) return

        // Layer 2a: Per-vehicle location stream
        const vehicleChannel = echo.private(`location.vehicle.${vehicleId}`)
        vehicleChannel.listen('.current.recent', (packet: VehicleTelemetry) => {
            setTelemetry(packet)
        })

        // Layer 2b: Location by device IMEI (raw device stream)
        let imeiChannel: ReturnType<typeof echo.private> | null = null
        if (imei) {
            imeiChannel = echo.private(`location.${imei}`)
            imeiChannel.listen('.current.recent', (packet: VehicleTelemetry) => {
                // Only apply if no vehicle-level data has arrived yet
                setTelemetry((prev) => prev ?? packet)
            })
        }

        // Layer 2c: Device status (online/offline)
        let statusChannel: ReturnType<typeof echo.private> | null = null
        if (deviceId) {
            statusChannel = echo.private(`devicestatus.${orgIdentifier}.${deviceId}`)
            statusChannel.listen('.device.status', (event: { status: string }) => {
                setDeviceStatus(event.status)
            })
        }

        return () => {
            echo.leave(`location.vehicle.${vehicleId}`)
            if (imei) echo.leave(`location.${imei}`)
            if (deviceId) echo.leave(`devicestatus.${orgIdentifier}.${deviceId}`)
        }
    }, [vehicleId, orgIdentifier, deviceId, imei])

    return { telemetry, deviceStatus }
}
