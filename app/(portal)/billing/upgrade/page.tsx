'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Zap, Loader2, ArrowUpCircle, AlertCircle, PlusCircle, Car, Cpu } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import * as api from '@/lib/api/billing'
import { cn, extractApiError } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

function formatNaira(amount: number) {
    return `₦${amount.toLocaleString('en-NG')}`
}

function formatKobo(kobo?: number) {
    if (!kobo) return null
    return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function PlanUpgradePage() {
    const [isCheckoutLoading, setIsCheckoutLoading] = useState<number | null>(null)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
    const { organization } = useAuthStore()

    const { data: subscription, isLoading: isSubLoading } = useQuery({
        queryKey: ['subscription-current'],
        queryFn: api.getOrganizationSubscription,
    })

    const { data: plansData, isLoading: isPlansLoading, isError } = useQuery({
        queryKey: ['subscription-plans'],
        queryFn: api.getSubscriptionPlans,
    })

    const changePlanMutation = useMutation({
        mutationFn: api.changePlan,
        onSuccess: (res) => {
            toast.success('Redirecting to secure payment checkout…')
            if (res.data.payment_url) window.location.href = res.data.payment_url
        },
        onError: (err: any) => {
            setIsCheckoutLoading(null)
            toast.error(extractApiError(err, 'Failed to initialise plan change.'))
        },
    })

    const initializeSubscriptionMutation = useMutation({
        mutationFn: api.initializeSubscription,
        onSuccess: (res) => {
            toast.success('Redirecting to secure payment checkout…')
            if (res.data.authorization_url) window.location.href = res.data.authorization_url
        },
        onError: (err: any) => {
            setIsCheckoutLoading(null)
            toast.error(extractApiError(err, 'Failed to initialise subscription.'))
        },
    })

    const handleUpgrade = (planId: number) => {
        setIsCheckoutLoading(planId)
        if (subscription) {
            changePlanMutation.mutate({
                subscription_id: subscription.id,
                plan_id: planId,
                billing_cycle: billingCycle,
                redirect_url: `${window.location.origin}/billing/callback`,
            })
        } else {
            const orgIdentifier = organization?.attributes?.identifier || organization?.id
            if (!orgIdentifier) {
                setIsCheckoutLoading(null)
                toast.error('Organization details not found. Please log in again.')
                return
            }
            initializeSubscriptionMutation.mutate({
                organization_id: orgIdentifier,
                plan_id: planId,
                billing_cycle: billingCycle,
                redirect_url: `${window.location.origin}/billing/callback`,
            })
        }
    }

    if (isSubLoading || isPlansLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (isError || !plansData) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="h-7 w-7 text-red-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Failed to load plans</h2>
                    <p className="text-slate-500 text-sm mt-1">Please refresh and try again.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
            </div>
        )
    }

    const currentPlanId = subscription?.plan?.id ?? null

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header */}
            <div className="text-center max-w-xl mx-auto pt-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Choose a Plan</h1>
                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                    Scalable tiers designed for growing logistics operations. Switch anytime — prorated to your current cycle.
                </p>

                {/* Billing Toggle */}
                <div className="mt-6 inline-flex items-center p-1 bg-slate-100 rounded-lg gap-0.5">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={cn(
                            'px-5 py-1.5 text-sm font-semibold rounded-md transition-all',
                            billingCycle === 'monthly'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={cn(
                            'px-5 py-1.5 text-sm font-semibold rounded-md transition-all flex items-center gap-2',
                            billingCycle === 'yearly'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        Yearly
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Save 15%</span>
                    </button>
                </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8">
                {plansData.data.map((plan, index) => {
                    const isCurrent  = plan.id === currentPlanId
                    const price      = billingCycle === 'monthly' ? plan.attributes.price_monthly : plan.attributes.price_yearly
                    const highlight  = plan.attributes.name.toLowerCase().includes('growth')
                    const prevPlan   = index > 0 ? plansData.data[index - 1] : null

                    // Per-asset pricing
                    const vehicleRate = billingCycle === 'monthly'
                        ? formatKobo(plan.attributes.vehicle_price_monthly_kobo)
                        : formatKobo(plan.attributes.vehicle_price_yearly_kobo)
                    const deviceRate = billingCycle === 'monthly'
                        ? formatKobo(plan.attributes.device_price_monthly_kobo)
                        : formatKobo(plan.attributes.device_price_yearly_kobo)

                    // Feature dedup
                    const allFeatures   = [...plan.relationships.core_modules, ...plan.relationships.advanced_capabilities]
                    let displayFeatures = allFeatures
                    let showEverything  = false

                    if (prevPlan) {
                        const prevSlugs = new Set(
                            [...prevPlan.relationships.core_modules, ...prevPlan.relationships.advanced_capabilities].map(f => f.slug)
                        )
                        if ([...prevSlugs].every(s => allFeatures.some(f => f.slug === s))) {
                            showEverything  = true
                            displayFeatures = allFeatures.filter(f => !prevSlugs.has(f.slug))
                        }
                    }

                    const visibleFeatures = displayFeatures.slice(0, showEverything ? 4 : 5)
                    const hasMore = allFeatures.length > (showEverything ? visibleFeatures.length + (prevPlan ? 1 : 0) : visibleFeatures.length)

                    return (
                        <Card
                            key={plan.id}
                            className={cn(
                                'relative flex flex-col transition-all duration-200',
                                highlight
                                    ? 'border-indigo-400 shadow-lg shadow-indigo-100/60 scale-[1.02] z-10'
                                    : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                            )}
                        >
                            {highlight && (
                                <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 via-indigo-600 to-violet-500 rounded-t-xl" />
                            )}
                            {highlight && (
                                <div className="absolute top-3 right-3">
                                    <span className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-2.5 rounded-full flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Popular
                                    </span>
                                </div>
                            )}

                            <CardHeader className={cn('pb-5 pt-6 px-6 rounded-t-xl', highlight ? 'bg-indigo-50/40' : 'bg-white')}>
                                <CardTitle className="text-base font-bold text-slate-900">{plan.attributes.name}</CardTitle>
                                <CardDescription className="text-slate-500 text-xs mt-1 leading-snug h-8 line-clamp-2">
                                    {plan.attributes.description}
                                </CardDescription>

                                {/* Price */}
                                <div className="mt-5 flex items-baseline gap-1">
                                    <span className={cn('text-3xl font-extrabold', highlight ? 'text-indigo-600' : 'text-slate-900')}>
                                        {formatNaira(price)}
                                    </span>
                                    <span className="text-xs font-medium text-slate-400">/ {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                </div>

                                {/* Limits */}
                                <div className="mt-3 space-y-1 pt-3 border-t border-slate-100">
                                    <p className="text-[11px] font-semibold text-slate-500">
                                        {plan.attributes.vehicle_limit === null ? 'Unlimited' : `Up to ${plan.attributes.vehicle_limit}`} vehicles
                                    </p>
                                    {plan.attributes.user_limit != null && (
                                        <p className="text-[11px] text-slate-400">{plan.attributes.user_limit} users included</p>
                                    )}
                                </div>

                                {/* Per-asset rates */}
                                {(vehicleRate || deviceRate) && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Per-asset billing</p>
                                        {vehicleRate && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                                <Car className="w-3 h-3 text-indigo-400" />
                                                <span>{vehicleRate} / vehicle / {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                            </div>
                                        )}
                                        {deviceRate && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                                <Cpu className="w-3 h-3 text-violet-400" />
                                                <span>{deviceRate} / device / {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardHeader>

                            <CardContent className="flex-1 px-6 py-5">
                                <ul className="space-y-3">
                                    {showEverything && prevPlan && (
                                        <li className="flex items-start gap-2.5">
                                            <Check className="w-4 h-4 shrink-0 text-indigo-500 mt-0.5" />
                                            <span className="text-xs font-semibold text-indigo-700">
                                                Everything in {prevPlan.attributes.name}
                                            </span>
                                        </li>
                                    )}
                                    {visibleFeatures.map((f, idx) => (
                                        <li key={idx} className="flex items-start gap-2.5">
                                            <Check className={cn('w-4 h-4 shrink-0 mt-0.5', highlight ? 'text-indigo-400' : 'text-emerald-500')} />
                                            <span className="text-xs text-slate-600">{f.name}</span>
                                        </li>
                                    ))}
                                    {hasMore && (
                                        <li>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-0 text-xs font-semibold gap-1.5">
                                                        <PlusCircle className="w-3.5 h-3.5" /> View all features
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>{plan.attributes.name} — All Features</DialogTitle>
                                                        <DialogDescription>Complete feature list for this plan tier.</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-3 max-h-[60vh] overflow-y-auto">
                                                        <ul className="space-y-2.5">
                                                            {allFeatures.map((f, i) => (
                                                                <li key={i} className="flex items-start gap-2.5 border-b border-slate-50 pb-2 last:border-0">
                                                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                                    <span className="text-xs text-slate-700">{f.name}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </li>
                                    )}
                                </ul>
                            </CardContent>

                            <CardFooter className={cn('px-6 py-5 border-t rounded-b-xl', highlight ? 'bg-indigo-50/40 border-indigo-100' : 'bg-slate-50/50 border-slate-100')}>
                                <Button
                                    className={cn('w-full text-sm', highlight && !isCurrent ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm' : '')}
                                    variant={isCurrent ? 'outline' : 'default'}
                                    disabled={isCurrent || isCheckoutLoading !== null}
                                    onClick={() => handleUpgrade(plan.id as number)}
                                >
                                    {isCheckoutLoading === plan.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : isCurrent ? (
                                        <Check className="w-4 h-4 mr-2" />
                                    ) : (
                                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                                    )}
                                    {isCurrent ? 'Current Plan' : (subscription ? (plan.id > (currentPlanId ?? 0) ? 'Upgrade' : 'Switch Plan') : 'Subscribe')}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            {/* Footer note */}
            <p className="text-center text-xs text-slate-400 pb-4">
                All plans include a 14-day free trial. Per-asset billing activates for each vehicle and device added to your fleet.
                <br />Need a custom quote? <a href="mailto:sales@eonsfleet.com" className="text-indigo-600 hover:underline">Contact sales</a>.
            </p>
        </div>
    )
}
