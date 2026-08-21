'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useState } from 'react'
import { STALE_TIME_DEFAULT } from '@/lib/config'
import { ImportExportProgress } from '@/components/shared/ImportExportProgress'

export function AppProviders({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: { queries: { staleTime: STALE_TIME_DEFAULT, retry: 1 } },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster richColors position="top-right" />
            <ImportExportProgress />
        </QueryClientProvider>
    )
}
