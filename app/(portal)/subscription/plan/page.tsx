'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, MinusCircle, Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { QueryError } from '@/components/shared/QueryError'
import { BillingCycleBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { extractApiError, cn } from '@/lib/utils'
import * as api from '@/lib/api/billing-groups'
import type { PlanOption } from '@/types/subscription'
import { format } from 'date-fns'

const CATEGORIES = ['Tracking', 'Operations', 'Fuel', 'Reporting', 'Integrations', 'Support'] as const

function FeatureState({ state, limitLabel }: { state: 'included' | 'not_included' | 'limited'; limitLabel?: string }) {
    if (state === 'included') return <span className="inline-flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Included</span>
    if (state === 'limited') return <span className="inline-flex items-center gap-1.5 text-amber-600"><MinusCircle className="h-4 w-4" /> Limited{limitLabel ? ` to ${limitLabel}` : ''}</span>
    return <span className="inline-flex items-center gap-1.5 text-slate-400"><XCircle className="h-4 w-4" /> Not included</span>
}

function PlanChangeDialog({ plan, onClose }: { plan: PlanOption | null; onClose: () => void }) {
    const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [note, setNote] = useState('')

    const { mutate, isPending } = useMutation({
        mutationFn: () => api.submitPlanChangeRequest({ requestedPlanId: plan!.id, effectiveDate, note }),
        onSuccess: () => {
            toast.success('Plan change request submitted.')
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err, 'Failed to submit plan change request.')),
    })

    if (!plan) return null

    return (
        <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Request Plan Change</DialogTitle>
                    <DialogDescription>Requesting a change to the <span className="font-semibold">{plan.name}</span> plan. This does not silently update your plan.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Effective date</Label>
                        <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Note (optional)</Label>
                        <textarea
                            rows={3}
                            className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={isPending} onClick={() => mutate()}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function SubscriptionPlanPage() {
    const [changePlan, setChangePlan] = useState<PlanOption | null>(null)

    const { data: currentPlan, isLoading: isPlanLoading, isError: isPlanError, refetch: refetchPlan } = useQuery({
        queryKey: ['current-plan'],
        queryFn: api.getCurrentPlan,
    })

    const { data: planOptions, isLoading: isOptionsLoading } = useQuery({
        queryKey: ['plan-options'],
        queryFn: api.getPlanOptions,
    })

    if (isPlanLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
    }

    if (isPlanError || !currentPlan) {
        return <QueryError message="Failed to load plan details." onRetry={refetchPlan} />
    }

    return (
        <div className="max-w-6xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Plan & Features</h1>
                <p className="mt-1 text-sm text-slate-500">Plan behaviour reflects backend-configured features — not hard-coded by plan name.</p>
            </div>

            {/* 13.1 Current Plan */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-slate-900">{currentPlan.name} Plan</h2>
                            <BillingCycleBadge cycle={currentPlan.billingCycle} />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                            <MoneyDisplay value={currentPlan.pricePerAsset} className="font-semibold text-slate-700" /> per asset
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-sm">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Current assets</p>
                            <p className="mt-1 font-bold text-slate-900">{currentPlan.currentAssets.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Est. recurring total</p>
                            <MoneyDisplay value={currentPlan.estimatedRecurringTotal} className="mt-1 block font-bold text-slate-900" />
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Plan start date</p>
                            <BillingDateDisplay date={currentPlan.planStartDate} className="mt-1 block font-bold text-slate-900" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 13.2 Features grouped by category */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100"><CardTitle className="text-[13px] font-semibold text-slate-700">Plan Features</CardTitle></CardHeader>
                <CardContent className="divide-y divide-slate-100 p-0">
                    {CATEGORIES.map((category) => {
                        const features = currentPlan.features.filter((f) => f.category === category)
                        if (features.length === 0) return null
                        return (
                            <div key={category} className="px-5 py-4">
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">{category}</p>
                                <ul className="space-y-2">
                                    {features.map((feature) => (
                                        <li key={feature.name} className="flex items-center justify-between text-sm">
                                            <span className="text-slate-700">{feature.name}</span>
                                            <FeatureState state={feature.state} limitLabel={feature.limitLabel} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            {/* 13.3 Compare Plans */}
            <div>
                <h2 className="mb-3 text-lg font-bold text-slate-900">Compare Plans</h2>
                {isOptionsLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {planOptions?.map((plan) => (
                            <Card key={plan.id} className={cn('flex flex-col border-slate-200 shadow-sm', plan.isCurrent && 'border-indigo-300 ring-1 ring-indigo-100')}>
                                <CardContent className="flex flex-1 flex-col gap-4 p-5">
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                                            {plan.isCurrent && <Sparkles className="h-4 w-4 text-indigo-500" />}
                                        </div>
                                        {plan.pricePerAsset ? (
                                            <p className="mt-1 text-sm text-slate-500"><MoneyDisplay value={plan.pricePerAsset} className="font-bold text-slate-800" /> / asset</p>
                                        ) : (
                                            <p className="mt-1 text-sm text-slate-500">Custom pricing</p>
                                        )}
                                        <p className="mt-1 text-xs text-slate-400">{plan.assetLimit}</p>
                                    </div>
                                    <ul className="flex-1 space-y-1.5 text-xs text-slate-600">
                                        {plan.keyFeatures.map((f) => (
                                            <li key={f} className="flex items-start gap-1.5">
                                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        size="sm"
                                        disabled={plan.isCurrent}
                                        variant={plan.isCurrent ? 'outline' : 'default'}
                                        className={cn('w-full', !plan.isCurrent && 'bg-indigo-600 text-white hover:bg-indigo-700')}
                                        onClick={() => {
                                            if (plan.cta === 'Contact sales') {
                                                toast.info('Reach out to your account manager to discuss custom pricing.')
                                                return
                                            }
                                            setChangePlan(plan)
                                        }}
                                    >
                                        {plan.cta}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <PlanChangeDialog plan={changePlan} onClose={() => setChangePlan(null)} />
        </div>
    )
}
