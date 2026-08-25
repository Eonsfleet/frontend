'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Minus, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QueryError } from '@/components/shared/QueryError'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { BillingCycleBadge, SubscriptionStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { extractApiError, cn } from '@/lib/utils'
import * as billing from '@/lib/api/billing'
import type { SubscriptionPlan } from '@/lib/api/billing'

function planPrice(plan: SubscriptionPlan, cycle: 'monthly' | 'yearly') {
    return Number(
        cycle === 'yearly'
            ? (plan.attributes.vehicle_price_yearly ?? plan.attributes.price_yearly ?? plan.attributes.vehicle_price_yearly_kobo ?? 0)
            : (plan.attributes.vehicle_price_monthly ?? plan.attributes.price_monthly ?? plan.attributes.vehicle_price_monthly_kobo ?? 0)
    )
}

function planFeatures(plan: SubscriptionPlan) {
    return [
        ...(plan.relationships.core_modules ?? []),
        ...(plan.relationships.advanced_capabilities ?? []),
    ].map((feature) => feature.name)
}

export default function SubscriptionPlanPage() {
    const queryClient = useQueryClient()
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)

    const subscriptionQuery = useQuery({
        queryKey: ['org-subscription'],
        queryFn: billing.getOrganizationSubscription,
    })

    const plansQuery = useQuery({
        queryKey: ['subscription-plans'],
        queryFn: billing.getSubscriptionPlans,
    })

    const current = subscriptionQuery.data
    const plans = plansQuery.data?.data ?? []
    const cycle = current?.billing_cycle ?? 'monthly'
    const currency = current?.currency ?? 'NGN'

    const currentPlan = plans.find((plan) => plan.id === current?.plan.id)

    const planMutation = useMutation({
        mutationFn: async (plan: SubscriptionPlan) => {
            const currentPrice = currentPlan ? planPrice(currentPlan, cycle) : Number(current?.plan.price ?? 0)
            const nextPrice = planPrice(plan, cycle)
            if (!current) throw new Error('No active subscription found.')
            if (nextPrice >= currentPrice) return billing.upgradeSubscription(plan.id)
            return billing.downgradeSubscription(plan.id)
        },
        onSuccess: () => {
            toast.success('Plan change request submitted.')
            setSelectedPlan(null)
            queryClient.invalidateQueries({ queryKey: ['org-subscription'] })
            queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
        },
        onError: (error) => toast.error(extractApiError(error, 'Failed to update subscription plan.')),
    })

    if (subscriptionQuery.isLoading || plansQuery.isLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
    }

    if (subscriptionQuery.isError) {
        return <QueryError message="Failed to load subscription plan." onRetry={subscriptionQuery.refetch} />
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0055FF]">Plan controls</p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Plan & Capacity</h1>
                    <p className="mt-1 text-sm text-slate-500">Review plan pricing, enabled modules, limits, and submit backend plan changes.</p>
                </div>
                {current && (
                    <div className="flex flex-wrap items-center gap-2">
                        <SubscriptionStatusBadge status={billing.normalizeSubscriptionStatus(current.status)} />
                        <BillingCycleBadge cycle={billing.normalizeBillingCycle(cycle)} />
                    </div>
                )}
            </div>

            {current ? (
                <section className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Current plan</p>
                        <div className="mt-2 flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-slate-950">{current.plan.name}</h2>
                            <Sparkles className="h-4 w-4 text-[#0055FF]" />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{current.capabilities.length.toLocaleString()} backend capabilities enabled</p>
                    </div>
                    <Info label="Vehicles" value={`${current.vehicle_count.toLocaleString()} active`} />
                    <Info label="Recurring price" value={<MoneyDisplay value={billing.toMoney(current.plan.price, currency)} />} />
                    <Info label="Next billing" value={current.ends_at ? <BillingDateDisplay date={current.ends_at} /> : 'Not set'} />
                </section>
            ) : (
                <section className="rounded-lg bg-white p-5">
                    <h2 className="text-lg font-semibold text-slate-950">No current subscription</h2>
                    <p className="mt-1 text-sm text-slate-500">Select a plan below once the organization is ready to initialize billing.</p>
                </section>
            )}

            <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-slate-950">Available Plans</h2>
                    <span className="text-xs text-slate-500">Prices follow backend plan configuration</span>
                </div>
                {plansQuery.isError ? (
                    <QueryError message="Failed to load plan options." onRetry={plansQuery.refetch} />
                ) : plans.length === 0 ? (
                    <div className="rounded-lg bg-white p-8 text-center text-sm text-slate-500">No subscription plans were returned by the API.</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {plans.map((plan) => {
                            const isCurrent = plan.id === current?.plan.id
                            const monthly = planPrice(plan, 'monthly')
                            const yearly = planPrice(plan, 'yearly')
                            const custom = Boolean(plan.attributes.has_custom_pricing) || (monthly === 0 && yearly === 0)
                            const features = planFeatures(plan).slice(0, 6)

                            return (
                                <article key={plan.id} className={cn('flex min-h-[360px] flex-col rounded-lg bg-white p-5', isCurrent && 'ring-2 ring-[#0055FF]')}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-950">{plan.attributes.name}</h3>
                                            <p className="mt-1 min-h-10 text-sm text-slate-500">{plan.attributes.description}</p>
                                        </div>
                                        {isCurrent && <span className="rounded-full bg-[#0055FF]/10 px-2 py-1 text-[11px] font-semibold text-[#0055FF]">Current</span>}
                                    </div>

                                    <div className="mt-5 space-y-2">
                                        {custom ? (
                                            <p className="text-2xl font-semibold text-slate-950">Custom pricing</p>
                                        ) : (
                                            <>
                                                <p className="text-2xl font-semibold text-slate-950"><MoneyDisplay value={billing.toMoney(monthly, currency)} /> <span className="text-sm font-normal text-slate-500">/ vehicle monthly</span></p>
                                                <p className="text-sm text-slate-500"><MoneyDisplay value={billing.toMoney(yearly, currency)} /> / vehicle yearly</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                                        <Info label="Vehicle limit" value={plan.attributes.vehicle_limit?.toLocaleString() ?? 'Flexible'} />
                                        <Info label="User limit" value={plan.attributes.user_limit?.toLocaleString() ?? 'Flexible'} />
                                    </div>

                                    <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                                        {features.length === 0 ? (
                                            <li className="text-slate-500">No modules listed by the backend.</li>
                                        ) : features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        disabled={isCurrent || !current || custom}
                                        className={cn('mt-5 h-9 w-full gap-2', !isCurrent && current && !custom && 'bg-[#0055FF] text-white hover:bg-[#0048d9]')}
                                        variant={isCurrent || custom ? 'outline' : 'default'}
                                        onClick={() => setSelectedPlan(plan)}
                                    >
                                        {isCurrent ? 'Current plan' : custom ? 'Contact sales' : planPrice(plan, cycle) >= Number(current?.plan.price ?? 0) ? <><Plus className="h-4 w-4" /> Upgrade</> : <><Minus className="h-4 w-4" /> Downgrade</>}
                                    </Button>
                                </article>
                            )
                        })}
                    </div>
                )}
            </section>

            <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm plan change</DialogTitle>
                        <DialogDescription>
                            This will submit a backend request to move this organisation to {selectedPlan?.attributes.name}. Billing rules and effective dates are handled by the subscription API.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSelectedPlan(null)}>Cancel</Button>
                        <Button className="bg-[#0055FF] text-white hover:bg-[#0048d9]" disabled={planMutation.isPending || !selectedPlan} onClick={() => selectedPlan && planMutation.mutate(selectedPlan)}>
                            {planMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="rounded-md bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
        </div>
    )
}
