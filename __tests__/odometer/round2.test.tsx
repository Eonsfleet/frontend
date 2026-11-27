import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.setConfig({ testTimeout: 30000 })

const post = vi.fn()
const get = vi.fn()
const patch = vi.fn()
vi.mock('@/lib/api/client', () => ({ default: { post: (...a: unknown[]) => post(...a), get: (...a: unknown[]) => get(...a), put: vi.fn(), patch: (...a: unknown[]) => patch(...a) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/useVehiclesDropdown', () => ({ useVehiclesDropdown: () => ({ data: { data: [{ id: 7, attributes: { registration_number: 'ABC-123' } }] } }) }))

import { fetchEvidenceBlob, submitReadingWithEvidence, uploadReviewEvidence } from '@/lib/api/odometer'
import { OdometerReadingDialog } from '@/components/odometer/OdometerReadingDialog'
import { OdometerCapacityDialog } from '@/components/odometer/OdometerCapacityDialog'
import { EvidenceList } from '@/components/odometer/EvidenceList'
import { ReadingHistory } from '@/components/odometer/ReadingHistory'
import { ReviewDetail } from '@/components/odometer/reviews/ReviewDetail'
import { ReviewList } from '@/components/odometer/reviews/ReviewList'
import type { Vehicle } from '@/types'

const wrap = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const err = (status: number, code: string) => Object.assign(new Error(code), { isAxiosError: true, response: { status, data: { code, message: code, status } } })
const ok = (data: unknown) => Promise.resolve({ data: { data } })

beforeAll(() => {
    // Radix Select needs these in jsdom.
    Element.prototype.hasPointerCapture ??= () => false
    Element.prototype.setPointerCapture ??= () => {}
    Element.prototype.releasePointerCapture ??= () => {}
    Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
    vi.clearAllMocks()
    get.mockRejectedValue(err(403, 'forbidden'))
})

const vehicle = (unit: 'km' | 'mi' = 'mi', lifetime: number | null = null) =>
    ({ id: '7', attributes: { uuid: 'v-1', registration_number: 'ABC-123', odometer: { lifetime_km: lifetime, today_km: null, source: null, status: lifetime ? 'verified' : 'uninitialised', unit } } }) as unknown as Vehicle

describe('idempotency and retries', () => {
    it('sends an Idempotency-Key, reuses it on a network retry, and drops it after a 422', async () => {
        const attempt: { idempotencyKey?: string; evidenceIds?: number[] } = {}
        post.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(ok({ outcome: 'accepted' }))
        await expect(submitReadingWithEvidence('v-1', { value: 1 }, null, attempt)).rejects.toThrow('network')
        const key = attempt.idempotencyKey
        expect(key).toBeTruthy()
        await submitReadingWithEvidence('v-1', { value: 1 }, null, attempt)
        expect(post.mock.calls[0][2]).toEqual({ headers: { 'Idempotency-Key': key } })
        expect(post.mock.calls[1][2]).toEqual({ headers: { 'Idempotency-Key': key } })

        post.mockRejectedValueOnce(err(422, 'confirmation_required'))
        const a2: { idempotencyKey?: string } = {}
        await expect(submitReadingWithEvidence('v-1', { value: 1 }, null, a2)).rejects.toBeTruthy()
        expect(a2.idempotencyKey).toBeUndefined()
    })

    it('uploads the photo once across attempts', async () => {
        post.mockImplementation((url: string) =>
            url.endsWith('/odometer-evidence') ? ok({ evidence: { id: 12 } }) : Promise.reject(err(422, 'confirmation_required')),
        )
        const attempt: { evidenceIds?: number[] } = {}
        const photo = new File(['x'], 'd.jpg')
        await expect(submitReadingWithEvidence('v-1', { value: 1 }, photo, attempt)).rejects.toBeTruthy()
        await expect(submitReadingWithEvidence('v-1', { value: 1, confirm_large_jump: true }, photo, attempt)).rejects.toBeTruthy()
        expect(post.mock.calls.filter(c => String(c[0]).endsWith('/odometer-evidence'))).toHaveLength(1)
        expect(post.mock.calls[2][1]).toMatchObject({ evidence_ids: [12], confirm_large_jump: true })
    })

    it('fetches evidence as a blob through the authenticated client', async () => {
        get.mockResolvedValue({ data: new Blob(['x']) })
        await fetchEvidenceBlob(12)
        expect(get).toHaveBeenCalledWith('/odometer-evidence/12/download', { responseType: 'blob' })
    })

    it('attaches a photo to a review', async () => {
        post.mockResolvedValue(ok({}))
        await uploadReviewEvidence(5, new File(['x'], 'd.jpg'))
        expect(post.mock.calls[0][0]).toBe('/odometer-reviews/5/evidence')
    })
})

describe('reading dialog confirmations and unit default', () => {
    it('uses the vehicle unit and never asks the settings endpoint', async () => {
        wrap(<OdometerReadingDialog vehicle={vehicle('mi')} open onOpenChange={vi.fn()} />)
        expect(screen.getByRole('combobox', { name: 'Unit' })).toHaveTextContent('miles')
        expect(get).not.toHaveBeenCalled()
    })

    it('prompts on confirmation_required and resends with confirm_large_jump', async () => {
        post.mockRejectedValueOnce(err(422, 'confirmation_required')).mockResolvedValueOnce(ok({ outcome: 'pending_sync', reading: {}, odometer: {} }))
        wrap(<OdometerReadingDialog vehicle={vehicle('km', 1000)} open onOpenChange={vi.fn()} />)
        await userEvent.type(screen.getByLabelText('Current dashboard reading'), '90000')
        await userEvent.click(screen.getByRole('button', { name: 'Submit reading' }))
        const prompt = await screen.findByTestId('reading-confirm')
        expect(prompt).toHaveTextContent(/far above/)
        expect(post).toHaveBeenCalledTimes(1)
        expect(post.mock.calls[0][1]).not.toHaveProperty('confirm_large_jump')

        await userEvent.click(within(prompt).getByRole('button', { name: /reading is correct/ }))
        expect(await screen.findByTestId('odometer-outcome')).toBeInTheDocument()
        expect(post.mock.calls[1][1]).toMatchObject({ value: 90000, confirm_large_jump: true })
    })

    it('prompts on zero_requires_confirmation and resends with confirm_zero', async () => {
        post.mockRejectedValueOnce(err(422, 'zero_requires_confirmation')).mockResolvedValueOnce(ok({ outcome: 'accepted', reading: {}, odometer: {} }))
        wrap(<OdometerReadingDialog vehicle={vehicle('km')} open onOpenChange={vi.fn()} />)
        // the in-form checkbox is the first line of defence; a server answer still gets a prompt
        await userEvent.type(screen.getByLabelText('Current dashboard reading'), '0')
        await userEvent.click(screen.getByLabelText('The dashboard really shows 0'))
        await userEvent.click(screen.getByRole('button', { name: 'Submit reading' }))
        expect(post.mock.calls[0][1]).toMatchObject({ value: 0, confirm_zero: true })
        const prompt = await screen.findByTestId('reading-confirm')
        expect(prompt).toHaveTextContent(/reading is 0/)
        await userEvent.click(within(prompt).getByRole('button', { name: /shows 0/ }))
        await waitFor(() => expect(post).toHaveBeenCalledTimes(2))
        expect(post.mock.calls[1][1]).toMatchObject({ confirm_zero: true })
    })

    it('shows other server errors with their code', async () => {
        post.mockRejectedValueOnce(err(422, 'invalid_evidence'))
        wrap(<OdometerReadingDialog vehicle={vehicle('km')} open onOpenChange={vi.fn()} />)
        await userEvent.type(screen.getByLabelText('Current dashboard reading'), '5')
        await userEvent.click(screen.getByRole('button', { name: 'Submit reading' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('(invalid_evidence)')
    })
})

describe('capacity dialog', () => {
    const open = (state: 'assumed_default' | 'set' | 'none', km: number | null = 999999) =>
        wrap(<OdometerCapacityDialog vehicle={{ id: '1', attributes: { uuid: 'v-1', registration_number: 'ABC-123', odometer: { lifetime_km: 1, today_km: null, source: null, capacity: { km, state } } } } as unknown as Vehicle} open onOpenChange={vi.fn()} />)

    it('can return a vehicle to the assumed default, sending only the state', async () => {
        patch.mockResolvedValue(ok({}))
        open('none', null)
        await userEvent.click(screen.getByRole('combobox', { name: 'Capacity' }))
        await userEvent.click(await screen.findByRole('option', { name: /Assumed default/ }))
        await userEvent.click(screen.getByRole('button', { name: 'Save' }))
        await waitFor(() => expect(patch).toHaveBeenCalledTimes(1))
        expect(patch).toHaveBeenCalledWith('/vehicles/v-1/odometer-capacity', { state: 'assumed_default' })
    })

    it('refuses a set capacity outside the contract range', async () => {
        open('assumed_default')
        await userEvent.click(screen.getByRole('combobox', { name: 'Capacity' }))
        await userEvent.click(await screen.findByRole('option', { name: /Set a value/ }))
        await userEvent.type(screen.getByLabelText('Capacity (km)'), '500')
        await userEvent.click(screen.getByRole('button', { name: 'Save' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('1,000')
        expect(patch).not.toHaveBeenCalled()
    })
})

describe('evidence list', () => {
    it('opens an attachment from an authenticated blob, never a public URL', async () => {
        const blob = new Blob(['x'], { type: 'image/jpeg' })
        get.mockResolvedValue({ data: blob })
        const create = vi.fn(() => 'blob:abc')
        vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }))
        const openWin = vi.spyOn(window, 'open').mockReturnValue(null)
        render(<EvidenceList evidence={[{ id: 12, kind: 'dashboard_photo', mime: 'image/jpeg', created_at: '2026-11-27T09:00:00Z' }]} />)
        await userEvent.click(screen.getByRole('button', { name: 'Open' }))
        await waitFor(() => expect(openWin).toHaveBeenCalledWith('blob:abc', '_blank', 'noopener'))
        expect(get).toHaveBeenCalledWith('/odometer-evidence/12/download', { responseType: 'blob' })
    })

    it('says None when there is nothing', () => {
        render(<EvidenceList evidence={null} />)
        expect(screen.getByText('None')).toBeInTheDocument()
    })
})

describe('reading history', () => {
    const reading = (over: Record<string, unknown> = {}) => ({
        id: 41, vehicle_id: 7, value_km: 84231.55, original_value: 52340, original_unit: 'mi', effective_at: '2026-11-27T08:50:00Z', recorded_at: '2026-11-27T09:01:12Z',
        kind: 'reading', source: 'customer_supplied', physically_inspected: false, status: 'pending_review', previous_accepted_km: null,
        validation: { checks: [{ name: 'basic', result: 'pass' }, { name: 'discrepancy', result: 'flagged' }, { name: 'rollover', result: 'not_applicable' }], reason: 'discrepancy' },
        evidence: [{ id: 12, kind: 'dashboard_photo', created_at: '2026-11-27T09:00:00Z' }], created_at: 'x', ...over,
    })

    it('shows the accepted odometer, segments and readings in the entered unit and km, null-safe', async () => {
        get.mockImplementation((url: string) =>
            url.endsWith('/odometer')
                ? ok({ odometer: { lifetime_km: null, today_km: null, source: null, status: 'uninitialised', unit: 'mi', baseline: null, last_tracker_reading: null }, segments: [{ id: 1, kind: 'tracker', tracker_device_id: 3, opened_at: '2026-11-20T08:00:00Z', closed_at: null, offset_km: 119.1 }] })
                : ok({ readings: [reading(), reading({ id: 42, kind: 'correction', status: 'accepted', source: 'import', validation: undefined, evidence: undefined, review_id: null })], pagination: { current: 1, lastPage: 2, total: 12, perPage: 10 } }),
        )
        wrap(<ReadingHistory vehicleId="v-1" />)
        const acc = await screen.findByTestId('accepted-odometer')
        expect(acc).toHaveTextContent('Odometer reading required')
        expect(acc).not.toHaveTextContent(/\b0 (km|mi)/)
        expect(await screen.findByTestId('segments')).toHaveTextContent('tracker offset 119.1 km')

        const row = await screen.findByTestId('reading-41')
        expect(row).toHaveTextContent('52,340 mi')
        expect(row).toHaveTextContent('84,231.6 km')
        expect(row).toHaveTextContent('Customer')
        expect(row).toHaveTextContent('Pending review')
        expect(row).toHaveTextContent('discrepancy: flagged')
        expect(row).not.toHaveTextContent('basic')
        expect(within(row).getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/odometer/reviews')
        const second = screen.getByTestId('reading-42')
        expect(second).toHaveTextContent('Correction')
        expect(second).toHaveTextContent('CSV import')
        expect(second).toHaveTextContent('All passed')

        await userEvent.click(screen.getByRole('button', { name: 'Next' }))
        await waitFor(() => expect(get.mock.calls.some(c => c[1]?.params?.page === 2)).toBe(true))
    })

    it('links to the review when the server names it', async () => {
        get.mockImplementation((url: string) =>
            url.endsWith('/odometer') ? ok({ odometer: { lifetime_km: 5, today_km: null, source: null, status: 'verified', unit: 'km' }, segments: [] }) : ok({ readings: [reading({ review_id: 5 })], pagination: { current: 1, lastPage: 1, total: 1, perPage: 10 } }),
        )
        wrap(<ReadingHistory vehicleId="v-1" />)
        expect(await screen.findByRole('link', { name: 'Review' })).toHaveAttribute('href', '/odometer/reviews/5')
    })
})

const review = (over: Record<string, unknown> = {}) => ({
    id: 5, vehicle: { id: 7, registration_number: 'ABC-123' },
    reading: { id: 41, value_km: 83900, original_value: 83900, original_unit: 'km', effective_at: '2026-11-27T08:50:00Z' },
    level: 'organisation', reason: 'decrease_above_threshold', status: 'pending', overdue: false, previous_accepted_km: 84000, proposed_km: 83900,
    responsible: { type: 'organisation_admins', id: null, name: 'Organisation admins' },
    requires_photo: true, has_photo: false, evidence: [], approvals_required: 1, approvals: [], created_at: '2026-11-27T09:00:00Z', resolved_at: null, history: [], ...over,
})

describe('review: photo, approval block and engine reviews', () => {
    it('disables approve until a photo exists, attaches one, then enables it', async () => {
        let current = review()
        get.mockImplementation(() => ok({ review: current }))
        post.mockImplementation(() => { current = review({ has_photo: true, evidence: [{ id: 12, kind: 'dashboard_photo', mime: 'image/jpeg', created_at: '2026-11-27T10:00:00Z' }] }); return ok({}) })
        wrap(<ReviewDetail id="5" />)
        const approve = await screen.findByRole('button', { name: 'Approve' })
        expect(approve).toBeDisabled()
        expect(screen.getByText(/blocked until a dashboard photo/)).toBeInTheDocument()

        await userEvent.upload(screen.getByLabelText('Attach a dashboard photo'), new File(['x'], 'd.jpg', { type: 'image/jpeg' }))
        await userEvent.click(screen.getByRole('button', { name: 'Upload' }))
        await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled())
        expect(post.mock.calls[0][0]).toBe('/odometer-reviews/5/evidence')
        expect(await screen.findByTestId('evidence-list')).toBeInTheDocument()
    })

    it('shows the server code when approval is still refused', async () => {
        get.mockImplementation(() => ok({ review: review({ requires_photo: false }) }))
        post.mockRejectedValue(err(422, 'photo_required'))
        wrap(<ReviewDetail id="5" />)
        await userEvent.type(await screen.findByLabelText(/Reason/), 'ok')
        await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
        expect(await screen.findByTestId('server-code')).toHaveTextContent('photo_required')
    })

    it('renders an engine-raised review that has no reading, with its detail', async () => {
        get.mockImplementation(() => ok({ review: review({ reading: null, source: 'engine', detail: { kind: 'decrease', drop_km: 12 }, requires_photo: false }) }))
        wrap(<ReviewDetail id="5" />)
        expect(await screen.findByText(/telemetry platform/)).toBeInTheDocument()
        expect(screen.getByTestId('engine-detail')).toHaveTextContent('drop_km')
        expect(screen.queryByLabelText('Attach a dashboard photo')).not.toBeInTheDocument()
    })
})

describe('review list filters', () => {
    it('passes level and vehicle_id to the API', async () => {
        get.mockImplementation(() => ok({ reviews: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 20 } }))
        wrap(<ReviewList />)
        await screen.findByText('No pending reviews.')
        await userEvent.click(screen.getByRole('combobox', { name: 'Level' }))
        await userEvent.click(await screen.findByRole('option', { name: 'Support' }))
        await userEvent.click(screen.getByRole('combobox', { name: 'Vehicle' }))
        await userEvent.click(await screen.findByRole('option', { name: 'ABC-123' }))
        await waitFor(() => expect(get.mock.calls.at(-1)).toEqual(['/odometer-reviews', { params: { status: 'pending', page: 1, level: 'support', vehicle_id: '7' } }]))
    })
})
