import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { filtersFrom, renderWithClient } from './helpers'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/analytics',
    useSearchParams: () => new URLSearchParams(),
}))
vi.mock('recharts', async (importOriginal) => {
    const real = await importOriginal<typeof import('recharts')>()
    // jsdom has no layout, so a responsive chart renders nothing; the numbers are what is compared.
    return { ...real, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }
})

// One backend, answering both versions with the same real-shaped payloads.
const { incidentSummary, fleetHealth } = vi.hoisted(() => ({
    incidentSummary: { total: 12, open: 3, resolved: 5, closed: 2, dismissed: 1, escalated: 1 },
    fleetHealth: { score: 72, rating: 'good', total_vehicles: 20, computed_at: '2026-11-03T09:00:00Z', components: { vehicle_active_rate: 80, maintenance_compliance: 70, incident_free_rate: 90, fuel_efficiency_score: 100 } },
}))

vi.mock('@/lib/api/analytics', async (importOriginal) => {
    const real = await importOriginal<typeof import('@/lib/api/analytics')>()
    const stubs = Object.fromEntries(Object.keys(real).map((k) => [k, vi.fn().mockResolvedValue(undefined)]))
    return {
        ...stubs,
        getIncidentSummary: vi.fn().mockResolvedValue(incidentSummary),
        getFleetHealthScore: vi.fn().mockResolvedValue(fleetHealth),
    }
})
const v2 = vi.hoisted(() => ({ getIncidentSummary: vi.fn(), getIncidentsOverTime: vi.fn(), getTripCounts: vi.fn() }))
vi.mock('@/lib/api/analyticsOverview', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/api/analyticsOverview')>()), ...v2 }))

import LegacyOverview from '@/components/analytics/legacy/LegacyOverview'
import { IncidentsPanel } from '@/components/analytics/overview/IncidentsPanel'

beforeEach(() => {
    v2.getIncidentSummary.mockResolvedValue(incidentSummary)
    v2.getIncidentsOverTime.mockResolvedValue({ labels: [], data: [] })
})

describe('new Overview against the existing one, on the same backend data', () => {
    it('reports the same total and open incidents', async () => {
        const legacy = renderWithClient(<LegacyOverview />)
        const legacyOpen = await legacy.findByText(/open \/ unresolved/)
        const legacyOpenCount = Number(legacyOpen.textContent!.match(/(\d+) open/)![1])
        // The total sits in the same card as the open line.
        const legacyCard = legacyOpen.closest('div')!.parentElement!
        const legacyTotal = Number(within(legacyCard).getByText(/^\d+$/).textContent)
        legacy.unmount()

        renderWithClient(<IncidentsPanel filters={filtersFrom('filter=30d')} />)
        const total = await screen.findByText('Total')
        const open = screen.getByText('Open')
        const readNumber = (label: HTMLElement) => Number(label.parentElement!.parentElement!.textContent!.replace(label.textContent!, '').replace(/\D/g, ''))

        await waitFor(() => expect(readNumber(total)).toBe(legacyTotal))
        expect(readNumber(open)).toBe(legacyOpenCount)
        expect([legacyTotal, legacyOpenCount]).toEqual([12, 3])
    })
})
