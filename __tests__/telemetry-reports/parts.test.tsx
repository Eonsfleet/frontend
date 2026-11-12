import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/analytics/gps/trips',
    useSearchParams: () => new URLSearchParams(),
}))

import { Litres, PartialNotice } from '@/components/analytics/telemetry/ReportParts'
import type { ReportMeta } from '@/lib/api/telemetryReports'

const meta = (partial: boolean): ReportMeta => ({
    from: '2026-09-01T00:00:00+01:00', to: '2026-10-29T12:00:00+01:00', timezone: 'Africa/Lagos',
    partial, available_from: partial ? '2026-09-01T00:00:00+01:00' : null, page: 1, per_page: 50, total: 0, last_page: 1,
})

describe('telemetry report parts', () => {
    it('labels litres with their source and shows a dash, not 0, when there are none', () => {
        const { rerender } = render(<Litres litres={1.9} source="GPS estimate" />)
        expect(screen.getByText('1.9 L')).toBeInTheDocument()
        expect(screen.getByText('GPS estimate')).toBeInTheDocument()

        rerender(<Litres litres={null} source={null} />)
        expect(screen.getByText('—')).toBeInTheDocument()
        expect(screen.queryByText('0 L')).not.toBeInTheDocument()
    })

    it('says when a range reached past the 60-day window, and nothing otherwise', () => {
        const { container, rerender } = render(<PartialNotice meta={meta(false)} />)
        expect(container).toBeEmptyDOMElement()

        rerender(<PartialNotice meta={meta(true)} />)
        expect(screen.getByText(/kept for 60 days/)).toBeInTheDocument()
        expect(screen.getByText(/01 Sept 2026|01 Sep 2026/)).toBeInTheDocument()
    })
})
