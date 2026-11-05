import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const replace = vi.fn()
let query = ''
vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace, push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(query),
}))
const ui = vi.hoisted(() => ({ decision: { ready: true, ui: 'v2' as 'v2' | 'legacy' } }))
vi.mock('@/hooks/analytics/useAnalyticsUi', () => ({ useAnalyticsUi: () => ui.decision }))
vi.mock('@/components/analytics/legacy/LegacyGps', () => ({ default: () => <p>old GPS page</p> }))

import GpsAnalyticsPage from '@/app/(portal)/analytics/gps/page'

beforeEach(() => {
    replace.mockReset()
    query = ''
    ui.decision = { ready: true, ui: 'v2' }
})

describe('GPS & Routes page after the merge into Fleet', () => {
    it('sends the rebuilt Analytics to Fleet, keeping the filters', () => {
        query = 'filter=7d&vehicle_ids=4'
        render(<GpsAnalyticsPage />)
        expect(replace).toHaveBeenCalledWith('/analytics/fleet?filter=7d&vehicle_ids=4')
        expect(screen.queryByText('old GPS page')).not.toBeInTheDocument()
    })

    it('goes to plain Fleet when there are no filters', () => {
        render(<GpsAnalyticsPage />)
        expect(replace).toHaveBeenCalledWith('/analytics/fleet')
    })

    it('still shows the original page, with no redirect, in the previous version', () => {
        ui.decision = { ready: true, ui: 'legacy' }
        render(<GpsAnalyticsPage />)
        expect(screen.getByText('old GPS page')).toBeInTheDocument()
        expect(replace).not.toHaveBeenCalled()
    })

    it('waits for the choice before doing either', () => {
        ui.decision = { ready: false, ui: 'legacy' }
        render(<GpsAnalyticsPage />)
        expect(screen.queryByText('old GPS page')).not.toBeInTheDocument()
        expect(replace).not.toHaveBeenCalled()
    })
})
