import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VehicleTable } from '@/components/vehicles/VehicleTable'
import { TripVehicleInfo } from '@/components/trips/TripVehicleInfo'
import { PlaybackAssetCard } from '@/app/(portal)/tracking/playback/components/PlaybackAssetCard'
import { buildVehicleSnapshot } from '@/lib/resolveVehicleTelemetry'
import { DetailsTab } from '@/app/(portal)/tracking/components/tabs/DetailsTab'
import type { Vehicle } from '@/types'

const NULL_ODO = { at_join_km: null, lifetime_km: null, today_km: null, source: null, status: 'uninitialised', unit: 'km', display: { lifetime: null, today: null } }

const vehicle = (odometer: unknown): Vehicle =>
    ({
        id: '1',
        attributes: {
            uuid: 'v-1', registration_number: 'LAG-123-XY', make: 'Toyota', model: 'Hilux', year: 2019, status: 'active',
            body_type: 'Pickup', color: 'White', fuel_type: 'Diesel', odometer,
        },
        relationships: {},
    }) as unknown as Vehicle

const renderTable = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

describe('VehicleTable odometer column with null values', () => {
    it('does not crash and shows "Odometer reading required" with an action', async () => {
        const onEnter = vi.fn()
        renderTable(<VehicleTable data={[vehicle(NULL_ODO)]} onEnterOdometer={onEnter} />)
        expect(screen.getByText('Odometer reading required')).toBeInTheDocument()
        expect(screen.queryByText(/^0 km/)).not.toBeInTheDocument()
        await userEvent.click(screen.getByRole('button', { name: 'Enter reading' }))
        expect(onEnter).toHaveBeenCalledTimes(1)
    })

    it('shows a null today_km as nothing, an estimate as labelled, and uses the display unit', () => {
        renderTable(
            <VehicleTable
                data={[
                    vehicle({ lifetime_km: 1000, today_km: null, source: 'gps_derived', status: 'gps_derived', unit: 'mi', display: { lifetime: 621.4, today: null } }),
                ]}
            />,
        )
        expect(screen.getByText('621.4 mi')).toBeInTheDocument()
        expect(screen.getByText('Estimate')).toBeInTheDocument()
        expect(screen.queryByText(/today/)).not.toBeInTheDocument()
    })

    it('tolerates a null odometer block', () => {
        renderTable(<VehicleTable data={[vehicle(null)]} />)
        expect(screen.getByText('LAG-123-XY')).toBeInTheDocument()
    })
})

describe('TripVehicleInfo with a null odometer', () => {
    it('shows reading required, not N/A or 0, and hides the lifetime card', () => {
        render(<TripVehicleInfo vehicle={vehicle(NULL_ODO) as never} />)
        expect(screen.getByText('Odometer reading required')).toBeInTheDocument()
        expect(screen.queryByText('Lifetime Odometer')).not.toBeInTheDocument()
    })
})

describe('PlaybackAssetCard with a null odometer', () => {
    it('does not show a number', () => {
        render(<PlaybackAssetCard vehicle={vehicle(NULL_ODO)} fallbackLabel="x" rangeLabel="today" />)
        expect(screen.getByText('Reading required')).toBeInTheDocument()
    })
})

describe('live odometer no longer falls back to the accepted total', () => {
    it('stays undefined when the tracker sends no odometer, even though lifetime_km exists', () => {
        const snap = buildVehicleSnapshot({ attributes: { odometer: { lifetime_km: 84231, today_km: 3 } } }, {})
        expect(snap?.odometer).toBeUndefined()
    })

    it('still shows the live reading when there is one', () => {
        const snap = buildVehicleSnapshot({ attributes: { odometer: { lifetime_km: 84231 } } }, { mileage_km: 90000 })
        expect(snap?.odometer).toBe(90000)
    })
})

describe('DetailsTab today distance', () => {
    it('shows pre-formatted text with its unit', () => {
        render(<DetailsTab resolved={{ odometer: null, health: {} } as never} todayText="12.5 mi" />)
        expect(screen.getByText('12.5 mi')).toBeInTheDocument()
    })
})
