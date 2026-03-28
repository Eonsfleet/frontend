'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PortalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error('[PortalError]', error)
    }, [error])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-slate-400">{error.message || 'An unexpected error occurred.'}</p>
            <div className="flex gap-3">
                <button
                    onClick={reset}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
                >
                    Try again
                </button>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-800"
                >
                    Go to dashboard
                </button>
            </div>
        </div>
    )
}
