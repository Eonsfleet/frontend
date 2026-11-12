'use client'

import { useEffect, useState } from 'react'
import { getEcho } from '@/lib/echo'
import { useAuthStore } from '@/store/authStore'
import { VehicleTelemetry } from '@/types'
import { buildPacketEntry } from '@/lib/packetStream'
import { usePacketStreamStore } from '@/store/packetStreamStore'

/**
 * The selected vehicle's per-vehicle channels. Only the two the backend really sends on are opened:
 * the device's online state, and its fuel level. `location.vehicle.{id}` and `location.{imei}`
 * (event `.current.recent`) were also opened here, but nothing on the backend dispatches
 * LocationUpdated or VehicleTracking, so they never delivered a packet and each cost a private
 * channel authorization request. The live position arrives on the fleet channel (useVehicleLocations),
 * and the extended readings (battery, RPM, GSM, ...) are refetched there while the vehicle is selected.
 */
export function useVehicleTelemetry(
    vehicleId: string | null,
    deviceId?: string | null,   // vehicle.attributes.device_id → devicestatus.{orgId}.{deviceId}
) {
    const { organization } = useAuthStore()
    const [deviceStatus, setDeviceStatus] = useState<string | null>(null)

    const orgIdentifier = organization?.attributes?.identifier || organization?.id

    useEffect(() => {
        const echo = getEcho()
        if (!echo || !vehicleId || !orgIdentifier) return

        const push = (event: string, payload: unknown) =>
            usePacketStreamStore.getState().push(buildPacketEntry(vehicleId, event, payload))

        // Device status (online/offline)
        let statusChannel: ReturnType<typeof echo.private> | null = null
        if (deviceId) {
            statusChannel = echo.private(`devicestatus.${orgIdentifier}.${deviceId}`)
            statusChannel.listen('.device.status', (event: { is_online: boolean }) => {
                setDeviceStatus(event.is_online ? 'online' : 'offline')
                push('.device.status', event)
            })
        }

        // Per-vehicle fuel level stream
        const fuelChannel = echo.private(`fuel.vehicle.${vehicleId}`)
        fuelChannel.listen('.fuel.level', (event: unknown) => {
            push('.fuel.level', event)
        })

        return () => {
            if (deviceId) echo.leave(`devicestatus.${orgIdentifier}.${deviceId}`)
            echo.leave(`fuel.vehicle.${vehicleId}`)
        }
    }, [vehicleId, orgIdentifier, deviceId])

    return { telemetry: null as VehicleTelemetry | null, deviceStatus }
}
