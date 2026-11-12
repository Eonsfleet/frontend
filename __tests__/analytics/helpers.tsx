import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { parseFilters } from '@/lib/analytics/filters'

export const filtersFrom = (qs = '') => parseFilters(new URLSearchParams(qs))

export function renderWithClient(ui: ReactElement) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
    return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) }
}

/** An axios-shaped failure, as the backend's error bodies arrive. */
export const httpError = (status: number, code?: string) => ({ response: { status, data: { errors: code ? [{ code }] : [] } } })
