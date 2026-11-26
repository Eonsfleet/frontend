'use client'

import Link from 'next/link'
import { RoleGate } from '@/components/shared/RoleGate'
import { Button } from '@/components/ui/button'
import { ReviewList } from '@/components/odometer/reviews/ReviewList'

export default function OdometerReviewsPage() {
    return (
        <RoleGate
            allowedRoles={['administrator', 'fleet_manager', 'owner']}
            fallbackMessage="Odometer reviews are restricted to Fleet Managers and Administrators."
        >
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Odometer reviews</h1>
                        <p className="text-sm text-slate-500">Readings that need a decision before the vehicle odometer changes.</p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/odometer/import">Import readings (CSV)</Link>
                    </Button>
                </div>
                <ReviewList />
            </div>
        </RoleGate>
    )
}
