import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

const path = '/analytics/fleet/working-hours'
const query = 'filter=7d&vehicle_ids=4'
vi.mock('next/navigation', () => ({
    usePathname: () => path,
    useSearchParams: () => new URLSearchParams(query),
}))

import { AnalyticsShell } from '@/components/analytics/shell/AnalyticsShell'

describe('analytics shell and navigation', () => {
    it('keeps all six tabs reachable in one scrollable row, so none is lost on a phone', () => {
        render(<AnalyticsShell><p>page</p></AnalyticsShell>)
        const nav = screen.getByRole('navigation', { name: 'Analytics sections' })
        expect(nav.className).toMatch(/overflow-x-auto/)
        const links = within(nav).getAllByRole('link')
        expect(links.map((l) => l.textContent)).toEqual(['Overview', 'Fleet', 'Drivers', 'Maintenance', 'Incidents', 'Alarms & Events'])
        // The old sidebar was `hidden md:block`; nothing in the new frame is hidden by breakpoint.
        expect(nav.closest('[class*="hidden"]')).toBeNull()
    })

    it('marks the current tab, including on a sub-page, and carries filters the destination can honor', () => {
        render(<AnalyticsShell><p>page</p></AnalyticsShell>)
        expect(screen.getByRole('link', { name: 'Fleet' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
        expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/analytics?filter=7d&vehicle_ids=4')
        expect(screen.getByRole('link', { name: 'Fleet' })).toHaveAttribute('href', '/analytics/fleet?filter=7d&vehicle_ids=4')
        expect(screen.getByRole('link', { name: 'Alarms & Events' })).toHaveAttribute('href', '/analytics/alarms?filter=7d&vehicle_id=4')
    })

    it('renders the page content under the tabs, with no version switch', () => {
        render(<AnalyticsShell><p>page</p></AnalyticsShell>)
        expect(screen.getByText('page')).toBeInTheDocument()
        expect(screen.queryByText(/previous version|Preview/i)).not.toBeInTheDocument()
    })
})
