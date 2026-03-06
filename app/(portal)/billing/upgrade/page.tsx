'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Zap, Loader2, ArrowUpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

export default function PlanUpgradePage() {
    const { user } = useAuthStore()
    const currentTier = 'growth' as string // Normally derived from active subscription

    const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null)

    const handleUpgrade = (tier: string) => {
        if (tier === 'enterprise') {
            toast.info('Redirecting to Enterprise Sales contact form...')
            return
        }

        setIsCheckoutLoading(tier)
        // Simulate initializing Paystack payment flow
        setTimeout(() => {
            setIsCheckoutLoading(null)
            toast.success('Redirecting to secure payment checkout matching your region.')
        }, 1500)
    }

    const plans = [
        {
            id: 'starter',
            name: 'Starter Tier',
            price: '₦10,000',
            interval: '/ month',
            description: 'Essential telematics and routing features for small fleets.',
            features: ['Live GPS Tracking', 'Trip Logging', 'Basic Maintenance Tracking', 'Driver Management (Up to 10)'],
            limit: 'Up to 25 Vehicles',
            buttonText: currentTier === 'starter' ? 'Current Plan' : 'Downgrade to Starter',
            isCurrent: currentTier === 'starter',
            highlight: false
        },
        {
            id: 'growth',
            name: 'Growth Tier',
            price: '₦25,000',
            interval: '/ month',
            description: 'Advanced features required to securely operate a mid-sized regional network.',
            features: ['Everything in Starter', 'Fuel Expense Management', 'Route Geofencing & Alerts', 'Driver App Access', 'Document Expiration Workflows'],
            limit: 'Up to 100 Vehicles',
            buttonText: currentTier === 'growth' ? 'Current Plan' : 'Upgrade to Growth',
            isCurrent: currentTier === 'growth',
            highlight: true
        },
        {
            id: 'enterprise',
            name: 'Enterprise Tier',
            price: 'Custom',
            interval: ' pricing',
            description: 'Full-suite ERP replacements designed for national carriers.',
            features: ['Everything in Growth', '9-State Incident Workflow', 'Custom Reporting & API Limits', 'Dedicated Account Manager', 'Custom Roles & RBAC (Full)'],
            limit: 'Unlimited Vehicles',
            buttonText: 'Contact Sales',
            isCurrent: currentTier === 'enterprise',
            highlight: false
        }
    ]

    return (
        <div className="space-y-8 max-w-6xl">
            <div className="text-center max-w-2xl mx-auto py-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Subscription Plans</h1>
                <p className="text-slate-500 mt-3 text-lg">Scalable pricing tiers engineered to adapt smoothly as your logistic demands evolve.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <Card
                        key={plan.id}
                        className={`relative flex flex-col transition-all duration-200 ${plan.highlight ? 'border-indigo-500 shadow-lg shadow-indigo-100 scale-105 z-10' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
                    >
                        {plan.highlight && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <span className="bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Most Popular
                                </span>
                            </div>
                        )}
                        <CardHeader className={`${plan.highlight ? 'bg-indigo-50/50' : 'bg-white'} border-b ${plan.highlight ? 'border-indigo-100' : 'border-slate-100'} pb-6 rounded-t-xl`}>
                            <CardTitle className="text-lg font-bold text-slate-900">{plan.name}</CardTitle>
                            <CardDescription className="h-10 mt-2 text-slate-500 leading-snug">{plan.description}</CardDescription>
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-indigo-600' : 'text-slate-900'}`}>{plan.price}</span>
                                <span className="text-sm font-medium text-slate-500">{plan.interval}</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-4">{plan.limit}</p>
                        </CardHeader>
                        <CardContent className="flex-1 p-6">
                            <ul className="space-y-4">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                        <Check className={`w-5 h-5 shrink-0 ${plan.highlight ? 'text-indigo-500' : 'text-emerald-500'}`} />
                                        <span className="text-sm text-slate-700">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter className={`${plan.highlight ? 'bg-indigo-50/50' : 'bg-slate-50'} border-t ${plan.highlight ? 'border-indigo-100' : 'border-slate-100'} p-6 rounded-b-xl`}>
                            <Button
                                className={`w-full ${plan.highlight && !plan.isCurrent ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                                variant={plan.isCurrent ? 'outline' : (plan.id === 'enterprise' ? 'secondary' : 'default')}
                                disabled={plan.isCurrent || isCheckoutLoading !== null}
                                onClick={() => handleUpgrade(plan.id)}
                            >
                                {isCheckoutLoading === plan.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : plan.isCurrent ? null : (
                                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                                )}
                                {plan.buttonText}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
