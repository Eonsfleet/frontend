'use client'

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[GlobalError]', error)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-slate-400">{error.message || 'An unexpected error occurred.'}</p>
            <button
                onClick={reset}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            >
                Try again
            </button>
        </div>
    )
}
