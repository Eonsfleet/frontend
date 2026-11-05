'use client'

import React from 'react'
import { UpgradeGate } from '@/components/shared/UpgradeGate'

/**
 * Every Fuel page now draws its own top tabs (FuelTabs) in this one full-width
 * frame. The old "Fuel Center" sidebar shell was removed, along with the Live
 * Monitor and Reports pages that only it served.
 */
export default function FuelLayout({ children }: { children: React.ReactNode }) {
    return (
        <UpgradeGate
            module="fuel"
            featureName="Fuel Management"
            description="Track fuel expenses, integrate external fuel cards, and run anomaly detection algorithms to stop fuel theft."
            requiredPlan="growth"
        >
            <div className="h-full overflow-y-auto bg-slate-50">
                <main className="min-w-0 p-6 lg:p-8">{children}</main>
            </div>
        </UpgradeGate>
    )
}
