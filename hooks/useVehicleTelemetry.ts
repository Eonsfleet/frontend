'use client'

import { useEffect, useState } from 'react'
import { getEcho } from '@/lib/echo'
import { useAuthStore } from '@/store/authStore'

export function useVehicleTelemetry(
    vehicleId: string | null,
    deviceId?: string | null,   // vehicle.attributes.device_id → devicestatus.{orgId}.{deviceId}
    imei?: string | null        // vehicle.relationships.device.data.imei → location.{imei}
) {
    const { organization } = useAuthStore()
    const [telemetry, setTelemetry] = useState<any>(null)
    const [deviceStatus, setDeviceStatus] = useState<string | null>(null)

    const orgId = organization?.id

    useEffect(() => {
        const echo = getEcho()
        if (!echo || !vehicleId || !orgId) return

        // Layer 2a: Per-vehicle location stream
        const vehicleChannel = echo.private(`location.vehicle.${vehicleId}`)
        vehicleChannel.listen('.current.recent', (packet: any) => {
            setTelemetry(packet)
        })

        // Layer 2b: Location by device IMEI (raw device stream)
        let imeiChannel: any = null
        if (imei) {
            imeiChannel = echo.private(`location.${imei}`)
            imeiChannel.listen('.current.recent', (packet: any) => {
                // Only apply if no vehicle-level data has arrived yet
                setTelemetry((prev: any) => prev ?? packet)
            })
        }

        // Layer 2c: Device status (online/offline)
        let statusChannel: any = null
        if (deviceId) {
            statusChannel = echo.private(`devicestatus.${orgId}.${deviceId}`)
            statusChannel.listen('.device.status', (event: any) => {
                setDeviceStatus(event.status)
            })
        }

        return () => {
            echo.leave(`location.vehicle.${vehicleId}`)
            if (imei) echo.leave(`location.${imei}`)
            if (deviceId) echo.leave(`devicestatus.${orgId}.${deviceId}`)
        }
    }, [vehicleId, orgId, deviceId, imei])

    return { telemetry, deviceStatus }
}
