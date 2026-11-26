import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.setConfig({ testTimeout: 30000 })

const saveMileageConfig = vi.fn()
vi.mock('@/lib/api/odometer', () => ({ saveMileageConfig: (...a: unknown[]) => saveMileageConfig(...a) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { MileageConfigDialog, MileageStateBadge, mileageIntervalText } from '@/components/maintenance/MileageStatus'
import type { ScheduleMileage } from '@/types/odometer'

const m = (over: Partial<ScheduleMileage> = {}): ScheduleMileage => ({
    state: 'active', interval_km: 10000, interval_display: { unit: 'km', value: 10000 }, next_due_km: 94231.55, remaining_km: 10000, ...over,
})

const wrap = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

beforeEach(() => vi.clearAllMocks())

describe('mileage state on schedules', () => {
    it('labels each non-active state and shows nothing when active or for time-based schedules', () => {
        const { rerender } = render(<MileageStateBadge mileage={m({ state: 'inactive_no_baseline' })} />)
        expect(screen.getByTestId('mileage-state')).toHaveTextContent('Odometer reading required')
        rerender(<MileageStateBadge mileage={m({ state: 'target_required' })} />)
        expect(screen.getByTestId('mileage-state')).toHaveTextContent('Mileage target required')
        rerender(<MileageStateBadge mileage={m({ state: 'suspended' })} />)
        expect(screen.getByTestId('mileage-state')).toHaveTextContent(/suspended/i)
        rerender(<MileageStateBadge mileage={m({ state: 'active' })} />)
        expect(screen.queryByTestId('mileage-state')).not.toBeInTheDocument()
        rerender(<MileageStateBadge mileage={null} />)
        expect(screen.queryByTestId('mileage-state')).not.toBeInTheDocument()
    })

    it('shows the interval in its display unit and never "0" for an unset interval', () => {
        expect(mileageIntervalText(m({ interval_display: { unit: 'mi', value: 6000 } }))).toBe('6,000 mi')
        expect(mileageIntervalText(m({ interval_display: null }))).toBe('10,000 km')
        expect(mileageIntervalText(m({ interval_display: null, interval_km: null }))).toBeNull()
        expect(mileageIntervalText(null)).toBeNull()
    })
})

describe('mileage config dialog', () => {
    it('sends interval and unit, with no override and no confirmation flags by default', async () => {
        saveMileageConfig.mockResolvedValue({})
        wrap(<MileageConfigDialog scheduleId={9} mileage={m({ state: 'target_required', interval_display: null, interval_km: null, next_due_km: null })} open onOpenChange={vi.fn()} />)
        await userEvent.type(screen.getByLabelText('Service every'), '10000')
        await userEvent.click(screen.getByRole('button', { name: 'Save' }))
        await waitFor(() => expect(saveMileageConfig).toHaveBeenCalledTimes(1))
        expect(saveMileageConfig).toHaveBeenCalledWith(9, { interval: 10000, unit: 'km', first_due_km: null, confirm_overdue: false, confirm_postpone: false })
    })

    it('offers the two confirmations only with an override, and sends them only when ticked', async () => {
        saveMileageConfig.mockResolvedValue({})
        wrap(<MileageConfigDialog scheduleId={9} mileage={m()} open onOpenChange={vi.fn()} />)
        expect(screen.queryByText(/already overdue/)).not.toBeInTheDocument()
        await userEvent.type(screen.getByLabelText(/First due at/), '90000')
        await userEvent.click(screen.getByLabelText(/already overdue/))
        await userEvent.click(screen.getByRole('button', { name: 'Save' }))
        await waitFor(() => expect(saveMileageConfig).toHaveBeenCalledTimes(1))
        expect(saveMileageConfig.mock.calls[0][1]).toEqual({ interval: 10000, unit: 'km', first_due_km: 90000, confirm_overdue: true, confirm_postpone: false })
    })

    it('converts a first-due override entered in miles to kilometres', async () => {
        saveMileageConfig.mockResolvedValue({})
        wrap(<MileageConfigDialog scheduleId={9} mileage={m({ interval_display: { unit: 'mi', value: 6000 } })} open onOpenChange={vi.fn()} />)
        await userEvent.type(screen.getByLabelText(/First due at/), '1000')
        await userEvent.click(screen.getByRole('button', { name: 'Save' }))
        await waitFor(() => expect(saveMileageConfig).toHaveBeenCalledTimes(1))
        expect(saveMileageConfig.mock.calls[0][1].first_due_km).toBeCloseTo(1609.344, 3)
        expect(saveMileageConfig.mock.calls[0][1].unit).toBe('mi')
    })

    it('rejects a missing interval locally', async () => {
        wrap(<MileageConfigDialog scheduleId={9} mileage={m({ interval_display: null })} open onOpenChange={vi.fn()} />)
        await userEvent.click(screen.getByRole('button', { name: 'Save' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('interval above 0')
        expect(saveMileageConfig).not.toHaveBeenCalled()
    })

    it('cannot be saved while the vehicle has no baseline', () => {
        wrap(<MileageConfigDialog scheduleId={9} mileage={m({ state: 'inactive_no_baseline' })} open onOpenChange={vi.fn()} />)
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
        expect(screen.getByText(/no accepted odometer reading/i)).toBeInTheDocument()
    })
})
