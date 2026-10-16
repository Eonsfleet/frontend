'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { AlertOctagon, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/** Routes a suspended organization may still reach, so it can settle up. */
const SUSPENDED_ALLOWED_PREFIX = '/subscription'

export default function AppShell({ children }: { children: React.ReactNode }) {
    useRealtimeNotifications()
    const pathname = usePathname()
    const { subscriptionStatus, dunningStage } = useSubscriptionStore()

    const isSuspended = subscriptionStatus === 'suspended' || dunningStage === 'suspended'
    // The billing pages have to stay reachable while suspended, otherwise the
    // notice below sends the user to a screen that just renders the notice again.
    const canSettleUp =
        pathname === SUSPENDED_ALLOWED_PREFIX || pathname.startsWith(SUSPENDED_ALLOWED_PREFIX + '/')

    return (
        <div className="flex h-screen w-full overflow-hidden bg-white">
            <Sidebar />
            <main className="flex-1 overflow-auto relative bg-slate-50 min-w-0">
                {isSuspended && !canSettleUp ? <SuspendedNotice /> : children}
            </main>
        </div>
    )
}

function SuspendedNotice() {
    return (
        <div className="flex items-center justify-center min-h-full p-6 bg-gradient-to-br from-red-50/40 via-slate-50 to-indigo-50/20">
            <Card className="w-full max-w-lg border-red-200 shadow-xl shadow-red-100/40">
                <CardHeader className="bg-red-50/70 border-b border-red-100 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                            <AlertOctagon className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-red-950">Payment Failed — Access Suspended</CardTitle>
                            <CardDescription className="text-red-700 text-xs mt-0.5">
                                Settle your outstanding balance to restore fleet operations.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <p className="text-slate-600 text-sm leading-relaxed mb-6">
                        We were unable to process your subscription renewal, and the automatic retries have been
                        exhausted. Access stays suspended until payment clears. You can review the outstanding
                        invoice and pay it from your subscription page.
                    </p>

                    <Button
                        asChild
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 text-sm shadow-md"
                    >
                        <Link href={SUSPENDED_ALLOWED_PREFIX} className="flex items-center justify-center gap-2">
                            Go to Subscription &amp; Billing
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </Button>

                    <p className="text-slate-500 text-xs text-center mt-4 leading-relaxed">
                        Already paid? Your provider can take a few minutes to confirm the payment with us — reload
                        this page shortly. Contact support if the suspension persists.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
