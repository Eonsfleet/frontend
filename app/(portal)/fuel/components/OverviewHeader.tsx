'use client'

import { FuelTabs } from './FuelTabs'

export function OverviewHeader() {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Management</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Real-time fuel monitoring, analytics and cost management.
                    </p>
                </div>
            </div>

            <FuelTabs active="Overview" />
        </div>
    )
}
