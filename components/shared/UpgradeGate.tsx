'use client'

import React from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { Capability, PlanTier } from '@/store/subscriptionStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Rocket } from 'lucide-react'
import Link from 'next/link'

interface UpgradeGateProps {
    module: Capability
    featureName: string
    description: string
    requiredPlan?: PlanTier
    children: React.ReactNode
}

export function UpgradeGate({
    module,
    featureName,
    description,
    requiredPlan = 'growth',
    children
}: UpgradeGateProps) {
    const { hasCapability } = useSubscription()

    if (hasCapability(module)) {
        return <>{children}</>
    }

    return (
        <Card className="border-dashed border-2 bg-slate-50 border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <Rocket className="w-8 h-8 text-blue-600" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h3 className="text-xl font-bold text-slate-900">{featureName} is a {requiredPlan === 'growth' ? 'Growth' : 'Enterprise'} Feature</h3>
                    <p className="text-sm text-slate-500">
                        {description} Upgrade your plan to unlock this and other advanced fleet management tools.
                    </p>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 mt-4 px-8 h-11 shrink-0">
                    <Link href="/billing">Upgrade Plan</Link>
                </Button>
            </CardContent>
        </Card>
    )
}
