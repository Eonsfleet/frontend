import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('@/lib/api/client', () => ({ default: { get: (...args: unknown[]) => get(...args) } }))

import { getEvents, getTrips } from '@/lib/api/telemetryReports'

describe('telemetry report API', () => {
    beforeEach(() => get.mockReset())

    it('sends array filters the way Laravel reads them and drops empty ones', async () => {
        get.mockResolvedValue({ data: { data: { data: [], meta: { page: 1 }, totals: { trips: 0 } } } })

        await getEvents({ filter: '7d', vehicle_ids: [3, 4], categories: [], severities: undefined, page: 2 })

        const [url, config] = get.mock.calls[0]
        expect(url).toBe('/analytics/events')
        expect(config.params).toEqual({ filter: '7d', 'vehicle_ids[]': [3, 4], page: 2 })
        expect(config.paramsSerializer).toEqual({ indexes: null })
    })

    it('splits a report into its rows, meta and the rest', async () => {
        get.mockResolvedValue({ data: { data: { data: [{ id: 'trp_1' }], meta: { total: 1 }, totals: { trips: 1 }, vehicles: [] } } })

        const page = await getTrips({ filter: '7d' })

        expect(page.data).toEqual([{ id: 'trp_1' }])
        expect(page.meta).toEqual({ total: 1 })
        expect(page.extra).toEqual({ totals: { trips: 1 }, vehicles: [] })
    })
})
