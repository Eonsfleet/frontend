'use client'

import { useEffect, useState } from 'react'
import { getEcho } from '@/lib/echo'
import { useAuthStore } from '@/store/authStore'
import { VehicleTelemetry } from '@/types'
import { buildPacketEntry } from '@/lib/packetStream'
import { usePacketStreamStore } from '@/store/packetStreamStore'

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

        const push = (event: string, payload: unknown) =>
            usePacketStreamStore.getState().push(buildPacketEntry(vehicleId, event, payload))

        // Layer 2a: Per-vehicle location stream
        const vehicleChannel = echo.private(`location.vehicle.${vehicleId}`)
        vehicleChannel.listen('.current.recent', (packet: VehicleTelemetry) => {
            setTelemetry(packet)
            push('.current.recent', packet)
        })

        // Layer 2b: Location by device IMEI (raw device stream)
        let imeiChannel: ReturnType<typeof echo.private> | null = null
        if (imei) {
            imeiChannel = echo.private(`location.${imei}`)
            imeiChannel.listen('.current.recent', (packet: VehicleTelemetry) => {
                setTelemetry(packet)
                push('.current.recent', packet)
            })
        }

        // Layer 2c: Device status (online/offline)
        let statusChannel: ReturnType<typeof echo.private> | null = null
        if (deviceId) {
            statusChannel = echo.private(`devicestatus.${orgIdentifier}.${deviceId}`)
            statusChannel.listen('.device.status', (event: { is_online: boolean }) => {
                setDeviceStatus(event.is_online ? 'online' : 'offline')
                push('.device.status', event)
            })
        }

        // Layer 2d: Per-vehicle fuel level stream
        const fuelChannel = echo.private(`fuel.vehicle.${vehicleId}`)
        fuelChannel.listen('.fuel.level', (event: unknown) => {
            push('.fuel.level', event)
        })

        return () => {
            echo.leave(`location.vehicle.${vehicleId}`)
            if (imei) echo.leave(`location.${imei}`)
            if (deviceId) echo.leave(`devicestatus.${orgIdentifier}.${deviceId}`)
            echo.leave(`fuel.vehicle.${vehicleId}`)
        }
    }, [vehicleId, orgIdentifier, deviceId, imei])

    return { telemetry, deviceStatus }
}
