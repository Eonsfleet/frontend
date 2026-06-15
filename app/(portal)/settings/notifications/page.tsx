'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function NotificationSettingsRedirect() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/notifications')
    }, [router])

    return (
        <div className="flex min-h-[360px] items-center justify-center">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                Opening notification center...
            </div>
        </div>
    )
}
