'use client'

import { FuelTabs } from './FuelTabs'

export function OverviewHeader() {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Overview</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Fleet fuel position, usage, low-level exposure, and top consumers at a glance.
                    </p>
                </div>
            </div>

            <FuelTabs active="Overview" />
        </div>
    )
}
