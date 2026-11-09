import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import type { Vehicle } from '@/types'

// jsdom has no ResizeObserver, which Radix's Switch measures with.
beforeAll(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

/** The attributes the form reads; the rest of a Vehicle is not needed to edit one. */
const vehicle = (fuelEstimation?: unknown): Vehicle => ({
    id: '1',
    attributes: {
        uuid: 'v-1', registration_number: 'LAG-123-XY', make: 'Toyota', model: 'Hilux', year: 2019, body_type: 'Pickup', color: 'White', fuel_type: 'Diesel',
        type: 'truck', status: 'active', device_id: null, fuel_capacity: 80, fuel_capacity_unit: 'L', fuel_estimation: fuelEstimation,
    },
} as unknown as Vehicle)

async function openFuelFields(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('tab', { name: 'Technical Specs' }))
}

describe('the vehicle form’s fuel estimation fields', () => {
    it('shows the vehicle’s own rates and sends them as numbers', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(<VehicleForm initialData={vehicle({ enabled: true, liters_per_100km: 12.5, idle_liters_per_hour: 1.3 })} onSubmit={onSubmit} />)
        await openFuelFields(user)

        expect(screen.getByLabelText('Consumption (L/100 km)')).toHaveValue(12.5)
        expect(screen.getByLabelText('Idle burn (L/hour)')).toHaveValue(1.3)
        expect(screen.getByRole('switch', { name: 'Estimate fuel use' })).toBeChecked()

        await user.clear(screen.getByLabelText('Consumption (L/100 km)'))
        await user.type(screen.getByLabelText('Consumption (L/100 km)'), '14.2')
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
        expect(onSubmit.mock.calls[0][0]).toMatchObject({ fuel_estimation_enabled: true, estimated_liters_per_100km: 14.2, estimated_idle_liters_per_hour: 1.3 })
    })

    it('sends null for a rate left blank, so a rate that was set can be cleared', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(<VehicleForm initialData={vehicle({ enabled: true, liters_per_100km: 12.5, idle_liters_per_hour: 1.3 })} onSubmit={onSubmit} />)
        await openFuelFields(user)

        await user.clear(screen.getByLabelText('Consumption (L/100 km)'))
        await user.clear(screen.getByLabelText('Idle burn (L/hour)'))
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
        expect(onSubmit.mock.calls[0][0]).toMatchObject({ estimated_liters_per_100km: null, estimated_idle_liters_per_hour: null, fuel_estimation_enabled: true })
    })

    it('refuses a rate the API would refuse, and sends nothing', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(<VehicleForm initialData={vehicle()} onSubmit={onSubmit} />)
        await openFuelFields(user)

        await user.type(screen.getByLabelText('Consumption (L/100 km)'), '501')
        await user.type(screen.getByLabelText('Idle burn (L/hour)'), '0')
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))

        expect(await screen.findByText('Consumption must be 500 or less.')).toBeInTheDocument()
        expect(screen.getByText('Idle burn must be a number above 0.')).toBeInTheDocument()
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('starts with estimation on and no rates for a vehicle the API says nothing about', async () => {
        const user = userEvent.setup()
        render(<VehicleForm initialData={vehicle()} onSubmit={vi.fn()} />)
        await openFuelFields(user)

        expect(screen.getByRole('switch', { name: 'Estimate fuel use' })).toBeChecked()
        expect(screen.getByLabelText('Consumption (L/100 km)')).toHaveValue(null)
    })

    it('turning estimation off disables the rate fields and is sent as off', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(<VehicleForm initialData={vehicle({ enabled: true, liters_per_100km: 9, idle_liters_per_hour: null })} onSubmit={onSubmit} />)
        await openFuelFields(user)

        await user.click(screen.getByRole('switch', { name: 'Estimate fuel use' }))
        expect(screen.getByLabelText('Consumption (L/100 km)')).toBeDisabled()
        expect(screen.getByLabelText('Idle burn (L/hour)')).toBeDisabled()
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
        expect(onSubmit.mock.calls[0][0]).toMatchObject({ fuel_estimation_enabled: false, estimated_liters_per_100km: 9 })
    })
})
