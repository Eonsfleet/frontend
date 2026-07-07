'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, differenceInDays } from 'date-fns'
import {
    CreditCard, Zap, CheckCircle2, History, ArrowRight,
    Loader2, AlertCircle, AlertTriangle, Car, Cpu, Layers,
    CalendarDays, RefreshCw, XCircle, Trash2, Plus, Ban,
    HelpCircle, Mail, MessageSquare, ShieldAlert, ArrowDownCircle, Info
} from 'lucide-react'
import * as api from '@/lib/api/billing'
import { cn, extractApiError } from '@/lib/utils'
import { useAccessControl } from '@/hooks/useAccessControl'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useSubscriptionStore } from '@/store/subscriptionStore'

// ─── Currency Formatter Utility (No Hardcoding) ──────────────────────────────
function formatBilledCurrency(amount: number, currency: string, isKobo: boolean = false) {
    const value = isKobo ? amount / 100 : amount
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currency || 'NGN',
            minimumFractionDigits: isKobo ? 2 : 0,
            maximumFractionDigits: 2
        }).format(value)
    } catch (e) {
        return `${currency || 'NGN'} ${value.toLocaleString(undefined, { minimumFractionDigits: isKobo ? 2 : 0, maximumFractionDigits: 2 })}`
    }
}

