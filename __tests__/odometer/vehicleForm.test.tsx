import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import type { Vehicle } from '@/types'

vi.setConfig({ testTimeout: 30000 })

beforeAll(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})

const vehicle = (odometer: unknown = null): Vehicle =>
    ({
        id: '1',
        attributes: {
            uuid: 'v-1', registration_number: 'LAG-123-XY', make: 'Toyota', model: 'Hilux', year: 2019, body_type: 'Pickup', color: 'White', fuel_type: 'Diesel',
            type: 'truck', status: 'active', device_id: null, fuel_capacity: 80, fuel_capacity_unit: 'L', odometer,
        },
    }) as unknown as Vehicle

const openTechnical = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('tab', { name: 'Technical Specs' }))

describe('vehicle form odometer field', () => {
    it('is "Current dashboard reading" with a unit selector and an effective time, and the old label is gone', async () => {
        const user = userEvent.setup()
        render(<VehicleForm initialData={vehicle()} onSubmit={vi.fn()} defaultDistanceUnit="mi" />)
        await openTechnical(user)
        expect(screen.getByLabelText('Current dashboard reading')).toHaveValue(null)
        expect(screen.getByRole('combobox', { name: 'Unit' })).toHaveTextContent('miles')
        expect(screen.getByLabelText('Read on')).toBeInTheDocument()
        expect(screen.queryByText(/Odometer When Joined/i)).not.toBeInTheDocument()
    })

    it('does not prefill from the legacy figure and submits no reading on an ordinary edit', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(<VehicleForm initialData={vehicle({ at_join_km: 777, lifetime_km: 84000, today_km: 0, source: 'tracker_aligned', status: 'verified' })} onSubmit={onSubmit} />)
        await openTechnical(user)
        expect(screen.getByLabelText('Current dashboard reading')).toHaveValue(null)

        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
        const sent = onSubmit.mock.calls[0][0]
        expect(sent.odometer_reading).toBeNull()
        expect(sent).not.toHaveProperty('odometer_when_join')
    })

    it('hands on a reading only when the user typed one', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(<VehicleForm initialData={vehicle()} onSubmit={onSubmit} defaultDistanceUnit="mi" />)
        await openTechnical(user)
        await user.type(screen.getByLabelText('Current dashboard reading'), '52340')
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
        const sent = onSubmit.mock.calls[0][0]
        expect(sent.odometer_reading.payload).toMatchObject({ value: 52340, unit: 'mi', kind: 'reading' })
        expect(sent).not.toHaveProperty('odometer_when_join')
    })

    it('blocks a lower reading without a reason', async () => {
        const user = userEvent.setup()
        const onSubmit = vi.fn()
        render(<VehicleForm initialData={vehicle({ lifetime_km: 84000, today_km: null, source: 'installer_supplied', status: 'verified' })} onSubmit={onSubmit} />)
        await openTechnical(user)
        await user.type(screen.getByLabelText('Current dashboard reading'), '80000')
        await user.click(screen.getByRole('button', { name: 'Update Vehicle' }))
        expect(await screen.findByRole('alert')).toHaveTextContent(/lower than the current odometer/i)
        expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows "Odometer reading required" for an uninitialised vehicle', async () => {
        const user = userEvent.setup()
        render(<VehicleForm initialData={vehicle({ lifetime_km: null, today_km: null, source: null, status: 'uninitialised' })} onSubmit={vi.fn()} />)
        await openTechnical(user)
        expect(screen.getByText('Odometer reading required')).toBeInTheDocument()
    })
})
