import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.setConfig({ testTimeout: 30000 })

const listOdometerReviews = vi.fn()
const getOdometerReview = vi.fn()
const decideOdometerReview = vi.fn()
vi.mock('@/lib/api/odometer', () => ({
    listOdometerReviews: (...a: unknown[]) => listOdometerReviews(...a),
    getOdometerReview: (...a: unknown[]) => getOdometerReview(...a),
    decideOdometerReview: (...a: unknown[]) => decideOdometerReview(...a),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ReviewList } from '@/components/odometer/reviews/ReviewList'
import { ReviewDetail } from '@/components/odometer/reviews/ReviewDetail'

const review = (over: Record<string, unknown> = {}) => ({
    id: 5,
    vehicle: { id: 7, registration_number: 'ABC-123' },
    reading: { id: 41, value_km: 83900, original_value: 52135, original_unit: 'mi', effective_at: '2026-11-27T08:50:00Z' },
    level: 'organisation', reason: 'decrease', status: 'pending', overdue: false,
    previous_accepted_km: 84000, proposed_km: 83900,
    responsible: { type: 'organisation_admins', id: null, name: 'Organisation admins' },
    requires_photo: false, has_photo: false, approvals_required: 1, approvals: [],
    created_at: '2026-11-27T09:00:00Z', resolved_at: null,
    history: [{ at: '2026-11-27T09:00:00Z', event: 'created', by: null, detail: null }],
    ...over,
})

const wrap = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

beforeEach(() => vi.clearAllMocks())

describe('review list', () => {
    it('shows vehicle, reason, submitted reading in the submitter’s unit, status and responsible party', async () => {
        listOdometerReviews.mockResolvedValue({ reviews: [review(), review({ id: 6, overdue: true, level: 'support', responsible: { type: 'support_queue', id: null, name: 'Support' } })], pagination: { current: 1, lastPage: 1, total: 2, perPage: 20 } })
        wrap(<ReviewList />)
        expect((await screen.findAllByText('ABC-123')).length).toBe(2)
        expect(screen.getAllByText('52,135 mi').length).toBe(2)
        // the tab and the row's badge
        expect(screen.getAllByText('Overdue')).toHaveLength(2)
        expect(screen.getByText('EonsFleet support')).toBeInTheDocument()
        expect(screen.getByText('Organisation admins')).toBeInTheDocument()
        expect(listOdometerReviews).toHaveBeenCalledWith({ status: 'pending', page: 1 })
    })

    it('switches status tabs and asks the API for that status', async () => {
        listOdometerReviews.mockResolvedValue({ reviews: [], pagination: { current: 1, lastPage: 1, total: 0, perPage: 20 } })
        wrap(<ReviewList />)
        await userEvent.click(await screen.findByRole('tab', { name: 'Approved' }))
        await waitFor(() => expect(listOdometerReviews).toHaveBeenLastCalledWith({ status: 'approved', page: 1 }))
        expect(await screen.findByText('No approved reviews.')).toBeInTheDocument()
    })
})

describe('review detail', () => {
    it('requires a reason before approving or rejecting', async () => {
        getOdometerReview.mockResolvedValue(review())
        wrap(<ReviewDetail id="5" />)
        await userEvent.click(await screen.findByRole('button', { name: 'Approve' }))
        expect(await screen.findByRole('alert')).toHaveTextContent('A reason is required.')
        expect(decideOdometerReview).not.toHaveBeenCalled()
    })

    it('sends the approval with the reason', async () => {
        getOdometerReview.mockResolvedValue(review())
        decideOdometerReview.mockResolvedValue(review({ status: 'approved' }))
        wrap(<ReviewDetail id="5" />)
        await userEvent.type(await screen.findByLabelText(/Reason/), 'Checked the dashboard photo')
        await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
        await waitFor(() => expect(decideOdometerReview).toHaveBeenCalledWith('5', 'approve', 'Checked the dashboard photo'))
    })

    it('offers no decision on a support-level review', async () => {
        getOdometerReview.mockResolvedValue(review({ level: 'support' }))
        wrap(<ReviewDetail id="5" />)
        expect(await screen.findByTestId('decision-blocked')).toHaveTextContent(/EonsFleet support/)
        expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    })

    it('shows a decided review as read-only, and the approval progress for a two-approver review', async () => {
        getOdometerReview.mockResolvedValue(review({
            reason: 'suspected_tampering', level: 'support', approvals_required: 2,
            approvals: [{ by: { type: 'admin', id: 3, name: 'S. Reviewer' }, decision: 'approved', reason: 'ok', at: '2026-11-27T10:00:00Z' }],
        }))
        wrap(<ReviewDetail id="5" />)
        expect(await screen.findByText('1 of 2')).toBeInTheDocument()
        expect(screen.getByText(/S\. Reviewer/)).toBeInTheDocument()
    })

    it('after a 403 on a decision, stops offering the buttons', async () => {
        getOdometerReview.mockResolvedValue(review())
        decideOdometerReview.mockRejectedValue(Object.assign(new Error('forbidden'), { isAxiosError: true, response: { status: 403, data: {} } }))
        wrap(<ReviewDetail id="5" />)
        await userEvent.type(await screen.findByLabelText(/Reason/), 'fine')
        await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
        expect(await screen.findByTestId('decision-blocked')).toHaveTextContent(/not allowed/)
    })

    it('flags a missing required photo and lists the history', async () => {
        getOdometerReview.mockResolvedValue(review({ requires_photo: true, has_photo: false }))
        wrap(<ReviewDetail id="5" />)
        expect(await screen.findByText('Required, none attached')).toBeInTheDocument()
        expect(screen.getByText('created')).toBeInTheDocument()
    })
})