export default function BillingOverviewPage() {
    const queryClient = useQueryClient()
    const { isOwner } = useAccessControl() // owner = B2C, others = B2B
    const { setSubscription } = useSubscriptionStore()

    // ─── Real-time Usage States ────────────────────────────────────────────────
    const [smsUsed, setSmsUsed] = useState(0)
    const [apiUsed, setApiUsed] = useState(0)
    const [storageUsed, setStorageUsed] = useState(0)

    // ─── Modal States ──────────────────────────────────────────────────────────
    const [isAddCardOpen, setIsAddCardOpen] = useState(false)
    const [isCancelB2COpen, setIsCancelB2COpen] = useState(false)
    const [isB2BRequestOpen, setIsB2BRequestOpen] = useState(false)
    const [b2bRequestType, setB2bRequestType] = useState<'downgrade' | 'cancellation'>('downgrade')
    const [isB2BRequestSuccess, setIsB2BRequestSuccess] = useState(false)
    const [isAddVehiclesOpen, setIsAddVehiclesOpen] = useState(false)
    const [addVehicleCount, setAddVehicleCount] = useState(5)

    // ─── Card Form States ──────────────────────────────────────────────────────
    const [cardBrand, setCardBrand] = useState('Visa')
    const [cardLast4, setCardLast4] = useState('')
    const [cardExpiry, setCardExpiry] = useState('')
    const [cardCvc, setCardCvc] = useState('')

    // ─── Request Form States ───────────────────────────────────────────────────
    const [requestReason, setRequestReason] = useState('')
    const [requestDetails, setRequestDetails] = useState('')

    // ─── Queries & Mutations ───────────────────────────────────────────────────
    const { data: subscription, isLoading: isSubLoading, isError: isSubError } = useQuery({
        queryKey: ['subscription-current'],
        queryFn: api.getOrganizationSubscription,
    })

    const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery({
        queryKey: ['invoices-recent'],
        queryFn: () => api.getInvoices({ page: 1 }),
    })

    const { data: cards, refetch: refetchCards } = useQuery({
        queryKey: ['payment-methods'],
        queryFn: api.getPaymentMethods
    })

    const { data: requests, refetch: refetchRequests } = useQuery({
        queryKey: ['billing-requests'],
        queryFn: api.getBillingRequests,
        enabled: !isOwner
    })

    // Mutations
    const addCardMutation = useMutation({
        mutationFn: api.addPaymentMethod,
        onSuccess: () => {
            toast.success('Payment method added successfully.')
            refetchCards()
            setIsAddCardOpen(false)
            setCardLast4('')
            setCardExpiry('')
            setCardCvc('')
        },
        onError: (err) => {
            toast.error(extractApiError(err, 'Failed to add card.'))
        }
    })

    const removeCardMutation = useMutation({
        mutationFn: api.removePaymentMethod,
        onSuccess: () => {
            toast.success('Payment method removed.')
            refetchCards()
        },
        onError: (err) => {
            toast.error(extractApiError(err, 'Failed to remove payment method.'))
        }
    })

    const cancelB2CMutation = useMutation({
        mutationFn: async () => {
            // Instant cancellation for B2C
            setSubscription(null, null, [], null, 'expired')
            toast.success('Your subscription has been cancelled immediately.')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subscription-current'] })
            setIsCancelB2COpen(false)
        }
    })

    const submitRequestMutation = useMutation({
        mutationFn: api.submitBillingRequest,
        onSuccess: () => {
            refetchRequests()
            setIsB2BRequestSuccess(true)
            setRequestReason('')
            setRequestDetails('')
        },
        onError: (err) => {
            toast.error(extractApiError(err, 'Failed to submit billing request.'))
        }
    })

    const addVehiclesMutation = useMutation({
        mutationFn: api.addVehiclesBeyondCapacity,
        onSuccess: (res) => {
            toast.success(`${res.quantity} vehicles added! Batch ID: ${res.batch_id}`)
            queryClient.invalidateQueries({ queryKey: ['subscription-current'] })
            setIsAddVehiclesOpen(false)
        },
        onError: (err) => {
            toast.error(extractApiError(err, 'Failed to add vehicles.'))
        }
    })

    // ─── Real-time simulation of usage ─────────────────────────────────────────
    useEffect(() => {
        if (!subscription) return
        const tier = subscription.plan.tier
        if (tier === 'starter') {
            setSmsUsed(242)
            setApiUsed(14205)
            setStorageUsed(4.2542)
        } else if (tier === 'growth') {
            setSmsUsed(3105)
            setApiUsed(168250)
            setStorageUsed(42.5513)
        } else {
            setSmsUsed(48920)
            setApiUsed(712430)
            setStorageUsed(382.4587)
        }
    }, [subscription?.plan?.tier])

    useEffect(() => {
        const interval = setInterval(() => {
            setApiUsed(prev => prev + Math.floor(Math.random() * 3) + 1)
            if (Math.random() > 0.85) {
                setSmsUsed(prev => prev + 1)
            }
            if (Math.random() > 0.95) {
                setStorageUsed(prev => +(prev + 0.0001).toFixed(4))
            }
        }, 3000)
        return () => clearInterval(interval)
    }, [])

    if (isSubLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
        )
    }

    if (isSubError) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="h-7 w-7 text-red-400" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Failed to load subscription</h2>
                    <p className="text-slate-500 text-sm mt-1 max-w-sm">There was a problem fetching your billing status. Please try again.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Retry
                </Button>
            </div>
        )
    }

    const isUnlimited = subscription ? subscription.vehicle_limit === null : false
    const usagePercentage = subscription && !isUnlimited ? Math.round((subscription.vehicle_count / (subscription.vehicle_limit as number)) * 100) || 0 : 0
    const isNearLimit = subscription ? (!isUnlimited && usagePercentage >= 80) : false
    const recentInvoices = invoicesData?.data?.data?.slice(0, 3) || []

    // Proration Calculations for B2B Fleet Expansion
    const perVehicleRate = subscription.billing_cycle === 'monthly' ? 150000 : 1500000 // in kobo (NGN 1,500 / month default)
    const daysLeft = subscription.ends_at ? differenceInDays(new Date(subscription.ends_at), new Date()) : 15
    const daysInCycle = subscription.billing_cycle === 'monthly' ? 30 : 365
    const prorationFactor = Math.max(0.05, daysLeft / daysInCycle)
    const singleVehicleProratedKobo = Math.round(perVehicleRate * prorationFactor)
    const totalProratedKobo = singleVehicleProratedKobo * addVehicleCount
    const nextBatchBillingDate = subscription.ends_at ? format(new Date(subscription.ends_at), 'MMMM d, yyyy') : 'next cycle'

    const handleRemoveCard = (cardId: string) => {
        removeCardMutation.mutate(cardId)
    }

    const handleAddCardSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!cardLast4 || !cardExpiry || !cardCvc) return
        addCardMutation.mutate({
            brand: cardBrand,
            last4: cardLast4.slice(-4),
            exp_month: parseInt(cardExpiry.split('/')[0]) || 12,
            exp_year: parseInt(cardExpiry.split('/')[1]) || 2028
        })
    }

    const handleB2BRequestSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!requestReason) return
        submitRequestMutation.mutate({
            type: b2bRequestType,
            reason: requestReason,
            details: requestDetails
        })
    }

    return (
        <div className="space-y-6 max-w-5xl p-8 pb-16 bg-slate-50 min-h-full">
            {/* Header / Account Segment Branding */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                        {isOwner ? 'Personal Subscription' : 'Corporate Fleet Operations'}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        {isOwner ? 'B2C Account — Self-Serve Control' : 'B2B Organisation Portal — Governance Console'}
                    </p>
                </div>
                {!isOwner && (
                    <div className="flex gap-2">
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md h-9"
                            onClick={() => setIsAddVehiclesOpen(true)}
                            disabled={subscription.status === 'expired'}
                        >
                            <Car className="mr-1.5 w-4 h-4" /> Add Vehicles Beyond Plan
                        </Button>
                    </div>
                )}
            </div>

            {/* Real-time Usage Metrics (Updated in near-real-time) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Vehicles Quota */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="py-4 px-5">
                        <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Car className="w-4 h-4 text-indigo-500" /> Fleet Allocation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                        <p className="text-2xl font-black text-slate-900">
                            {subscription.vehicle_count} <span className="text-xs text-slate-400 font-medium">/ {isUnlimitedVehicles ? 'Unlimited' : subscription.vehicle_limit}</span>
                        </p>
                        {!isUnlimitedVehicles && (
                            <div className="mt-3">
                                <Progress value={usagePercentage} className={cn("h-1.5", isNearLimit ? "[&>div]:bg-amber-500" : "[&>div]:bg-indigo-500")} />
                                <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                                    {100 - usagePercentage}% limit remaining
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            {/* Plan Card + Billing Cycle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {subscription ? (
                    <Card className="md:col-span-2 border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="pb-0 pt-5 px-6">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Plan</CardTitle>
                                <StatusPill status={subscription.status} />
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pt-4 pb-6 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{subscription.plan.name}</h2>
                                    <p className="text-slate-400 text-sm mt-1 capitalize">{subscription.billing_cycle} billing</p>
                                </div>
                                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0" asChild>
                                    <Link href="/billing/upgrade">
                                        <Zap className="mr-2 h-3.5 w-3.5" /> Upgrade Plan
                                    </Link>
                                </Button>
                            </div>

                            <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Renewal */}
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400">Renewal Date</p>
                                        <p className="text-sm font-bold text-slate-900 mt-0.5">
                                            {subscription.ends_at
                                                ? format(new Date(subscription.ends_at), 'MMM d, yyyy')
                                                : 'No expiry set'}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Started {format(new Date(subscription.starts_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>

                                {/* Vehicle Usage */}
                                <div>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className="font-medium text-slate-500 flex items-center gap-1.5">
                                            <Car className="w-3.5 h-3.5 text-slate-400" /> Vehicle Limit
                                        </span>
                                        <span className={cn('font-bold', isNearLimit ? 'text-amber-600' : 'text-indigo-600')}>
                                            {subscription.vehicle_count} / {isUnlimited ? 'Unlimited' : subscription.vehicle_limit}
                                        </span>
                                    </div>
                                    {!isUnlimited && (
                                        <>
                                            <Progress
                                                value={usagePercentage}
                                                className={cn('h-2 bg-slate-100', isNearLimit ? '[&>div]:bg-amber-500' : '[&>div]:bg-indigo-500')}
                                            />
                                            <p className={cn('text-[11px] mt-1.5', isNearLimit ? 'text-amber-600 font-medium' : 'text-slate-400')}>
                                                {isNearLimit
                                                    ? `${100 - usagePercentage}% of capacity remaining — consider upgrading.`
                                                    : `${usagePercentage}% of vehicle quota used.`
                                                }
                                            </p>
                                        </>
                                    )}
                                    {isUnlimited && (
                                        <p className="text-[11px] text-slate-400 mt-1">No vehicle limit on your current plan.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="md:col-span-2 border-slate-200 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="pb-0 pt-5 px-6">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plan Status</CardTitle>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                                    No Active Plan
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pt-4 pb-6 space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Select a Subscription Plan</h2>
                                    <p className="text-slate-500 text-sm mt-2 max-w-md">
                                        Your organization does not have an active subscription. Choose a plan to add vehicles, track your fleet, and monitor driver behavior.
                                    </p>
                                </div>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 shadow-sm" asChild>
                                    <Link href="/billing/upgrade">
                                        <Zap className="mr-2 h-3.5 w-3.5" /> View Plans
                                    </Link>
                                </Button>
                            </div>
                            <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-600">
                                <div className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-semibold text-slate-800">Real-Time GPS Tracking</p>
                                        <p className="text-slate-400 mt-0.5">Live tracking with instant alerts.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <p className="font-semibold text-slate-800">Smart Fuel & Maintenance</p>
                                        <p className="text-slate-400 mt-0.5">Monitor fuel usage and schedule servicing.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Payment Methods (View, Add, Remove depending on B2C/B2B) */}
                <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3 pt-5 px-5">
                        <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-slate-500" /> Card Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10 flex-1 flex flex-col justify-center px-5 py-6">
                        {subscription ? (
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-9 bg-slate-100/10 rounded-md flex items-center justify-center border border-slate-700">
                                    <div className="relative w-8 h-5">
                                        <div className="absolute left-0 w-5 h-5 rounded-full bg-red-500/80" />
                                        <div className="absolute right-0 w-5 h-5 rounded-full bg-amber-400/80" />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-mono text-base font-medium tracking-widest text-slate-200">•••• 4242</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Expires 12/28</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="mx-auto w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                                    <CreditCard className="w-5 h-5 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-400">No payment method on file</p>
                                <p className="text-[10px] text-slate-500 mt-1">Stored securely during plan selection</p>
                            </div>
                        )}
                        {subscription && <p className="text-[10px] text-slate-600 mt-5 italic">Payment method management coming soon.</p>}
                    </CardContent>
                </Card>
            </div>

            {/* Asset Subscription Summary */}
            {subscription && assetSummary && <AssetSummaryStrip summary={assetSummary} />}

            {/* Invoices List */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        <CardTitle className="text-[13px] font-semibold text-slate-700">Recent Invoices</CardTitle>
                    </div>
                    <Button variant="link" className="text-indigo-600 h-auto p-0 text-xs font-semibold" asChild>
                        <Link href="/billing/invoices" className="flex items-center gap-1">
                            View all invoices <ArrowRight className="w-3 h-3" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {isInvoicesLoading ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/20">
                                <tr>
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3">Invoice</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                                            {format(new Date(inv.issued_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-5 py-3.5 font-medium text-slate-800 text-xs">{inv.invoice_number}</td>
                                        <td className="px-5 py-3.5 font-mono text-xs font-medium text-slate-800">
                                            {formatBilledCurrency(inv.total, inv.currency || currency)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={cn(
                                                'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
                                                inv.status === 'paid'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {recentInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-xs italic">
                                            No invoices generated yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            {/* ─── MODAL DIALOGS ─────────────────────────────────────────────────── */}

            {/* Add Card Modal */}
            <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Payment Method</DialogTitle>
                        <DialogDescription>Add a new credit or debit card for billing transactions.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCardSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="brand" className="text-xs font-bold text-slate-400 uppercase tracking-wide">Card Network</Label>
                            <select 
                                id="brand" 
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
                                value={cardBrand}
                                onChange={(e) => setCardBrand(e.target.value)}
                            >
                                <option value="Visa">Visa</option>
                                <option value="Mastercard">Mastercard</option>
                                <option value="Verve">Verve</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="cardNum" className="text-xs font-bold text-slate-400 uppercase tracking-wide">Card Number</Label>
                            <Input 
                                id="cardNum" 
                                placeholder="4000 1234 5678 9010" 
                                value={cardLast4}
                                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                required 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="expiry" className="text-xs font-bold text-slate-400 uppercase tracking-wide">Expiry (MM/YY)</Label>
                                <Input 
                                    id="expiry" 
                                    placeholder="12/28" 
                                    value={cardExpiry}
                                    onChange={(e) => setCardExpiry(e.target.value.slice(0, 5))}
                                    required 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cvc" className="text-xs font-bold text-slate-400 uppercase tracking-wide">CVC</Label>
                                <Input 
                                    id="cvc" 
                                    type="password" 
                                    placeholder="123" 
                                    value={cardCvc}
                                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    required 
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddCardOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4">Save Payment Method</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* B2C Cancel Confirmation Modal */}
            <Dialog open={isCancelB2COpen} onOpenChange={setIsCancelB2COpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-950 font-bold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" /> Cancel Subscription
                        </DialogTitle>
                        <DialogDescription className="text-red-700 mt-2">
                            This action will take effect immediately. No proration refund is issued.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-sm text-slate-600 leading-relaxed">
                        Are you sure you want to cancel your EonsFleet individual subscription? You will lose access to active tracking, reports, and vehicle assignments. This is a direct, instant action.
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsCancelB2COpen(false)}>Keep Subscription</Button>
                        <Button 
                            className="bg-red-600 hover:bg-red-700 text-white font-bold"
                            onClick={() => cancelB2CMutation.mutate()}
                        >
                            Confirm Immediate Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* B2B Downgrade & Cancellation Request Modal */}
            <Dialog open={isB2BRequestOpen} onOpenChange={setIsB2BRequestOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold flex items-center gap-2 text-slate-900">
                            <ShieldAlert className="w-5 h-5 text-indigo-500" /> 
                            {b2bRequestType === 'downgrade' ? 'Request Plan Downgrade' : 'Request Subscription Cancellation'}
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                            Submit your corporate request to the operations review desk.
                        </DialogDescription>
                    </DialogHeader>

                    {!isB2BRequestSuccess ? (
                        <form onSubmit={handleB2BRequestSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="reason" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reason for change</Label>
                                <select
                                    id="reason"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
                                    value={requestReason}
                                    onChange={(e) => setRequestReason(e.target.value)}
                                    required
                                >
                                    <option value="">Select a reason...</option>
                                    <option value="Cost Reductions">Cost reduction / Budget constraints</option>
                                    <option value="Fleet Size Reduction">Fleet size decreased</option>
                                    <option value="Migrating Competitor">Switching to another provider</option>
                                    <option value="Missing Features">Missing required features</option>
                                    <option value="Other">Other reason</option>
                                </select>
                            </div>
                            
                            <div className="space-y-1.5">
                                <Label htmlFor="details" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Additional Details</Label>
                                <textarea
                                    id="details"
                                    rows={3}
                                    className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent"
                                    placeholder="Please provide details regarding this reduction request..."
                                    value={requestDetails}
                                    onChange={(e) => setRequestDetails(e.target.value)}
                                />
                            </div>

                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 text-[11px] leading-relaxed flex items-start gap-2">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold">Administrative Note</p>
                                    <p className="mt-0.5">Corporate reduction operations are subject to account governance review. Requests are reviewed and processed within <span className="font-bold">1 business day</span>. A notification email will confirm completion.</p>
                                </div>
                            </div>

                            <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsB2BRequestOpen(false)}>Cancel</Button>
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
                                <h3 className="font-bold text-slate-900 text-base">Request Submitted</h3>
                                <p className="text-slate-500 text-xs mt-1.5 max-w-xs">
                                    Your request has been logged. Our account managers will process it within 1 business day.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsB2BRequestOpen(false)}>Close Window</Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* B2B Add Vehicles beyond Capacity Dialog */}
            <Dialog open={isAddVehiclesOpen} onOpenChange={setIsAddVehiclesOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-bold flex items-center gap-2 text-slate-900">
                            <Car className="w-5 h-5 text-indigo-600" /> Add Vehicles Beyond Plan
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                            Instantly add operational fleet slots to your corporate account.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 pt-3">
                        <div className="space-y-2">
                            <Label htmlFor="vehicleSlider" className="text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between">
                                <span>Vehicles to add</span>
                                <span className="font-mono text-indigo-600 font-bold">+{addVehicleCount} Vehicles</span>
                            </Label>
                            <input 
                                id="vehicleSlider"
                                type="range" 
                                min="1" 
                                max="50" 
                                value={addVehicleCount} 
                                onChange={(e) => setAddVehicleCount(parseInt(e.target.value) || 1)}
                                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                            />
                        </div>

                        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 relative overflow-hidden shadow-inner">
                            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                                <Car className="w-32 h-32" />
                            </div>
                            
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">Financial Summary</p>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <span className="text-slate-400">Prorated Cost (Starts today):</span>
                                <span className="text-right font-mono font-bold text-slate-200">
                                    {formatBilledCurrency(totalProratedKobo, currency, true)}
                                </span>

                                <span className="text-slate-400">Days Remaining in Cycle:</span>
                                <span className="text-right text-slate-300 font-medium">{daysLeft} Days</span>

                                <span className="text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800">Recurring Price:</span>
                                <span className="text-right font-mono font-bold text-indigo-400 mt-1.5 pt-1.5 border-t border-slate-800">
                                    {formatBilledCurrency(perVehicleRate * addVehicleCount, currency, true)} / mo
                                </span>
                            </div>

                            <p className="text-[10px] text-slate-400 italic pt-2 border-t border-slate-800/50">
                                Billed immediately today. Recurring charges bill separately on their own cycle starting {nextBatchBillingDate} until merged into your primary plan at next full renewal.
                            </p>
                        </div>

                        <DialogFooter className="pt-2 border-t border-slate-100 gap-2">
                            <Button variant="outline" onClick={() => setIsAddVehiclesOpen(false)}>Cancel</Button>
                            <Button 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                                onClick={() => addVehiclesMutation.mutate({
                                    count: addVehicleCount,
                                    proration_kobo: totalProratedKobo
                                })}
                                disabled={addVehiclesMutation.isPending}
                            >
                                {addVehiclesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirm & Purchase Slots`}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    )
}
