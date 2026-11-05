import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const push = vi.fn()
let query = ''
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push }),
    usePathname: () => '/reports',
    useSearchParams: () => new URLSearchParams(query),
}))
vi.mock('@/lib/api/reports', () => ({
    getReportCatalog: vi.fn().mockResolvedValue([
        { type: 'events.counts', title: 'x', category: 'alarms', permission: 'p', endpoint: '/e', filters: ['filter', 'vehicle_ids'], columns: [], window: '60d', allowed: true },
    ]),
}))
vi.mock('@/lib/reports/useReportLists', () => ({ useReportLists: () => ({ favorites: [], recent: [], toggleFavorite: vi.fn(), markRecent: vi.fn() }) }))

// The tabs and dialog are other features; only what the hub hands them matters here.
const dialog = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }))
vi.mock('@/components/reports/ExportDialog', () => ({
    ExportDialog: (props: Record<string, unknown>) => {
        dialog.props.push(props)
        return null
    },
}))
vi.mock('@/components/reports/CatalogTab', () => ({
    CatalogTab: ({ onOpen }: { onOpen: (t: string) => void }) => <button onClick={() => onOpen('gps.trips')}>open another</button>,
}))
vi.mock('@/components/reports/TemplatesTab', () => ({ TemplatesTab: () => null }))
vi.mock('@/components/reports/SchedulesTab', () => ({ SchedulesTab: () => null }))
vi.mock('@/components/reports/HistoryTab', () => ({ HistoryTab: () => null }))
vi.mock('@/components/reports/ScheduleDialog', () => ({ ScheduleDialog: () => null }))

import { ReportsHub } from '@/components/reports/ReportsHub'

const last = () => dialog.props[dialog.props.length - 1]
const renderHub = () => render(<QueryClientProvider client={new QueryClient()}><ReportsHub /></QueryClientProvider>)

beforeEach(() => {
    push.mockReset()
    dialog.props.length = 0
})

describe('Reports page opened from Analytics', () => {
    it('opens the linked report with the period and vehicles from the link', () => {
        query = 'report=events.counts&filter=7d&vehicle_ids=3,4'
        renderHub()
        expect(last()).toMatchObject({ type: 'events.counts', initial: { filter: '7d', vehicle_ids: [3, 4] } })
    })

    it('opens a plain report with no preset when the URL carries none (existing behavior)', () => {
        query = 'report=events.counts'
        renderHub()
        expect(last()).toMatchObject({ type: 'events.counts', initial: undefined })
    })

    it('ignores a hand-edited, malformed preset', () => {
        query = 'report=events.counts&filter=%3Cscript%3E&vehicle_ids=abc'
        renderHub()
        expect(last().initial).toBeUndefined()
    })

    it('drops the linked settings from the URL on the next navigation, so they cannot leak into another report', () => {
        query = 'report=events.counts&filter=7d&vehicle_ids=3&tab=reports'
        renderHub()
        fireEvent.click(screen.getByText('open another'))
        const url = push.mock.calls[0][0] as string
        expect(url).toContain('report=gps.trips')
        expect(url).not.toMatch(/filter=|vehicle_ids=/)
    })
})
