import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { CatalogTab } from '@/components/reports/CatalogTab'

const base = { favorites: [] as string[], recent: [] as string[], onOpen: vi.fn(), onToggleFavorite: vi.fn() }

describe('report catalog', () => {
    it('searches by name', () => {
        render(<CatalogTab {...base} />)

        fireEvent.change(screen.getByLabelText('Search reports'), { target: { value: 'trip summary' } })

        const card = screen.getAllByRole('button', { name: /Trip Summary \(Every Trip/ })[0]
        expect(card.textContent).toContain('Export')
        expect(screen.queryByText('Per-Vehicle Utilization & Active Days')).toBeNull()
    })

    it('lists only the telemetry reports, filters by category and opens a report', () => {
        const onOpen = vi.fn()
        render(<CatalogTab {...base} onOpen={onOpen} />)

        expect(screen.queryByRole('button', { name: 'Incidents' })).toBeNull()
        expect(screen.queryByText('Fuel Cost Analysis')).toBeNull()

        fireEvent.click(screen.getByRole('button', { name: 'Telemetry' }))
        fireEvent.click(screen.getByRole('button', { name: /^Telemetry\s*Stops \(Place/ }))

        expect(onOpen).toHaveBeenCalledWith('gps.stops')
    })

    it('shows favorites and recently run reports above the full list, and a message when nothing matches', () => {
        render(<CatalogTab {...base} favorites={['gps.daily', 'fuel.cost-report']} recent={['gps.trips']} />)
        expect(screen.getByText('Recently run')).toBeTruthy()
        expect(screen.getByText('Favorites')).toBeTruthy()

        fireEvent.change(screen.getByLabelText('Search reports'), { target: { value: 'zzzz' } })
        expect(screen.getByText('No report matches your search')).toBeTruthy()
    })
})
