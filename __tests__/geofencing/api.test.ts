import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    getGeofences,
    getGeofenceById,
    createGeofence,
    updateGeofence,
    deleteGeofence,
    getGeofenceVehicles,
    bulkAssignVehicles,
    getGeofenceAnalytics,
} from '@/lib/api/geofencing'

// Mock the axios api client
vi.mock('@/lib/api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}))

import apiClient from '@/lib/api/client'

const mockGeofence = {
    id: '1',
    attributes: {
        name: 'Test Zone',
        description: 'A test geofence',
        type: 'circle' as const,
        alert_type: 'both' as const,
        coordinates: { lat: 6.5244, lng: 3.3792 },
        radius: 500,
        is_active: true,
        schedule: null,
    },
    relationships: { vehicles: { data: [] } },
}

beforeEach(() => {
    vi.clearAllMocks()
})

describe('getGeofences', () => {
    it('calls GET /geofences with default params', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            data: { message: 'OK', data: { geofences: [mockGeofence], pagination: {} } },
        })
        const result = await getGeofences()
        expect(apiClient.get).toHaveBeenCalledWith('/geofences', { params: undefined })
        expect(result.data.geofences).toHaveLength(1)
    })

    it('passes pagination params', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            data: { message: 'OK', data: { geofences: [], pagination: {} } },
        })
        await getGeofences({ page: 2, per_page: 5 })
        expect(apiClient.get).toHaveBeenCalledWith('/geofences', { params: { page: 2, per_page: 5 } })
    })
})

describe('getGeofenceById', () => {
    it('calls GET /geofences/:id', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: { message: 'OK', data: mockGeofence } })
        const result = await getGeofenceById('1')
        expect(apiClient.get).toHaveBeenCalledWith('/geofences/1')
        expect(result.data.attributes.name).toBe('Test Zone')
    })
})

describe('createGeofence', () => {
    it('calls POST /geofences with payload', async () => {
        vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'OK', data: mockGeofence } })
        const payload = { name: 'Test Zone', type: 'circle' as const, alert_type: 'both' as const, coordinates: { lat: 6.5244, lng: 3.3792 }, radius: 500, is_active: true }
        await createGeofence(payload)
        expect(apiClient.post).toHaveBeenCalledWith('/geofences', payload)
    })
})

describe('updateGeofence', () => {
    it('calls PUT /geofences/:id with partial data', async () => {
        vi.mocked(apiClient.put).mockResolvedValue({ data: { message: 'OK', data: mockGeofence } })
        await updateGeofence('1', { name: 'Updated Zone' })
        expect(apiClient.put).toHaveBeenCalledWith('/geofences/1', { name: 'Updated Zone' })
    })
})

describe('deleteGeofence', () => {
    it('calls DELETE /geofences/:id', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({})
        await deleteGeofence('1')
        expect(apiClient.delete).toHaveBeenCalledWith('/geofences/1')
    })
})

describe('getGeofenceVehicles', () => {
    it('calls GET /geofences/:id/vehicles', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } })
        await getGeofenceVehicles('42')
        expect(apiClient.get).toHaveBeenCalledWith('/geofences/42/vehicles')
    })
})

describe('bulkAssignVehicles', () => {
    it('calls POST /geofences/:id/bulk-assign with vehicle_ids and preserve_existing', async () => {
        vi.mocked(apiClient.post).mockResolvedValue({ data: { data: {} } })
        await bulkAssignVehicles('1', ['10', '11', '12'], true)
        expect(apiClient.post).toHaveBeenCalledWith('/geofences/1/bulk-assign', {
            vehicle_ids: ['10', '11', '12'],
            preserve_existing: true,
        })
    })

    it('defaults preserve_existing to true', async () => {
        vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
        await bulkAssignVehicles('5', ['1'])
        expect(apiClient.post).toHaveBeenCalledWith('/geofences/5/bulk-assign', {
            vehicle_ids: ['1'],
            preserve_existing: true,
        })
    })
})

describe('getGeofenceAnalytics', () => {
    it('calls GET /geofences/:id/analytics with params', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {} } })
        await getGeofenceAnalytics('3', { days: 30, include_timeline: true, include_ranking: true })
        expect(apiClient.get).toHaveBeenCalledWith('/geofences/3/analytics', {
            params: { days: 30, include_timeline: true, include_ranking: true },
        })
    })
})
