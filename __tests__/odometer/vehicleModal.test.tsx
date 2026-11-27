import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Vehicle } from '@/types'

vi.setConfig({ testTimeout: 30000 })

const updateVehicle = vi.fn()
const createVehicle = vi.fn()
const submitReadingWithEvidence = vi.fn()

vi.mock('@/lib/api/vehicles', () => ({ updateVehicle: (...a: unknown[]) => updateVehicle(...a), createVehicle: (...a: unknown[]) => createVehicle(...a) }))
vi.mock('@/lib/api/odometer', async importOriginal => ({
    ...(await importOriginal<typeof import('@/lib/api/odometer')>()),
    submitReadingWithEvidence: (...a: unknown[]) => submitReadingWithEvidence(...a),
    getOdometerSettings: vi.fn().mockRejectedValue({ response: { status: 403 } }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { VehicleModal } from '@/components/vehicles/VehicleModal'

beforeAll(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
beforeEach(() => vi.clearAllMocks())

const vehicle = {
    id: '1',
    attributes: {
        uuid: 'v-1', registration_number: 'LAG-123-XY', make: 'Toyota', model: 'Hilux', year: 2019, body_type: 'Pickup', color: 'White', fuel_type: 'Diesel',
        type: 'truck', status: 'active', device_id: null, fuel_capacity: 80, fuel_capacity_unit: 'L',
        odometer: { lifetime_km: null, today_km: null, source: null, status: 'uninitialised' },
    },
} as unknown as Vehicle

const renderModal = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <VehicleModal isOpen onClose={vi.fn()} initialData={vehicle} />
        </QueryClientProvider>,
    )

describe('VehicleModal and odometer readings', () => {
    it('on an ordinary edit updates the vehicle and posts no reading and no odometer_when_join', async () => {
        updateVehicle.mockResolvedValue({ data: vehicle })
        const user = userEvent.setup()
        renderModal()
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))
        await waitFor(() => expect(updateVehicle).toHaveBeenCalledTimes(1))
        expect(submitReadingWithEvidence).not.toHaveBeenCalled()
        const body = updateVehicle.mock.calls[0][1]
        expect(body).not.toHaveProperty('odometer_when_join')
        expect(body).not.toHaveProperty('odometer_reading')
    })

    it('posts the entered reading after saving and shows the review outcome with its reason', async () => {
        updateVehicle.mockResolvedValue({ data: vehicle })
        submitReadingWithEvidence.mockResolvedValue({
            outcome: 'pending_review',
            reading: { id: 1, validation: { reason: 'decrease' } },
            review: { id: 5, reason: 'decrease' },
            odometer: {},
        })
        const user = userEvent.setup()
        renderModal()
        await user.click(screen.getByRole('tab', { name: 'Technical Specs' }))
        await user.type(screen.getByLabelText('Current dashboard reading'), '83900')
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))

        await waitFor(() => expect(submitReadingWithEvidence).toHaveBeenCalledTimes(1))
        expect(submitReadingWithEvidence.mock.calls[0][0]).toBe('v-1')
        expect(submitReadingWithEvidence.mock.calls[0][1]).toMatchObject({ value: 83900, unit: 'km' })
        const outcome = await screen.findByTestId('odometer-outcome')
        expect(outcome).toHaveTextContent('Reading needs review')
        expect(outcome).toHaveTextContent(/lower than the accepted total/)
    })

    it('says so when the vehicle saved but the reading failed', async () => {
        updateVehicle.mockResolvedValue({ data: vehicle })
        submitReadingWithEvidence.mockRejectedValue({ isAxiosError: true, response: { data: { message: 'conflict' } } })
        const user = userEvent.setup()
        renderModal()
        await user.click(screen.getByRole('tab', { name: 'Technical Specs' }))
        await user.type(screen.getByLabelText('Current dashboard reading'), '90000')
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))
        expect(await screen.findByText(/dashboard reading was not recorded/i)).toBeInTheDocument()
    })
})
