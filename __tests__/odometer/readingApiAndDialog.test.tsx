import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.setConfig({ testTimeout: 30000 })

const post = vi.fn()
const get = vi.fn()
vi.mock('@/lib/api/client', () => ({ default: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a), put: vi.fn(), patch: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { submitReadingWithEvidence } from '@/lib/api/odometer'
import { OdometerReadingDialog } from '@/components/odometer/OdometerReadingDialog'
import type { Vehicle } from '@/types'

beforeEach(() => {
    vi.clearAllMocks()
    get.mockRejectedValue({ response: { status: 403 } })
})

describe('submitReadingWithEvidence', () => {
    it('uploads the photo first and sends its id with the reading', async () => {
        post.mockImplementation((url: string) =>
            url.endsWith('/odometer-evidence')
                ? Promise.resolve({ data: { data: { evidence: { id: 12, kind: 'dashboard_photo', created_at: 'x' } } } })
                : Promise.resolve({ data: { data: { outcome: 'pending_sync', reading: {}, odometer: {} } } }),
        )
        const photo = new File(['x'], 'd.jpg', { type: 'image/jpeg' })
        const res = await submitReadingWithEvidence('v-1', { value: 100, unit: 'km' }, photo)
        expect(res.outcome).toBe('pending_sync')
        expect(post.mock.calls[0][0]).toBe('/vehicles/v-1/odometer-evidence')
        expect((post.mock.calls[0][1] as FormData).get('kind')).toBe('dashboard_photo')
        expect(post.mock.calls[1][0]).toBe('/vehicles/v-1/odometer-readings')
        expect(post.mock.calls[1][1]).toEqual({ value: 100, unit: 'km', evidence_ids: [12] })
    })

    it('creates no reading when the upload fails', async () => {
        post.mockRejectedValue(new Error('upload failed'))
        await expect(submitReadingWithEvidence('v-1', { value: 100 }, new File(['x'], 'd.jpg'))).rejects.toThrow('upload failed')
        expect(post).toHaveBeenCalledTimes(1)
    })

    it('sends no evidence_ids without a photo', async () => {
        post.mockResolvedValue({ data: { data: { outcome: 'accepted', reading: {}, odometer: {} } } })
        await submitReadingWithEvidence('v-1', { value: 100 })
        expect(post.mock.calls[0][1]).toEqual({ value: 100 })
    })
})

const vehicle = {
    id: '1',
    attributes: { uuid: 'v-1', registration_number: 'ABC-123', odometer: { lifetime_km: null, today_km: null, source: null, status: 'uninitialised', unit: 'mi' } },
} as unknown as Vehicle

describe('OdometerReadingDialog', () => {
    it('starts blank in the vehicle unit, submits, and shows the pending-sync outcome', async () => {
        post.mockResolvedValue({ data: { data: { outcome: 'pending_sync', reading: { id: 1 }, odometer: {} } } })
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <OdometerReadingDialog vehicle={vehicle} open onOpenChange={vi.fn()} />
            </QueryClientProvider>,
        )
        expect(screen.getByLabelText('Current dashboard reading')).toHaveValue(null)
        expect(screen.getByRole('combobox', { name: 'Unit' })).toHaveTextContent('miles')
        await userEvent.type(screen.getByLabelText('Current dashboard reading'), '52340')
        await userEvent.click(screen.getByRole('button', { name: 'Submit reading' }))
        expect(await screen.findByTestId('odometer-outcome')).toHaveTextContent('waiting to sync')
        expect(post.mock.calls[0][0]).toBe('/vehicles/v-1/odometer-readings')
        expect(post.mock.calls[0][1]).toMatchObject({ value: 52340, unit: 'mi' })
    })

    it('refuses an empty submission locally', async () => {
        render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <OdometerReadingDialog vehicle={vehicle} open onOpenChange={vi.fn()} />
            </QueryClientProvider>,
        )
        await userEvent.click(screen.getByRole('button', { name: 'Submit reading' }))
        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Enter the reading/))
        expect(post).not.toHaveBeenCalled()
    })
})
