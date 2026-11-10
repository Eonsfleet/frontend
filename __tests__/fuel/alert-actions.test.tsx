import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const fuel = vi.hoisted(() => ({ acknowledgeFuelAlert: vi.fn(), resolveFuelAlert: vi.fn(), markFuelAlertFalsePositive: vi.fn() }))
const page = vi.hoisted(() => ({ assignFuelAlert: vi.fn(), contactAlertDriver: vi.fn(), getFuelAlertAssignees: vi.fn(), openFuelAlertInvestigation: vi.fn() }))
vi.mock('@/lib/api/fuel', async (orig) => ({ ...(await orig<typeof import('@/lib/api/fuel')>()), ...fuel }))
vi.mock('@/lib/api/fuelPage', async (orig) => ({ ...(await orig<typeof import('@/lib/api/fuelPage')>()), ...page }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

import { AlertActions } from '@/app/(portal)/fuel/components/shared/AlertActions'

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)
const alert = { id: 7, status: 'new', assigned_to: null, investigating: false, label: 'LAG-1' }

beforeEach(() => {
    vi.clearAllMocks()
    page.getFuelAlertAssignees.mockResolvedValue([{ id: 3, name: 'Ada Obi', email: 'a@x.io' }])
})

describe('alert actions', () => {
    it('acknowledges and tells the parent to refresh once the server confirms', async () => {
        fuel.acknowledgeFuelAlert.mockResolvedValue({ message: 'ok' })
        const onChanged = vi.fn()
        wrap(<AlertActions alert={alert} onChanged={onChanged} />)

        fireEvent.click(screen.getByText('Acknowledge'))

        await waitFor(() => expect(onChanged).toHaveBeenCalled())
        expect(fuel.acknowledgeFuelAlert).toHaveBeenCalledWith(7)
    })

    it('shows the server\'s reason when it refuses, and does not refresh', async () => {
        page.contactAlertDriver.mockRejectedValue({ response: { data: { message: 'No single driver is recorded for this vehicle at the time of the alert.' } } })
        const onChanged = vi.fn()
        wrap(<AlertActions alert={alert} onChanged={onChanged} />)

        fireEvent.click(screen.getByText('Call driver'))

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No single driver is recorded for this vehicle at the time of the alert.'))
        expect(onChanged).not.toHaveBeenCalled()
    })

    it('offers the number to dial instead of dialling for the user', async () => {
        page.contactAlertDriver.mockResolvedValue({ driver: { id: 9, name: 'Musa', phone: '+2348012345678' }, channel: 'call', sent: false })
        wrap(<AlertActions alert={alert} onChanged={vi.fn()} />)

        fireEvent.click(screen.getByText('Call driver'))

        const link = await screen.findByText('Call +2348012345678')
        expect(link.getAttribute('href')).toBe('tel:+2348012345678')
    })

    it('needs an owner before it will open an investigation, then assigns and opens', async () => {
        page.assignFuelAlert.mockResolvedValue(undefined)
        page.openFuelAlertInvestigation.mockResolvedValue(undefined)
        wrap(<AlertActions alert={alert} onChanged={vi.fn()} />)

        fireEvent.click(screen.getByText('Investigate'))
        const open = await screen.findByText('Open investigation')
        expect((open as HTMLButtonElement).disabled).toBe(true)

        await screen.findByText('Ada Obi')
        fireEvent.change(screen.getByLabelText('Owner'), { target: { value: '3' } })
        fireEvent.click(screen.getByText('Open investigation'))

        await waitFor(() => expect(page.openFuelAlertInvestigation).toHaveBeenCalledWith(7, undefined))
        expect(page.assignFuelAlert).toHaveBeenCalledWith(7, 3)
    })

    it('offers nothing on an alert that is already closed', () => {
        const { container } = wrap(<AlertActions alert={{ ...alert, status: 'resolved' }} onChanged={vi.fn()} />)
        expect(container.textContent).toBe('')
    })
})
