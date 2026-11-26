'use client'

import { useParams } from 'next/navigation'
import { RoleGate } from '@/components/shared/RoleGate'
import { ReviewDetail } from '@/components/odometer/reviews/ReviewDetail'

export default function OdometerReviewPage() {
    const params = useParams()
    return (
        <RoleGate
            allowedRoles={['administrator', 'fleet_manager', 'owner']}
            fallbackMessage="Odometer reviews are restricted to Fleet Managers and Administrators."
        >
            <div className="p-6">
                <ReviewDetail id={String(params.id)} />
            </div>
        </RoleGate>
    )
}
