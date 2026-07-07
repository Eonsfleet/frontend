'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { AlertOctagon, CreditCard, Loader2, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import * as api from '@/lib/api/billing'

export default function AppShell({ children }: { children: React.ReactNode }) {
    useRealtimeNotifications()
    const { subscriptionStatus, dunningStage, planTier, planName, capabilities, setSubscription } = useSubscriptionStore()
    const [isReactivating, setIsReactivating] = useState(false)
    const [cardNumber, setCardNumber] = useState('')
    const [expiry, setExpiry] = useState('')
    const [cvc, setCvc] = useState('')

    const isSuspended = subscriptionStatus === 'suspended' || dunningStage === 'suspended'

    const handleReactivate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!cardNumber || !expiry || !cvc) {
            toast.error('Please fill in all card details.')
            return
        }
        
        setIsReactivating(true)
        try {
            // Simulate adding a payment method
            const [expMonth, expYear] = expiry.split('/')
            await api.addPaymentMethod({
                brand: 'Visa',
                last4: cardNumber.slice(-4) || '4242',
                exp_month: parseInt(expMonth) || 12,
                exp_year: parseInt(expYear) || 2028
            })

            // Update subscription state back to active
            setSubscription(
                planTier || 'starter',
                planName || 'Starter Plan',
                capabilities || [],
                null,
                'active'
            )
            
            toast.success('Payment details updated successfully! Subscription has been reactivated.')
        } catch (error) {
            toast.error('Failed to reactivate account. Please verify details.')
        } finally {
            setIsReactivating(false)
        }
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-white">
            <Sidebar />
            <main className="flex-1 overflow-auto relative bg-slate-50 min-w-0">
                {isSuspended ? (
                    <div className="flex items-center justify-center min-h-full p-6 bg-gradient-to-br from-red-50/40 via-slate-50 to-indigo-50/20">
                        <Card className="w-full max-w-lg border-red-200 shadow-xl shadow-red-100/40 scale-100 transition-all">
                            <CardHeader className="bg-red-50/70 border-b border-red-100 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-pulse">
                                        <AlertOctagon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-bold text-red-950">Payment Failed — Access Suspended</CardTitle>
                                        <CardDescription className="text-red-700 text-xs mt-0.5">
                                            Update your payment details to restore fleet operations.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                                    We were unable to process your subscription renewal. Since automatic retries have been exhausted, access to EonsFleet remains suspended. To continue tracking, managing drivers, and dispatching vehicles, please register a valid payment method below.
                                </p>

                                <form onSubmit={handleReactivate} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cardNumber" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Card Number</Label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <Input
                                                id="cardNumber"
                                                placeholder="4000 1234 5678 9010"
                                                maxLength={19}
                                                className="pl-9 h-10 border-slate-200 text-sm focus-visible:ring-red-500"
                                                value={cardNumber}
                                                onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="expiry" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Expiration Date</Label>
                                            <Input
                                                id="expiry"
                                                placeholder="MM/YY"
                                                maxLength={5}
                                                className="h-10 border-slate-200 text-sm focus-visible:ring-red-500"
                                                value={expiry}
                                                onChange={(e) => setExpiry(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="cvc" className="text-xs font-bold text-slate-500 uppercase tracking-wide">CVC</Label>
                                            <Input
                                                id="cvc"
                                                placeholder="123"
                                                maxLength={4}
                                                type="password"
                                                className="h-10 border-slate-200 text-sm focus-visible:ring-red-500"
                                                value={cvc}
                                                onChange={(e) => setCvc(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isReactivating}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 text-sm shadow-md mt-2 flex items-center justify-center gap-2"
                                    >
                                        {isReactivating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processing Reactivation...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldAlert className="w-4 h-4" />
                                                Update Card & Reactivate
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    children
                )}
            </main>
        </div>
    )
}

