'use client'

import { useEffect, useState } from 'react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/components/analytics/telemetry/format'

/**
 * When the Overview's data was last loaded, and a button to reload all of it.
 * Cards are fetched once and kept for five minutes (no background polling), so
 * the stamp is what tells a reader how current the numbers are.
 */
export function FreshnessBar() {
    const queryClient = useQueryClient()
    const fetching = useIsFetching({ queryKey: ['analytics'] })
    const [, tick] = useState(0)

    useEffect(() => queryClient.getQueryCache().subscribe(() => tick((n) => n + 1)), [queryClient])

    const updated = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['analytics'] })
        .reduce((latest, q) => Math.max(latest, q.state.dataUpdatedAt), 0)

    return (
        <div className="flex items-center justify-end gap-3 text-xs text-an-muted">
            <span aria-live="polite">{updated ? `Loaded at ${formatTime(new Date(updated).toISOString())}` : 'Loading…'}</span>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-an-border"
                disabled={fetching > 0}
                onClick={() => queryClient.invalidateQueries({ queryKey: ['analytics'] })}
            >
                <RefreshCw className={fetching > 0 ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} aria-hidden /> Refresh
            </Button>
        </div>
    )
}
