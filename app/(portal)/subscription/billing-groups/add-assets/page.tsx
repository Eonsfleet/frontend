'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    ArrowLeft, ArrowRight, Car, Cpu, CheckCircle2, Loader2, AlertTriangle, Search,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { QueryError } from '@/components/shared/QueryError'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { AddAssetActions } from '@/components/shared/subscription/AddAssetActions'
import { extractApiError, cn } from '@/lib/utils'
import * as api from '@/lib/api/billing-groups'
import type { BillingCycle } from '@/types/subscription'
import { format } from 'date-fns'

const STEPS = ['Select Assets', 'Billing Configuration', 'Cost Preview', 'Confirmation', 'Success'] as const
type Step = (typeof STEPS)[number]

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

export default function AddAssetsPage() {
    const router = useRouter()
    const [stepIndex, setStepIndex] = useState(0)
    const [search, setSearch] = useState('')
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [plan, setPlan] = useState('Standard')
    const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY')
    const [billingStart, setBillingStart] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [confirmed, setConfirmed] = useState(false)
    const [result, setResult] = useState<api.CreateBillingGroupResult | null>(null)

    const step = STEPS[stepIndex]

    const { data: assets, isLoading: isAssetsLoading, isError: isAssetsError, refetch } = useQuery({
        queryKey: ['eligible-assets'],
        queryFn: api.getEligibleAssets,
    })

    const filteredAssets = useMemo(() => {
        if (!assets) return []
        if (!search.trim()) return assets
        const q = search.trim().toLowerCase()
        return assets.filter((a) => a.label.toLowerCase().includes(q) || a.registrationNumber?.toLowerCase().includes(q))
    }, [assets, search])

    const previewQuery = useQuery({
        queryKey: ['billing-group-preview', selectedIds, billingCycle, billingStart],
        queryFn: () => api.previewBillingGroup({ assetIds: selectedIds, billingCycle, billingStart }),
        enabled: step === 'Cost Preview' && selectedIds.length > 0,
    })

    const createMutation = useMutation({
        mutationFn: () => api.createBillingGroup({ assetIds: selectedIds, plan, billingCycle, billingStart }),
        onSuccess: (res) => {
            toast.success(`${selectedIds.length} assets added to a new billing group.`)
            setResult(res)
            setStepIndex(4)
        },
        onError: (err) => toast.error(extractApiError(err, 'Failed to create billing group.')),
    })

    const toggleAsset = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    }

    const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

    return (
        <div className="max-w-4xl space-y-6">
            <Link href="/subscription/billing-groups" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
                <ArrowLeft className="h-4 w-4" /> Billing Groups
            </Link>

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Assets</h1>
                <p className="mt-1 text-sm text-slate-500">Eligible assets you add here form a new billing group with its own renewal date.</p>
            </div>

            {step !== 'Success' && <StepIndicator current={stepIndex} />}

            {/* Step 1: Select Assets */}
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
                            <QueryError message="Failed to load eligible assets." onRetry={refetch} />
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
                            <p className="text-xs text-slate-500">{selectedIds.length} asset{selectedIds.length === 1 ? '' : 's'} selected</p>
                            <Button size="sm" disabled={selectedIds.length === 0} onClick={goNext} className="gap-1.5">
                                Continue <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Billing Configuration */}
            {step === 'Billing Configuration' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-5 p-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>Plan</Label>
                                <select className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={plan} onChange={(e) => setPlan(e.target.value)}>
                                    <option value="Standard">Standard</option>
                                    <option value="Enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Billing cycle</Label>
                                <select
                                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                                    value={billingCycle}
                                    onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                                >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="ANNUAL">Annual</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Billing start date</Label>
                                <Input type="date" value={billingStart} onChange={(e) => setBillingStart(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Currency</Label>
                                <Input value="NGN" disabled />
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button variant="outline" size="sm" onClick={goBack}>Back</Button>
                            <Button size="sm" onClick={goNext} className="gap-1.5">Continue <ArrowRight className="h-3.5 w-3.5" /></Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Cost Preview */}
            {step === 'Cost Preview' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-5 p-5">
                        {previewQuery.isLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                        ) : previewQuery.data ? (
                            <div className="space-y-2 text-sm">
                                <Row label="Selected assets" value={previewQuery.data.assetCount} />
                                <Row label="Unit price" value={<MoneyDisplay value={previewQuery.data.unitPrice} />} />
                                <Row label="Subtotal" value={<MoneyDisplay value={previewQuery.data.subtotal} />} />
                                <Row label="Discount" value={<MoneyDisplay value={previewQuery.data.discount} />} />
                                <Row label="Tax" value={<MoneyDisplay value={previewQuery.data.tax} />} />
                                <Row label="Total due" value={<MoneyDisplay value={previewQuery.data.total} />} bold />
                                <Row label="Billing start" value={<BillingDateDisplay date={previewQuery.data.billingStart} />} />
                                <Row label="Next renewal" value={<BillingDateDisplay date={previewQuery.data.nextRenewal} />} />

                                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800">
                                    These assets will form a new billing group with their own renewal date.
                                </div>
                            </div>
                        ) : null}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button variant="outline" size="sm" onClick={goBack}>Back</Button>
                            <Button size="sm" onClick={goNext} className="gap-1.5" disabled={!previewQuery.data}>Continue <ArrowRight className="h-3.5 w-3.5" /></Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Confirmation */}
            {step === 'Confirmation' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="space-y-5 p-5">
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} className="mt-0.5" />
                            <span className="text-slate-700">
                                I understand that these assets will be billed separately based on this activation date.
                            </span>
                        </label>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <Button variant="outline" size="sm" onClick={goBack}>Back</Button>
                            <Button size="sm" disabled={!confirmed || createMutation.isPending} onClick={() => createMutation.mutate()} className="gap-1.5">
                                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm & Create Billing Group
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 5: Success */}
            {step === 'Success' && result && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-7 w-7" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Billing group created</h2>
                            <p className="mt-1 text-sm text-slate-500">{selectedIds.length} assets are now billed under a new billing group.</p>
                        </div>
                        <div className="w-full max-w-sm space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm">
                            <Row label="Billing group ID" value={result.billingGroupId} />
                            <Row label="Invoice number" value={result.invoiceNumber} />
                            <Row label="Amount" value={<MoneyDisplay value={result.amount} />} />
                            <Row label="Next renewal" value={<BillingDateDisplay date={result.nextRenewal} />} />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/subscription/invoices/${result.invoiceNumber}`)}>Pay invoice</Button>
                            <Button size="sm" onClick={() => router.push(`/subscription/billing-groups/${result.billingGroupId}`)}>View billing group</Button>
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
