'use client'

import { AIInsights } from '@/components/analytics/AIInsights'

export default function AIInsightsPage() {
    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Insights</h1>
                <p className="text-slate-500 mt-1">Data-driven suggestions to optimize your fleet&apos;s efficiency and safety.</p>
            </div>

            <div className="max-w-2xl">
                <AIInsights />
            </div>
        </div>
    )
}
