import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { FuelAnalytics } from '@/lib/api/fuelPage'
import { DrainsTable, RefillsTable, VehicleTable } from '@/app/(portal)/fuel/components/analytics/AnalyticsTables'

type Refills = FuelAnalytics['refills']
type Drains = FuelAnalytics['drains']
type Rows = FuelAnalytics['by_vehicle']

const refills = (n: number, offset = 0): Refills => Array.from({ length: n }, (_, i) => ({
    id: offset + i + 1, vehicle_id: 7, registration_number: `REF-${offset + i + 1}`, at: '2026-11-03T08:00:00Z', litres: 60, source: 'device', matched_purchase: false,
}))
const drains = (n: number): Drains => Array.from({ length: n }, (_, i) => ({
    id: i + 1, vehicle_id: 7, registration_number: `DRN-${i + 1}`, at: '2026-11-03T08:00:00Z', amount: 5, unit: 'L', status: 'suspected',
} as Drains[number]))
const vehicles = (n: number): Rows => Array.from({ length: n }, (_, i) => ({
    vehicle_id: i + 1, registration_number: `VEH-${i + 1}`, make: 'Toyota', model: 'Hilux', days: 9, litres: 400, distance_km: 3000, l_per_100km: 13.3, km_per_litre: 7.5,
    refilled_litres: 60, refills: 1, purchased_litres: null, spend: null, basis: 'measured',
}))

const next = (label: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`next ${label}`, 'i') }))
const prev = (label: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`previous ${label}`, 'i') }))
const CAP = /Showing the latest 200/

describe('analytics table pagination', () => {
    it('splits 25 rows into 3 pages of 10, 10 and 5', () => {
        render(<RefillsTable refills={refills(25)} />)
        expect(screen.getByText('Showing 1-10 of 25')).toBeTruthy()
        expect(screen.getAllByRole('row')).toHaveLength(11)
        expect(screen.getByText('REF-1')).toBeTruthy()
        expect(screen.queryByText('REF-11')).toBeNull()

        next('refills')
        expect(screen.getByText('Showing 11-20 of 25')).toBeTruthy()
        expect(screen.getByText('REF-11')).toBeTruthy()

        next('refills')
        expect(screen.getByText('Showing 21-25 of 25')).toBeTruthy()
        expect(screen.getAllByRole('row')).toHaveLength(6)
        expect((screen.getByRole('button', { name: /next refills/i }) as HTMLButtonElement).disabled).toBe(true)

        prev('refills')
        expect(screen.getByText('Showing 11-20 of 25')).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: /previous refills/i }))
        expect((screen.getByRole('button', { name: /previous refills/i }) as HTMLButtonElement).disabled).toBe(true)
        expect(screen.getByRole('navigation', { name: 'Refills pages' })).toBeTruthy()
    })

    it('hides the controls at 10 rows or fewer', () => {
        const { rerender } = render(<RefillsTable refills={refills(10)} />)
        expect(screen.queryByRole('navigation')).toBeNull()
        expect(screen.queryByText(/Showing/)).toBeNull()
        rerender(<RefillsTable refills={refills(11)} />)
        expect(screen.getByRole('navigation', { name: 'Refills pages' })).toBeTruthy()
    })

    it('goes back to page 1 when the data set changes', () => {
        const { rerender } = render(<RefillsTable refills={refills(25)} />)
        next('refills')
        expect(screen.getByText('Showing 11-20 of 25')).toBeTruthy()
        rerender(<RefillsTable refills={refills(25, 100)} />)
        expect(screen.getByText('Showing 1-10 of 25')).toBeTruthy()
        expect(screen.getByText('REF-101')).toBeTruthy()
    })

    it('clamps to the last page when the data shrinks', () => {
        const { rerender } = render(<RefillsTable refills={refills(25)} />)
        next('refills'); next('refills')
        expect(screen.getByText('Showing 21-25 of 25')).toBeTruthy()
        rerender(<RefillsTable refills={refills(12)} />)
        expect(screen.getByText('Showing 1-10 of 12')).toBeTruthy()
        rerender(<RefillsTable refills={refills(5)} />)
        expect(screen.queryByRole('navigation')).toBeNull()
        expect(screen.getAllByRole('row')).toHaveLength(6)
    })

    it('shows the cap note at 200 rows and not at 199', () => {
        const { rerender } = render(<RefillsTable refills={refills(199)} />)
        expect(screen.queryByText(CAP)).toBeNull()
        rerender(<RefillsTable refills={refills(200)} />)
        expect(screen.getByText(CAP)).toBeTruthy()
        expect(screen.getByText('Showing 1-10 of 200')).toBeTruthy()
    })

    it('pages each table on its own', () => {
        const r = refills(25); const d = drains(25); const v = vehicles(25)
        render(<><RefillsTable refills={r} /><DrainsTable drains={d} /><VehicleTable rows={v} /></>)
        const nav = (name: string) => screen.getByRole('navigation', { name })
        const summary = (name: string) => within(nav(name).parentElement!).getByText(/Showing/).textContent

        next('drains')
        expect([summary('Refills pages'), summary('Drains pages'), summary('Vehicles pages')]).toEqual(['Showing 1-10 of 25', 'Showing 11-20 of 25', 'Showing 1-10 of 25'])
        next('vehicles'); next('vehicles')
        expect([summary('Refills pages'), summary('Drains pages'), summary('Vehicles pages')]).toEqual(['Showing 1-10 of 25', 'Showing 11-20 of 25', 'Showing 21-25 of 25'])
        next('refills')
        expect([summary('Refills pages'), summary('Drains pages'), summary('Vehicles pages')]).toEqual(['Showing 11-20 of 25', 'Showing 11-20 of 25', 'Showing 21-25 of 25'])
    })

    it('keeps the empty states and the drains null render', () => {
        const { container } = render(<><RefillsTable refills={[]} /><DrainsTable drains={[]} /><VehicleTable rows={[]} /></>)
        expect(screen.getByText('No refills detected in this period.')).toBeTruthy()
        expect(screen.getByText(/No fuel usage recorded/)).toBeTruthy()
        expect(screen.queryByText('Suspected drains and leaks')).toBeNull()
        expect(container.querySelector('nav')).toBeNull()
    })
})
