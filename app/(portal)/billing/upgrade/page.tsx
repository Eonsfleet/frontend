'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Zap, Loader2, ArrowUpCircle, AlertCircle, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as api from '@/lib/api/billing'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export default function PlanUpgradePage() {
    const [isCheckoutLoading, setIsCheckoutLoading] = useState<number | null>(null)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

    const { data: subscription, isLoading: isSubLoading } = useQuery({
        queryKey: ['subscription-current'],
        queryFn: api.getOrganizationSubscription
    })

    const { data: plansData, isLoading: isPlansLoading, isError } = useQuery({
        queryKey: ['subscription-plans'],
        queryFn: api.getSubscriptionPlans
    })

    const changePlanMutation = useMutation({
        mutationFn: api.changePlan,
        onSuccess: (res) => {
            toast.success('Redirecting to secure payment checkout...')
            if (res.data.payment_url) {
                window.location.href = res.data.payment_url
            }
        },
        onError: (err: any) => {
            setIsCheckoutLoading(null)
            toast.error(err.response?.data?.message || 'Failed to initialize plan change')
        }
    })

    const handleUpgrade = (planId: number) => {
        if (!subscription) return

        setIsCheckoutLoading(planId)
        changePlanMutation.mutate({
            subscription_id: subscription.id,
            plan_id: planId,
            billing_cycle: billingCycle,
            redirect_url: `${window.location.origin}/billing/callback`
        })
    }

    if (isSubLoading || isPlansLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (isError || !plansData || !subscription) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-semibold text-slate-900">Failed to load billing information</h2>
                <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
        )
    }

    const currentPlanId = subscription.plan.id

    return (
        <div className="space-y-8 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto py-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Subscription Plans</h1>
                <p className="text-slate-500 mt-3 text-lg">Scalable pricing tiers engineered to adapt smoothly as your logistic demands evolve.</p>

                <div className="mt-8 inline-flex items-center p-1 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${billingCycle === 'monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${billingCycle === 'yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Yearly <span className="ml-1 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">-15%</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
                {plansData.data.map((plan, index) => {
                    const isCurrent = plan.id === currentPlanId
                    const price = billingCycle === 'monthly' ? plan.attributes.price_monthly : plan.attributes.price_yearly
                    const highlight = plan.attributes.name.toLowerCase().includes('growth')

                    // Deduplication logic
                    const prevPlan = index > 0 ? plansData.data[index - 1] : null
                    const coreModules = plan.relationships.core_modules
                    const advancedCaps = plan.relationships.advanced_capabilities
                    const allFeatures = [...coreModules, ...advancedCaps]

                    let displayFeatures = allFeatures
                    let everythingIncluded = false

                    if (prevPlan) {
                        const prevCore = prevPlan.relationships.core_modules
                        const prevAdvanced = prevPlan.relationships.advanced_capabilities
                        const prevSlugs = new Set([...prevCore, ...prevAdvanced].map(f => f.slug))

                        const allPrevSlugsInCurrent = [...prevSlugs].every(slug =>
                            allFeatures.some(f => f.slug === slug)
                        )

                        if (allPrevSlugsInCurrent) {
                            everythingIncluded = true
                            displayFeatures = allFeatures.filter(f => !prevSlugs.has(f.slug))
                        }
                    }

                    const visibleFeatures = displayFeatures.slice(0, everythingIncluded ? 4 : 5)
                    const hasMore = allFeatures.length > (everythingIncluded ? visibleFeatures.length + (prevPlan ? 1 : 0) : visibleFeatures.length)

                    return (
                        <Card
                            key={plan.id}
                            className={`relative flex flex-col transition-all duration-200 ${highlight ? 'border-indigo-500 shadow-lg shadow-indigo-100 scale-105 z-10' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
                        >
                            {highlight && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Recommended
                                    </span>
                                </div>
                            )}
                            <CardHeader className={`${highlight ? 'bg-indigo-50/50' : 'bg-white'} border-b ${highlight ? 'border-indigo-100' : 'border-slate-100'} pb-6 rounded-t-xl`}>
                                <CardTitle className="text-lg font-bold text-slate-900">{plan.attributes.name}</CardTitle>
                                <CardDescription className="h-10 mt-2 text-slate-500 leading-snug">{plan.attributes.description}</CardDescription>
                                <div className="mt-6 flex items-baseline gap-1">
                                    <span className={`text-4xl font-extrabold ${highlight ? 'text-indigo-600' : 'text-slate-900'}`}>
                                        ₦{price.toLocaleString()}
                                    </span>
                                    <span className="text-sm font-medium text-slate-500">/ {billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                </div>
                                <div className="mt-4 space-y-1">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        {plan.attributes.vehicle_limit === null ? 'Unlimited' : `Up to ${plan.attributes.vehicle_limit}`} Vehicles
                                    </p>
                                    {plan.attributes.user_limit !== undefined && (
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                                            {plan.attributes.user_limit === null ? 'Unlimited' : `${plan.attributes.user_limit}`} Users included
                                        </p>
                                    )}
                                    {plan.attributes.admin_limit !== undefined && (
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
                                            {plan.attributes.admin_limit === null ? 'Unlimited' : `${plan.attributes.admin_limit}`} Admins allowed
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 p-6">
                                <ul className="space-y-4">
                                    {everythingIncluded && prevPlan && (
                                        <li className="flex items-start gap-3">
                                            <Check className="w-5 h-5 shrink-0 text-indigo-600" />
                                            <span className="text-sm font-bold text-indigo-700">Everything in {prevPlan.attributes.name}</span>
                                        </li>
                                    )}
                                    {visibleFeatures.map((f, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <Check className={`w-5 h-5 shrink-0 ${highlight ? 'text-indigo-500' : 'text-emerald-500'}`} />
                                            <span className="text-sm text-slate-700">{f.name}</span>
                                        </li>
                                    ))}
                                    {hasMore && (
                                        <li className="pt-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-0 text-xs font-semibold">
                                                        <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> View all features
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md">
                                                    <DialogHeader>
                                                        <DialogTitle>{plan.attributes.name} Full Features</DialogTitle>
                                                        <DialogDescription>
                                                            A comprehensive list of all capabilities included in this tier.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                                                        <ul className="space-y-3">
                                                            {allFeatures.map((f, idx) => (
                                                                <li key={`all-${idx}`} className="flex items-start gap-3 border-b border-slate-50 pb-2 last:border-0">
                                                                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                                                                    <span className="text-sm text-slate-700">{f.name}</span>
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
                            <CardFooter className={`${highlight ? 'bg-indigo-50/50' : 'bg-slate-50'} border-t ${highlight ? 'border-indigo-100' : 'border-slate-100'} p-6 rounded-b-xl`}>
                                <Button
                                    className={`w-full ${highlight && !isCurrent ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                    variant={isCurrent ? 'outline' : 'default'}
                                    disabled={isCurrent || isCheckoutLoading !== null}
                                    onClick={() => handleUpgrade(plan.id)}
                                >
                                    {isCheckoutLoading === plan.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : isCurrent ? (
                                        <Check className="w-4 h-4 mr-2" />
                                    ) : (
                                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                                    )}
                                    {isCurrent ? 'Current Plan' : (plan.id > currentPlanId ? 'Upgrade' : 'Downgrade')}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
