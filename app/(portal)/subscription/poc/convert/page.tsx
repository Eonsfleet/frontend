'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Car, Cpu, AlertTriangle, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn, extractApiError } from '@/lib/utils'
import { QueryError } from '@/components/shared/QueryError'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { AddAssetActions } from '@/components/shared/subscription/AddAssetActions'
import * as api from '@/lib/api/billing-groups'
import type { BillingCycle } from '@/types/subscription'
import { format } from 'date-fns'

const STEPS = ['Select Plan', 'Billing Cycle', 'Select Assets', 'Review', 'Confirm'] as const

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-2">
            {STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                    <div
                        className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                            i < current ? 'bg-emerald-100 text-emerald-700' : i === current ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400',
                        )}
                    >
                        {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < STEPS.length - 1 && <div className={cn('h-px w-8', i < current ? 'bg-emerald-300' : 'bg-slate-200')} />}
                </div>
            ))}
        </div>
    )
}

export default function ConvertPocPage() {
    const router = useRouter()
    const [stepIndex, setStepIndex] = useState(0)
    const [planId, setPlanId] = useState<string | null>(null)
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY')
    const [search, setSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [result, setResult] = useState<api.ConvertPocResult | null>(null)

    const step = STEPS[stepIndex]
    const billingStart = format(new Date(), 'yyyy-MM-dd')

    const { data: planOptions, isLoading: isPlansLoading } = useQuery({
        queryKey: ['plan-options'],
        queryFn: api.getPlanOptions,
    })

    // Same eligibility pool as the Add Assets wizard: already-billed assets are
    // excluded automatically, and users can import or manually add new ones.
    const { data: assets, isLoading: isAssetsLoading, isError: isAssetsError, refetch: refetchAssets } = useQuery({
        queryKey: ['eligible-assets'],
        queryFn: api.getEligibleAssets,
        enabled: step === 'Select Assets',
    })

    const filteredAssets = useMemo(() => {
        if (!assets) return []
        if (!search.trim()) return assets
        const q = search.trim().toLowerCase()
        return assets.filter((a) => a.label.toLowerCase().includes(q) || a.registrationNumber?.toLowerCase().includes(q))
    }, [assets, search])

    const previewQuery = useQuery({
        queryKey: ['convert-preview', selectedIds, billingCycle],
        queryFn: () => api.previewBillingGroup({ assetIds: selectedIds, billingCycle, billingStart }),
        enabled: step === 'Review' && selectedIds.length > 0,
    })

    const convertMutation = useMutation({
        mutationFn: () => api.convertPocToProduction({ planId: planId!, billingCycle, assetIds: selectedIds }),
        onSuccess: (res) => {
            // Never show success before the backend transaction completes (spec 14.5).
            toast.success('Production subscription created.')
            setResult(res)
        },
        onError: (err) => toast.error(extractApiError(err, 'Failed to convert POC.')),
    })

    const selectedPlan = useMemo(() => planOptions?.find((p) => p.id === planId) ?? null, [planOptions, planId])

    const toggleAsset = (id: number) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

    if (result) {
        return (
            <div className="max-w-2xl">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Converted to Production</h2>
                            <p className="mt-1 text-sm text-slate-500">Your organisation is now on a Production subscription.</p>
                        </div>
                        <div className="w-full max-w-sm space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm">
                            <Row label="Subscription ID" value={result.subscriptionId} />
                            <Row label="Billing group" value={result.billingGroupId} />
                            <Row label="Invoice" value={result.invoiceNumber} />
                        </div>
                        <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => router.push('/subscription')}>
                            Go to Subscription Overview
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-4xl space-y-6">
            <Link href="/subscription/poc" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-4 w-4" /> POC Overview
            </Link>

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Convert to Production</h1>
                <p className="mt-1 text-sm text-slate-500">Move your evaluation into a billed Production subscription.</p>
            </div>

            <StepIndicator current={stepIndex} />

            {step === 'Select Plan' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                        {isPlansLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {planOptions?.filter((p) => p.pricePerAsset).map((plan) => (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => setPlanId(plan.id)}
                                        className={cn(
                                            'rounded-lg border p-4 text-left transition-colors',
                                            planId === plan.id ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300',
                                        )}
                                    >
                                        <p className="font-bold text-slate-900">{plan.name}</p>
                                        {plan.pricePerAsset && <MoneyDisplay value={plan.pricePerAsset} className="mt-1 block text-sm text-slate-600" />}
                                        <p className="mt-1 text-xs text-slate-400">{plan.assetLimit}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end border-t border-slate-100 pt-4">
                            <Button size="sm" disabled={!planId} onClick={goNext} className="gap-1.5">Continue <ArrowRight className="h-3.5 w-3.5" /></Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 'Billing Cycle' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {(['MONTHLY', 'ANNUAL'] as const).map((cycle) => (
                                <button
                                    key={cycle}
                                    type="button"
                                    onClick={() => setBillingCycle(cycle)}
                                    className={cn(
                                        'rounded-lg border p-4 text-left transition-colors',
                                        billingCycle === cycle ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300',
                                    )}
                                >
                                    <p className="font-bold capitalize text-slate-900">{cycle.toLowerCase()}</p>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button variant="outline" size="sm" onClick={goBack}>Back</Button>
                            <Button size="sm" onClick={goNext} className="gap-1.5">Continue <ArrowRight className="h-3.5 w-3.5" /></Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Select Assets — mirrors the Add Assets wizard: already-billed assets are
                excluded automatically; users import a file or add manually for anything
                not yet in the eligible list. */}
            {step === 'Select Assets' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative max-w-xs flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input placeholder="Search vehicle, registration..." className="h-9 pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <AddAssetActions />
                        </div>

                        <p className="text-xs text-slate-400">Already-billed assets are excluded automatically. Import a file or add one manually if it isn&apos;t listed below.</p>

                        {isAssetsError ? (
                            <QueryError message="Failed to load eligible assets." onRetry={refetchAssets} />
                        ) : isAssetsLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                        ) : (
                            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                                {filteredAssets.map((asset) => (
                                    <label
                                        key={asset.id}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 text-sm',
                                            asset.eligible ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed opacity-60',
                                        )}
                                    >
                                        <Checkbox
                                            checked={selectedIds.includes(asset.id)}
                                            disabled={!asset.eligible}
                                            onCheckedChange={() => toggleAsset(asset.id)}
                                        />
                                        {asset.assetType === 'Vehicle' ? <Car className="h-4 w-4 text-blue-500" /> : <Cpu className="h-4 w-4 text-purple-500" />}
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-slate-800">{asset.label} <span className="font-normal text-slate-400">&middot; {asset.registrationNumber}</span></p>
                                            {!asset.eligible && (
                                                <p className="mt-0.5 flex items-center gap-1 text-xs text-rose-500">
                                                    <AlertTriangle className="h-3 w-3" /> {asset.ineligibleReason}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-400">{asset.vehicleType}</span>
                                    </label>
                                ))}
                                {filteredAssets.length === 0 && (
                                    <p className="px-4 py-8 text-center text-sm text-slate-400">No assets match your search.</p>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button variant="outline" size="sm" onClick={goBack}>Back</Button>
                            <Button size="sm" disabled={selectedIds.length === 0} onClick={goNext} className="gap-1.5">
                                Continue <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 'Review' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                        {previewQuery.isLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                        ) : previewQuery.data ? (
                            <div className="space-y-2 text-sm">
                                <Row label="Plan" value={selectedPlan?.name ?? '—'} />
                                <Row label="Asset count" value={previewQuery.data.assetCount} />
                                <Row label="Unit price" value={<MoneyDisplay value={previewQuery.data.unitPrice} />} />
                                <Row label="Subtotal" value={<MoneyDisplay value={previewQuery.data.subtotal} />} />
                                <Row label="Discount" value={<MoneyDisplay value={previewQuery.data.discount} />} />
                                <Row label="Tax" value={<MoneyDisplay value={previewQuery.data.tax} />} />
                                <Row label="Initial total" value={<MoneyDisplay value={previewQuery.data.total} />} bold />
                                <Row label="Billing start" value={<BillingDateDisplay date={previewQuery.data.billingStart} />} />
                                <Row label="Next renewal" value={<BillingDateDisplay date={previewQuery.data.nextRenewal} />} />
                            </div>
                        ) : null}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button variant="outline" size="sm" onClick={goBack}>Back</Button>
                            <Button size="sm" onClick={goNext} className="gap-1.5" disabled={!previewQuery.data}>Continue <ArrowRight className="h-3.5 w-3.5" /></Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 'Confirm' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-5 p-5">
                        <p className="text-sm text-slate-600">
                            Confirming will create a Production subscription for <span className="font-semibold">{selectedIds.length}</span> assets
                            on the <span className="font-semibold">{selectedPlan?.name}</span> plan, billed {billingCycle.toLowerCase()}.
                        </p>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button variant="outline" size="sm" onClick={goBack}>Back</Button>
                            <Button size="sm" disabled={convertMutation.isPending} onClick={() => convertMutation.mutate()} className="gap-1.5">
                                {convertMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm Conversion
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
    return (
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <span className="text-slate-500">{label}</span>
            <span className={bold ? 'font-bold text-slate-900' : 'text-slate-700'}>{value}</span>
        </div>
    )
}
