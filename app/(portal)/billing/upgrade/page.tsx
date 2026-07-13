'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Zap, Loader2, ArrowUpCircle, AlertCircle, PlusCircle, Car, Cpu, ArrowLeft, ShieldAlert, CheckCircle2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import * as api from '@/lib/api/billing'
import { cn, extractApiError } from '@/lib/utils'
import { useAccessControl } from '@/hooks/useAccessControl'

const TIER_WEIGHTS: Record<string, number> = {
    starter: 1,
    growth: 2,
    enterprise: 3
}

// ─── Currency Formatter Utility ──────────────────────────────────────────────
function formatBilledCurrency(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency || 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount)
    } catch (e) {
        return `${currency || 'NGN'} ${amount.toLocaleString()}`
    }
}

function formatKoboBilledCurrency(kobo: number | undefined, currency: string) {
    if (kobo === undefined) return null
    const value = kobo / 100
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency || 'NGN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value)
    } catch (e) {
        return `${currency || 'NGN'} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
}

export default function PlanUpgradePage() {
    const queryClient = useQueryClient()
    const { isOwner } = useAccessControl()
    const [isCheckoutLoading, setIsCheckoutLoading] = useState<number | null>(null)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

    // B2B Request Modal States
    const [isRequestOpen, setIsRequestOpen] = useState(false)
    const [requestSuccess, setRequestSuccess] = useState(false)
    const [targetPlanName, setTargetPlanName] = useState('')
    const [requestReason, setRequestReason] = useState('')
    const [requestDetails, setRequestDetails] = useState('')

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

    const submitRequestMutation = useMutation({
        mutationFn: api.submitBillingRequest,
        onSuccess: () => {
            setRequestSuccess(true)
            toast.success('Downgrade request submitted.')
            queryClient.invalidateQueries({ queryKey: ['billing-requests'] })
        },
        onError: (err) => {
            toast.error(extractApiError(err, 'Failed to submit downgrade request.'))
        }
    })

    const handlePlanAction = (planId: number, planName: string, planTier: string) => {
        if (!subscription) return

        const currentTierWeight = TIER_WEIGHTS[subscription.plan.tier] || 1
        const targetTierWeight = TIER_WEIGHTS[planTier] || 1

        const isDowngrade = targetTierWeight < currentTierWeight

        if (isDowngrade && !isOwner) {
            // Gated for B2B - Open change request dialog
            setTargetPlanName(planName)
            setRequestReason('')
            setRequestDetails('')
            setRequestSuccess(false)
            setIsRequestOpen(true)
            return
        }

        // Self-serve (B2C or B2B Upgrade)
        setIsCheckoutLoading(planId)
        changePlanMutation.mutate({
            subscription_id: subscription.id,
            plan_id: planId,
            billing_cycle: billingCycle,
            redirect_url: `${window.location.origin}/billing/callback`,
        })
    }

    const handleB2BRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!requestReason) return
        submitRequestMutation.mutate({
            type: 'downgrade',
            reason: requestReason,
            details: `Requested downgrade to plan: ${targetPlanName}. ${requestDetails}`
        })
    }

    if (isSubLoading || isPlansLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (isError || !plansData || !subscription) {
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

    const currentPlanId = subscription.plan.id
    const currency = subscription.currency || 'NGN'

    return (
        <div className="space-y-8 max-w-5xl p-8 pb-16 bg-slate-50 min-h-full">
            {/* Navigation back */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 px-0 gap-1.5" asChild>
                    <Link href="/billing">
                        <ArrowLeft className="w-4 h-4" /> Back to Billing
                    </Link>
                </Button>
            </div>

            {/* Header */}
            <div className="text-center max-w-xl mx-auto pt-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Choose a Plan</h1>
                <p className="text-slate-500 mt-2 text-xs leading-relaxed font-semibold uppercase tracking-wider">
                    {isOwner ? 'B2C Personal Subscriptions' : 'B2B Corporate Operations Plans'}
                </p>

                {/* Billing Cycle Toggle */}
                <div className="mt-6 inline-flex items-center p-1 bg-slate-200/60 border border-slate-200/30 rounded-lg gap-0.5 shadow-sm">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={cn(
                            'px-5 py-1.5 text-xs font-bold rounded-md transition-all',
                            billingCycle === 'monthly'
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={cn(
                            'px-5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5',
                            billingCycle === 'yearly'
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        Yearly
                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Save 15%</span>
                    </button>
                </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8">
                {plansData.data.map((plan, index) => {
                    const isCurrent = plan.id === currentPlanId
                    const price = billingCycle === 'monthly' ? plan.attributes.price_monthly : plan.attributes.price_yearly
                    const highlight = plan.attributes.name.toLowerCase().includes('growth')
                    const prevPlan = index > 0 ? plansData.data[index - 1] : null

                    // Dynamic currency rates
                    const vehicleRate = billingCycle === 'monthly'
                        ? formatKoboBilledCurrency(plan.attributes.vehicle_price_monthly_kobo, currency)
                        : formatKoboBilledCurrency(plan.attributes.vehicle_price_yearly_kobo, currency)
                    const deviceRate = billingCycle === 'monthly'
                        ? formatKoboBilledCurrency(plan.attributes.device_price_monthly_kobo, currency)
                        : formatKoboBilledCurrency(plan.attributes.device_price_yearly_kobo, currency)

                    const allFeatures = [...plan.relationships.core_modules, ...plan.relationships.advanced_capabilities]
                    let displayFeatures = allFeatures
                    let showEverything = false

                    if (prevPlan) {
                        const prevSlugs = new Set(
                            [...prevPlan.relationships.core_modules, ...prevPlan.relationships.advanced_capabilities].map(f => f.slug)
                        )
                        if ([...prevSlugs].every(s => allFeatures.some(f => f.slug === s))) {
                            showEverything = true
                            displayFeatures = allFeatures.filter(f => !prevSlugs.has(f.slug))
                        }
                    }

                    const visibleFeatures = displayFeatures.slice(0, showEverything ? 4 : 5)
                    const hasMore = allFeatures.length > (showEverything ? visibleFeatures.length + (prevPlan ? 1 : 0) : visibleFeatures.length)

                    // Check if Downgrade
                    const currentTierWeight = TIER_WEIGHTS[subscription.plan.tier] || 1
                    const planTierWeight = TIER_WEIGHTS[plan.attributes.name.toLowerCase()] || 1
                    const isDowngrade = planTierWeight < currentTierWeight

                    return (
                        <Card
                            key={plan.id}
                            className={cn(
                                'relative flex flex-col transition-all duration-200 border',
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
                                    <span className="bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-widest py-1 px-2.5 rounded-full flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Popular
                                    </span>
                                </div>
                            )}

                            <CardHeader className={cn('pb-5 pt-6 px-6 rounded-t-xl', highlight ? 'bg-indigo-50/40' : 'bg-white')}>
                                <CardTitle className="text-base font-black text-slate-900">{plan.attributes.name}</CardTitle>
                                <CardDescription className="text-slate-500 text-xs mt-1 leading-snug h-8 line-clamp-2">
                                    {plan.attributes.description}
                                </CardDescription>

                                {/* Dynamic Currency Price */}
                                <div className="mt-5 flex items-baseline gap-1">
                                    <span className={cn('text-3xl font-black tracking-tight', highlight ? 'text-indigo-600' : 'text-slate-900')}>
                                        {formatBilledCurrency(price, currency)}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400">/ {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                </div>

                                {/* Limits */}
                                <div className="mt-3 space-y-1 pt-3 border-t border-slate-100">
                                    <p className="text-[11px] font-bold text-slate-500">
                                        {plan.attributes.vehicle_limit === null ? 'Unlimited' : `Up to ${plan.attributes.vehicle_limit}`} vehicles
                                    </p>
                                    {plan.attributes.user_limit != null && (
                                        <p className="text-[11px] text-slate-400">{plan.attributes.user_limit} users included</p>
                                    )}
                                </div>

                                {/* Per-asset rates in dynamic currency */}
                                {(vehicleRate || deviceRate) && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Per-asset billing</p>
                                        {vehicleRate && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                                                <Car className="w-3.5 h-3.5 text-indigo-400" />
                                                <span>{vehicleRate} / vehicle / {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                            </div>
                                        )}
                                        {deviceRate && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                                                <Cpu className="w-3.5 h-3.5 text-violet-400" />
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
                                            <span className="text-xs font-bold text-indigo-700">
                                                Everything in {prevPlan.attributes.name}
                                            </span>
                                        </li>
                                    )}
                                    {visibleFeatures.map((f, idx) => (
                                        <li key={idx} className="flex items-start gap-2.5">
                                            <Check className={cn('w-4 h-4 shrink-0 mt-0.5', highlight ? 'text-indigo-400' : 'text-emerald-500')} />
                                            <span className="text-xs text-slate-600 font-semibold">{f.name}</span>
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
                                                                <li key={i} className="flex items-start gap-2.5 border-b border-slate-100 pb-2 last:border-0">
                                                                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                                    <span className="text-xs text-slate-700 font-medium">{f.name}</span>
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
                                    className={cn('w-full text-xs font-bold uppercase tracking-wider', highlight && !isCurrent ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : '')}
                                    variant={isCurrent ? 'outline' : 'default'}
                                    disabled={isCurrent || isCheckoutLoading !== null}
                                    onClick={() => handlePlanAction(plan.id, plan.attributes.name, plan.attributes.name.toLowerCase())}
                                >
                                    {isCheckoutLoading === plan.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : isCurrent ? (
                                        <Check className="w-4 h-4 mr-2" />
                                    ) : (
                                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                                    )}
                                    {isCurrent ? 'Current Plan' : (isDowngrade && !isOwner ? 'Request Downgrade' : 'Select Plan')}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            {/* B2B Downgrade Change Request Dialog */}
            <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold flex items-center gap-2 text-slate-900">
                            <ShieldAlert className="w-5 h-5 text-indigo-500" /> Request Plan Downgrade
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                            Your request to downgrade to the <span className="font-semibold text-slate-800">{targetPlanName}</span> plan will be logged for administrative review.
                        </DialogDescription>
                    </DialogHeader>

                    {!requestSuccess ? (
                        <form onSubmit={handleB2BRequestSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="reason" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reason for Downgrading</Label>
                                <select
                                    id="reason"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                    required
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="Budget Constraints">Cost reduction / Budget constraints</option>
                                    <option value="Reduced Fleet size">Reduced fleet operations</option>
                                    <option value="Alternative Solution">Testing other options</option>
                                    <option value="Excess Capabilities">Features not required</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="details" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Additional Feedback</Label>
                                <textarea
                                    id="details"
                                    rows={3}
                                    className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    placeholder="Tell us how we can improve EonsFleet..."
                                    value={requestDetails}
                                    onChange={(e) => setRequestDetails(e.target.value)}
                                />
                            </div>

                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 text-[11px] leading-relaxed flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold">Operations SLA</p>
                                    <p className="mt-0.5">Corporate downgrade operations require compliance checkoffs. Request processing turnaround is <span className="font-bold">1 business day</span>. A confirmation notification will be sent upon completion.</p>
                                </div>
                            </div>

                            <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
                                <Button 
                                    type="submit" 
                                    disabled={submitRequestMutation.isPending}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4"
                                >
                                    {submitRequestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in fade-in">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">Downgrade Request Logged</h3>
                                <p className="text-slate-500 text-xs mt-1.5 max-w-xs">
                                    Our operational review desk has received your request. Turnaround time: 1 business day.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsRequestOpen(false)}>Close Window</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </div>
    )
}
