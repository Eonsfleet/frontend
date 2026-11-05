import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { filtersFrom, renderWithClient } from './helpers'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/analytics',
    useSearchParams: () => new URLSearchParams(),
}))
const api = vi.hoisted(() => ({ detectAnomalies: vi.fn() }))
vi.mock('@/lib/api/analyticsOverview', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/analyticsOverview')>()), ...api }))

import { AnomaliesPanel } from '@/components/analytics/overview/AnomaliesPanel'

const anomaly = (i: number, severity: string) => ({ id: `a${i}`, type: 't', severity, title: `Finding ${i}`, description: `Details ${i}`, vehicle_id: i, vehicle_registration: `REG-${i}` })

beforeEach(() => api.detectAnomalies.mockReset())

describe('detected anomalies', () => {
    it('lists every finding in one scrollable box, most severe first, with no show-more toggle', async () => {
        api.detectAnomalies.mockResolvedValue({
            anomaly_count: 7, critical_count: 1, high_count: 2, medium_count: 4, low_count: 0, detected_at: '2026-11-03T09:00:00Z', lookback_days: 30,
            anomalies: [anomaly(1, 'low'), anomaly(2, 'critical'), ...[3, 4, 5, 6].map((i) => anomaly(i, 'medium')), anomaly(7, 'high')],
        })
        renderWithClient(<AnomaliesPanel filters={filtersFrom()} />)

        const box = await screen.findByRole('region', { name: 'Detected anomalies list' }, { timeout: 4000 })
        expect(box.className).toMatch(/max-h-80/)
        expect(box.className).toMatch(/overflow-y-auto/)
        expect(box).toHaveAttribute('tabindex', '0') // reachable by keyboard, so it can be scrolled without a mouse

        const items = within(box).getAllByRole('listitem')
        expect(items).toHaveLength(7)
        expect(items[0]).toHaveTextContent('Finding 2') // critical first
        expect(items[1]).toHaveTextContent('Finding 7') // then high
        expect(items[6]).toHaveTextContent('Finding 1') // low last

        expect(screen.queryByRole('button', { name: /Show all|Show fewer/ })).not.toBeInTheDocument()
    })

    it('keeps the empty state free of the scroll box', async () => {
        api.detectAnomalies.mockResolvedValue({ anomaly_count: 0, critical_count: 0, high_count: 0, medium_count: 0, low_count: 0, detected_at: '2026-11-03T09:00:00Z', lookback_days: 30, anomalies: [] })
        renderWithClient(<AnomaliesPanel filters={filtersFrom()} />)
        expect(await screen.findByText(/No anomalies found/, undefined, { timeout: 4000 })).toBeInTheDocument()
        expect(screen.queryByRole('region', { name: 'Detected anomalies list' })).not.toBeInTheDocument()
    })
})
