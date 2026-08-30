import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    getTrackingMetrics,
    getVehiclePlayback,
    getDeviceStatus,
    getDevices,
    getTripPlayback,
    getVehicleSensorHealth,
    getVehicleRouteHistory,
} from '@/lib/api/tracking'

vi.mock('@/lib/api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}))

import apiClient from '@/lib/api/client'

const mockGet = apiClient.get as ReturnType<typeof vi.fn>

beforeEach(() => {
    vi.clearAllMocks()
})

describe('getTrackingMetrics', () => {
    it('calls /tracker/metrics and returns data', async () => {
        const payload = { data: { total_active_assets: 10, moving_assets: 4, idle_assets: 3, offline_assets: 3 } }
        mockGet.mockResolvedValueOnce({ data: payload })
        const result = await getTrackingMetrics()
        expect(mockGet).toHaveBeenCalledWith('/tracker/metrics')
        expect(result).toEqual(payload)
    })
})

describe('getVehiclePlayback', () => {
    it('GETs /vehicles/:id/playback with start_date and end_date params', async () => {
        const payload = {
            data: [
                { latitude: 6.1, longitude: 3.3, speed: 60, timestamp: '2024-01-01T10:00:00Z', fuel_level: 45, ignition: 'on', movement: 'on' }
            ],
            meta: { total: 1, vehicle_id: 42, start_date: '2024-01-01T09:00:00Z', end_date: '2024-01-01T10:00:00Z' }
        }
        mockGet.mockResolvedValueOnce({ data: payload })
        const result = await getVehiclePlayback('42', '2024-01-01T09:00:00Z', '2024-01-01T10:00:00Z')
        expect(mockGet).toHaveBeenCalledWith('/vehicles/42/playback', {
            params: { start_date: '2024-01-01T09:00:00Z', end_date: '2024-01-01T10:00:00Z' },
        })
        expect(result).toEqual(payload)
    })
})

describe('getDeviceStatus', () => {
    it('calls /tracker/:deviceIdent', async () => {
        const payload = { data: { status: 'online', last_seen: '2024-01-01T10:00:00Z' } }
        mockGet.mockResolvedValueOnce({ data: payload })
        const result = await getDeviceStatus('IMEI-123456')
        expect(mockGet).toHaveBeenCalledWith('/tracker/IMEI-123456')
        expect(result).toEqual(payload)
    })
})

describe('getDevices', () => {
    it('calls /devices with params', async () => {
        const payload = { data: { devices: [], pagination: { current_page: 1, last_page: 1, total: 0, per_page: 20 } } }
        mockGet.mockResolvedValueOnce({ data: payload })
        const result = await getDevices({ per_page: 20 })
        expect(mockGet).toHaveBeenCalledWith('/devices', { params: { per_page: 20 } })
        expect(result).toEqual(payload)
    })

    it('calls /devices without params', async () => {
        const payload = { data: { devices: [], pagination: {} } }
        mockGet.mockResolvedValueOnce({ data: payload })
        await getDevices()
        expect(mockGet).toHaveBeenCalledWith('/devices', { params: undefined })
    })
})

describe('getTripPlayback', () => {
    it('calls /vehicles/:vehicleId/trips/:tripId/playback', async () => {
        const payload = { data: { gps_points: [{ lat: 6.1, lng: 3.3, speed: 50, heading: 180, timestamp: '2024-01-01T10:00:00Z' }] } }
        mockGet.mockResolvedValueOnce({ data: payload })
        const result = await getTripPlayback('10', '55')
        expect(mockGet).toHaveBeenCalledWith('/vehicles/10/trips/55/playback', { params: undefined })
        expect(result).toEqual(payload)
    })

    it('passes optional params', async () => {
        mockGet.mockResolvedValueOnce({ data: {} })
        await getTripPlayback('10', '55', { include_gps_points: true, point_interval: 30 })
        expect(mockGet).toHaveBeenCalledWith('/vehicles/10/trips/55/playback', {
            params: { include_gps_points: true, point_interval: 30 },
        })
    })
})

describe('getVehicleSensorHealth', () => {
    it('calls /vehicles/:vehicleId/sensors/health', async () => {
        const payload = {
            data: {
                battery_voltage: '14.2V',
                signal_strength: '8 Sats',
                engine_temp: 92,
                obd_status: 'normal',
            },
        }
        mockGet.mockResolvedValueOnce({ data: payload })
        const result = await getVehicleSensorHealth('7')
        expect(mockGet).toHaveBeenCalledWith('/vehicles/7/sensors/health', { params: undefined })
        expect(result).toEqual(payload)
    })

    it('passes include_history and anomaly_threshold params', async () => {
        mockGet.mockResolvedValueOnce({ data: {} })
        await getVehicleSensorHealth('7', { include_history: true, anomaly_threshold: 'high' })
        expect(mockGet).toHaveBeenCalledWith('/vehicles/7/sensors/health', {
            params: { include_history: true, anomaly_threshold: 'high' },
        })
    })
})

describe('getVehicleRouteHistory', () => {
    it('GETs /vehicles/:id/route-history with the window and asks for paths by default', async () => {
        const payload = {
            message: 'Route history retrieved successfully',
            data: [],
            meta: {
                total: 0,
                vehicle_id: '42',
                start_date: '2026-08-30T00:00:00Z',
                end_date: '2026-08-30T23:59:59Z',
                summary: {
                    trips: 0, distance_km: 0, duration_seconds: 0,
                    idle_seconds: 0, stops: 0, max_speed: 0, avg_speed: 0,
                },
            },
        }
        mockGet.mockResolvedValueOnce({ data: payload })

        const result = await getVehicleRouteHistory('42', '2026-08-30T00:00:00Z', '2026-08-30T23:59:59Z')

        expect(mockGet).toHaveBeenCalledWith('/vehicles/42/route-history', {
            params: {
                start_date: '2026-08-30T00:00:00Z',
                end_date: '2026-08-30T23:59:59Z',
                include_path: 1,
            },
        })
        expect(result).toEqual(payload)
    })

    it('opts out of paths when the caller only needs the journey summaries', async () => {
        mockGet.mockResolvedValueOnce({ data: { data: [], meta: {} } })

        await getVehicleRouteHistory('42', '2026-08-30T00:00:00Z', '2026-08-30T23:59:59Z', {
            includePath: false,
        })

        expect(mockGet).toHaveBeenCalledWith('/vehicles/42/route-history', {
            params: expect.objectContaining({ include_path: 0 }),
        })
    })
})
