import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FuelBudgetList } from '@/lib/api/fuelPage'

const api = vi.hoisted(() => ({ getFuelBudgets: vi.fn(), saveFuelBudgets: vi.fn(), adjustFuelBudgets: vi.fn(), applyFuelBudgetProposals: vi.fn() }))
vi.mock('@/lib/api/fuelPage', async (orig) => ({ ...(await orig<typeof import('@/lib/api/fuelPage')>()), ...api }))
vi.mock('@/lib/api/settings', () => ({ getClustersBatched: vi.fn().mockResolvedValue([{ id: '4', attributes: { name: 'Lagos North' } }]) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

import FuelBudgetsPage from '@/app/(portal)/fuel/settings/budgets/page'
import { parseLitres } from '@/app/(portal)/fuel/components/budget'

const list = (): FuelBudgetList => ({
    month: '2026-11',
    totals: { vehicles: 3, budgeted: 1, unbudgeted: 2, litres: 300, manual: 1, proposed: 0 },
    vehicles: [
        { vehicle_id: 1, registration_number: 'LAG-1-XY', make: 'toyota', model: 'hilux', type: 'pickup', cluster_id: 4, budget_litres: 300, source: 'manual', proposal: null },
        { vehicle_id: 2, registration_number: 'LAG-2-XY', make: 'toyota', model: 'hilux', type: 'pickup', cluster_id: 4, budget_litres: null, source: null, proposal: { litres: 412.5, days_of_data: 60 } },
        { vehicle_id: 3, registration_number: 'LAG-3-XY', make: 'ford', model: 'ranger', type: 'pickup', cluster_id: null, budget_litres: null, source: null, proposal: null },
    ],
    page: 1, per_page: 50, total: 3,
})

const renderPage = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><FuelBudgetsPage /></QueryClientProvider>)

beforeEach(() => { vi.clearAllMocks(); api.getFuelBudgets.mockResolvedValue(list()) })

describe('parsing', () => {
    it('accepts litres of zero or more and nothing else', () => {
        expect(parseLitres('250.5')).toBe(250.5)
        expect(parseLitres('0')).toBe(0)
        expect(parseLitres('')).toBeNull()
        expect(parseLitres('-5')).toBeNull()
        expect(parseLitres('abc')).toBeNull()
    })
})

describe('fuel budgets page', () => {
    it('shows the totals and says when there is no history to propose from', async () => {
        renderPage()
        await screen.findByText('LAG-1-XY')

        expect(screen.getByText('Without').nextSibling?.textContent).toBe('2')
        expect(screen.getAllByText('Not enough history')).toHaveLength(2)
        expect(screen.getByText(/60 days of use/)).toBeTruthy()
    })

    it('fills a field from the proposal and saves only what changed', async () => {
        api.saveFuelBudgets.mockResolvedValue({ saved: 1 })
        renderPage()
        await screen.findByText('LAG-2-XY')

        fireEvent.click(screen.getByText('Use'))
        expect((screen.getByLabelText('Budget for LAG-2-XY') as HTMLInputElement).value).toBe('412.5')
        fireEvent.click(screen.getByText('Save 1 change'))

        await waitFor(() => expect(api.saveFuelBudgets).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/), [{ vehicle_id: 2, litres: 412.5 }]))
    })

    it('will not save a negative or non-numeric budget', async () => {
        renderPage()
        await screen.findByText('LAG-1-XY')

        fireEvent.change(screen.getByLabelText('Budget for LAG-1-XY'), { target: { value: '-20' } })

        expect(screen.getByText('Budgets must be litres of 0 or more.')).toBeTruthy()
        expect((screen.getByText(/^Save/) as HTMLButtonElement).disabled).toBe(true)
        expect(api.saveFuelBudgets).not.toHaveBeenCalled()
    })

    it('reports what filling from history did, including the budgets it kept', async () => {
        api.applyFuelBudgetProposals.mockResolvedValue({ written: 4, skipped_manual: 2, no_history: 1 })
        renderPage()
        await screen.findByText('LAG-1-XY')

        fireEvent.click(screen.getByText('Fill from history'))

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Filled 4 from history · kept 2 you set by hand · 1 without enough history'))
    })

    it('asks before moving every budget by a percentage, and bounds it', async () => {
        api.adjustFuelBudgets.mockResolvedValue({ changed: 3 })
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
        renderPage()
        await screen.findByText('LAG-1-XY')
        const apply = screen.getByText('Apply') as HTMLButtonElement

        fireEvent.change(screen.getByLabelText('Adjust by percent'), { target: { value: '-95' } })
        expect(apply.disabled).toBe(true)
        fireEvent.change(screen.getByLabelText('Adjust by percent'), { target: { value: '-10' } })
        fireEvent.click(apply)

        await waitFor(() => expect(api.adjustFuelBudgets).toHaveBeenCalledWith(expect.any(String), -10, {}))
        expect(confirm).toHaveBeenCalled()
    })

    it('shows the server\'s reason when saving is refused', async () => {
        api.saveFuelBudgets.mockRejectedValue({ response: { data: { message: 'Forbidden' } } })
        renderPage()
        await screen.findByText('LAG-1-XY')

        fireEvent.change(screen.getByLabelText('Budget for LAG-1-XY'), { target: { value: '320' } })
        fireEvent.click(screen.getByText('Save 1 change'))

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Forbidden'))
    })

    it('reports a failed load', async () => {
        api.getFuelBudgets.mockRejectedValue(new Error('boom'))
        renderPage()

        expect(await screen.findByText(/Failed to load budgets/)).toBeTruthy()
    })
})
