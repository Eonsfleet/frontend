import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.setConfig({ testTimeout: 30000 })

const getOdometerSettings = vi.fn()
const updateOdometerSettings = vi.fn()
const previewOdometerImport = vi.fn()
const confirmOdometerImport = vi.fn()
vi.mock('@/lib/api/odometer', () => ({
    getOdometerSettings: (...a: unknown[]) => getOdometerSettings(...a),
    updateOdometerSettings: (...a: unknown[]) => updateOdometerSettings(...a),
    previewOdometerImport: (...a: unknown[]) => previewOdometerImport(...a),
    confirmOdometerImport: (...a: unknown[]) => confirmOdometerImport(...a),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { OdometerSettingsForm, validateSettings } from '@/components/odometer/OdometerSettingsForm'
import { ReadingImport } from '@/components/odometer/ReadingImport'

const wrap = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const SETTINGS = { distance_unit: 'km', small_fix_km: 100, tolerance_km: 25, tolerance_percent: 5, plausibility_km_per_day: 1500, review_reminder_days: 3 }

beforeEach(() => vi.clearAllMocks())

describe('odometer settings', () => {
    it('loads the values and saves a change as numbers', async () => {
        getOdometerSettings.mockResolvedValue(SETTINGS)
        updateOdometerSettings.mockResolvedValue({ ...SETTINGS, small_fix_km: 150 })
        wrap(<OdometerSettingsForm />)
        const field = await screen.findByLabelText(/Small-fix limit/)
        expect(field).toHaveValue(100)
        await userEvent.clear(field)
        await userEvent.type(field, '150')
        await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))
        await waitFor(() => expect(updateOdometerSettings).toHaveBeenCalledTimes(1))
        expect(updateOdometerSettings.mock.calls[0][0]).toEqual({ ...SETTINGS, small_fix_km: 150 })
    })

    it('refuses invalid values without calling the API', async () => {
        getOdometerSettings.mockResolvedValue(SETTINGS)
        wrap(<OdometerSettingsForm />)
        const field = await screen.findByLabelText(/Review reminder/)
        await userEvent.clear(field)
        await userEvent.type(field, '2.5')
        await userEvent.click(screen.getByRole('button', { name: 'Save settings' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('whole number')
        expect(updateOdometerSettings).not.toHaveBeenCalled()
    })

    it('explains a 403 instead of showing a form', async () => {
        getOdometerSettings.mockRejectedValue(Object.assign(new Error('x'), { isAxiosError: true, response: { status: 403 } }))
        wrap(<OdometerSettingsForm />)
        expect(await screen.findByRole('alert')).toHaveTextContent(/do not have permission/)
    })

    it('validateSettings rejects a percentage above 100', () => {
        const r = validateSettings({ distance_unit: 'km', small_fix_km: '1', tolerance_km: '1', tolerance_percent: '101', plausibility_km_per_day: '1', review_reminder_days: '1' })
        expect(r.errors.tolerance_percent).toBeDefined()
        expect(r.payload).toBeUndefined()
    })
})

describe('CSV import', () => {
    const csv = new File(['registration_number,reading\nABC-123,100'], 'r.csv', { type: 'text/csv' })

    it('previews rows with per-row validity and errors, confirms, and shows the summary', async () => {
        previewOdometerImport.mockResolvedValue({
            import_id: 'u-1',
            rows: [
                { row: 2, registration_number: 'ABC-123', vehicle_id: 7, value: 84231, unit: 'km', effective_at: '2026-11-27T08:00:00Z', status: 'valid', errors: [] },
                { row: 3, registration_number: 'ZZZ', vehicle_id: null, value: 5, unit: 'm', effective_at: null, status: 'invalid', errors: ["unknown unit 'm'"] },
            ],
            summary: { total: 2, valid: 1, invalid: 1 },
        })
        confirmOdometerImport.mockResolvedValue({
            summary: { accepted: 0, pending_sync: 1, pending_review: 0, failed: 0 }, failed_rows: [],
        })
        wrap(<ReadingImport />)
        await userEvent.upload(screen.getByLabelText('CSV file'), csv)
        await userEvent.click(screen.getByRole('button', { name: 'Preview' }))

        expect(await screen.findByTestId('preview-summary')).toHaveTextContent('1 valid')
        expect(screen.getByTestId('import-row-3')).toHaveTextContent("unknown unit 'm'")
        expect(screen.getByTestId('import-row-3')).toHaveTextContent('Invalid')
        expect(screen.getByTestId('import-row-2')).toHaveTextContent('Valid')

        await userEvent.click(screen.getByRole('button', { name: 'Import 1 valid row' }))
        expect(confirmOdometerImport).toHaveBeenCalledWith('u-1')
        const summary = await screen.findByTestId('import-summary')
        expect(summary).toHaveTextContent('Waiting to sync')
    })

    it('lists failed rows after confirmation', async () => {
        previewOdometerImport.mockResolvedValue({ import_id: 'u-2', rows: [{ row: 2, status: 'valid', errors: [] }], summary: { total: 1, valid: 1, invalid: 0 } })
        confirmOdometerImport.mockResolvedValue({ summary: { accepted: 0, pending_sync: 0, pending_review: 0, failed: 1 }, failed_rows: [{ row: 9, errors: ['vehicle not found'] }] })
        wrap(<ReadingImport />)
        await userEvent.upload(screen.getByLabelText('CSV file'), csv)
        await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
        await userEvent.click(await screen.findByRole('button', { name: /Import 1 valid row/ }))
        expect(await screen.findByText(/Row 9: vehicle not found/)).toBeInTheDocument()
    })

    it('asks for a file before previewing', async () => {
        wrap(<ReadingImport />)
        await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('Choose a CSV file')
        expect(previewOdometerImport).not.toHaveBeenCalled()
    })
})
