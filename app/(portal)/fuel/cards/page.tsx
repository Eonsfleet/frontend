'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    Loader2, CreditCard, Plus, Car, CheckCircle2, XCircle,
    AlertCircle, Link2, FileText, Upload,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/fuel'
import { getVehicles } from '@/lib/api/vehicles'
import { FuelCardAccount, FuelCardTransaction } from '@/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ── Standardized Table Pagination ───────────────────────────────────────────

interface TablePaginationProps {
    pagination?: {
        current_page: number
        last_page: number
        total: number
    }
    onPageChange: (page: number) => void
    variant?: 'default' | 'simple'
}

function TablePagination({ pagination, onPageChange, variant = 'default' }: TablePaginationProps) {
    if (!pagination || pagination.last_page <= 1) return null

    if (variant === 'simple') {
        return (
            <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-slate-500 font-medium">Page {pagination.current_page} of {pagination.last_page}</p>
                <div className="flex gap-2">
                    <Button
                        size="sm" variant="outline"
                        className="h-8 px-3 text-xs"
                        disabled={pagination.current_page <= 1}
                        onClick={() => onPageChange(pagination.current_page - 1)}
                    >
                        Previous
                    </Button>
                    <Button
                        size="sm" variant="outline"
                        className="h-8 px-3 text-xs"
                        disabled={pagination.current_page >= pagination.last_page}
                        onClick={() => onPageChange(pagination.current_page + 1)}
                    >
                        Next
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                Page {pagination.current_page} of {pagination.last_page} &nbsp;·&nbsp; {pagination.total} records
            </p>
            <div className="flex gap-2">
                <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs font-bold uppercase tracking-wider"
                    disabled={pagination.current_page <= 1}
                    onClick={() => onPageChange(pagination.current_page - 1)}
                >
                    Previous
                </Button>
                <Button
                    size="sm" variant="outline"
                    className="h-8 px-3 text-xs font-bold uppercase tracking-wider"
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => onPageChange(pagination.current_page + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}

// ── Account status badge ──────────────────────────────────────────────────────

function AccountStatusBadge({ status }: { status: FuelCardAccount['status'] }) {
    switch (status) {
        case 'active': return <Badge className="bg-emerald-100 text-emerald-800 border-none">● Active</Badge>
        case 'pending': return <Badge className="bg-amber-100 text-amber-800 border-none">● Pending</Badge>
        case 'suspended': return <Badge className="bg-rose-100 text-rose-800 border-none">● Suspended</Badge>
        case 'rejected': return <Badge className="bg-rose-100 text-rose-800 border-none">● Rejected</Badge>
    }
}

function CardStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'issued': return <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Issued</Badge>
        case 'blocked': return <Badge className="bg-rose-100 text-rose-800 border-none text-[10px]">Blocked</Badge>
        default: return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Requested</Badge>
    }
}

// ── Transaction status badge ──────────────────────────────────────────────────

function TxnStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'matched': return <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">Matched</Badge>
        case 'linked': return <Badge className="bg-blue-100 text-blue-800 border-none text-[10px]">Linked</Badge>
        default: return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Unmatched</Badge>
    }
}

// ── Setup wizard ──────────────────────────────────────────────────────────────

const setupSchema = z.object({
    provider_type: z.enum(['ovh', 'total', 'generic_csv']),
    account_name: z.string().min(1, 'Account name is required'),
    virtual_account_number: z.string().optional(),
    contact_name: z.string().optional(),
    contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
    contact_phone: z.string().optional(),
})
type SetupForm = z.infer<typeof setupSchema>

function SetupWizard({ onSuccess }: { onSuccess: () => void }) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState(1)
    const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([])
    const [formData, setFormData] = useState<SetupForm | null>(null)

    const { data: providerTypesData, isLoading: isLoadingProviders } = useQuery({
        queryKey: ['fuel-card-provider-types'],
        queryFn: () => api.getFuelCardProviderTypes(),
    })

    const { data: vehiclesData } = useQuery({
        queryKey: ['vehicles', 1, ''],
        queryFn: () => getVehicles({ per_page: 100 }),
    })

    const { register, handleSubmit, watch, formState: { errors } } = useForm<SetupForm>({
        resolver: zodResolver(setupSchema),
        defaultValues: { provider_type: 'total' },
    })

    const providerType = watch('provider_type')

    const { mutate: submit, isPending } = useMutation({
        mutationFn: (d: SetupForm) => api.createFuelCardAccount({
            ...d,
            vehicle_ids: selectedVehicleIds.map(Number),
        }),
        onSuccess: () => {
            toast.success('Fuel card account request submitted. The EonsFleet team will activate it shortly.')
            queryClient.invalidateQueries({ queryKey: ['fuel-card-account'] })
            onSuccess()
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const providerLabels: Record<string, string> = {
        ovh: 'OVH Fleet Card',
        total: 'TotalEnergies Fleet Card',
        generic_csv: 'Generic CSV Import',
    }

    const toggleVehicle = (id: string) =>
        setSelectedVehicleIds(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        )

    if (step === 1) {
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">Step 1 — Choose Provider</h3>
                    <p className="text-sm text-slate-500">Select your fuel card provider type.</p>
                </div>
                {isLoadingProviders ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(providerTypesData?.data?.provider_types ?? [
                            { slug: 'total', label: 'TotalEnergies Fleet Card' },
                            { slug: 'ovh', label: 'OVH Fleet Card' },
                            { slug: 'generic_csv', label: 'Generic CSV Import' },
                        ]).map((p) => (
                            <button
                                key={p.slug}
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({ ...prev!, provider_type: p.slug as SetupForm['provider_type'] }))
                                    setStep(2)
                                }}
                                className="p-4 border-2 rounded-xl text-left hover:border-emerald-500 hover:bg-emerald-50/30 transition-all"
                            >
                                <div className="font-semibold text-slate-900 text-sm">{p.label}</div>
                                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{p.slug}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    if (step === 2) {
        return (
            <form onSubmit={handleSubmit((d) => { setFormData(d); setStep(3) })} className="space-y-6">
                <div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">Step 2 — Account Details</h3>
                    <p className="text-sm text-slate-500">Provide your organization&apos;s fuel card account information.</p>
                </div>
                <input type="hidden" {...register('provider_type')} value={formData?.provider_type ?? providerType} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <Label>Account Name *</Label>
                        <Input {...register('account_name')} placeholder="e.g. EonsFleet Total Card" className="mt-1.5" />
                        {errors.account_name && <p className="text-xs text-rose-500 mt-1">{errors.account_name.message}</p>}
                    </div>
                    <div>
                        <Label>Virtual Acct No. <span className="text-slate-400">(if issued)</span></Label>
                        <Input {...register('virtual_account_number')} placeholder="VAN-00193" className="mt-1.5" />
                    </div>
                    <div>
                        <Label>Contact Name</Label>
                        <Input {...register('contact_name')} placeholder="Full name" className="mt-1.5" />
                    </div>
                    <div>
                        <Label>Contact Email</Label>
                        <Input {...register('contact_email')} type="email" placeholder="contact@org.com" className="mt-1.5" />
                        {errors.contact_email && <p className="text-xs text-rose-500 mt-1">{errors.contact_email.message}</p>}
                    </div>
                    <div>
                        <Label>Contact Phone</Label>
                        <Input {...register('contact_phone')} placeholder="+2348012345678" className="mt-1.5" />
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Next: Enrol Vehicles</Button>
                </div>
            </form>
        )
    }

    // Step 3 — Enrol Vehicles
    const vehicles = vehiclesData?.data ?? []
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">Step 3 — Enrol Vehicles</h3>
                <p className="text-sm text-slate-500">Select vehicles to be enrolled in this fuel card account.</p>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {vehicles.map(v => {
                    const selected = selectedVehicleIds.includes(v.id)
                    return (
                        <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleVehicle(v.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${selected ? 'bg-emerald-50/50' : ''}`}
                        >
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <Car className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{v.attributes.registration_number}</p>
                                <p className="text-xs text-slate-500">{v.attributes.make} {v.attributes.model}</p>
                            </div>
                        </button>
                    )
                })}
            </div>
            {selectedVehicleIds.length > 0 && (
                <p className="text-sm text-emerald-700 font-medium">{selectedVehicleIds.length} vehicle{selectedVehicleIds.length !== 1 ? 's' : ''} selected</p>
            )}
            <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={selectedVehicleIds.length === 0 || isPending || !formData}
                    onClick={() => formData && submit(formData)}
                >
                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Request
                </Button>
            </div>
        </div>
    )
}

// ── Active account view ───────────────────────────────────────────────────────

function ActiveAccountView({ account }: { account: FuelCardAccount }) {
    const queryClient = useQueryClient()

    const { mutate: removeVehicle } = useMutation({
        mutationFn: (vehicleId: number) => api.removeVehicleFromAccount(account.id, vehicleId),
        onSuccess: () => {
            toast.success('Vehicle removed from account.')
            queryClient.invalidateQueries({ queryKey: ['fuel-card-account'] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const providerLabels: Record<string, string> = {
        ovh: 'OVH Fleet Card',
        total: 'TotalEnergies Fleet Card',
        generic_csv: 'Generic CSV Import',
    }

    return (
        <div className="space-y-6">
            {account.status === 'pending' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>Your fuel card account request has been submitted. The EonsFleet team will activate it shortly.</p>
                </div>
            )}
            {account.status === 'rejected' && account.rejection_reason && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">
                    <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p><strong>Rejected:</strong> {account.rejection_reason}</p>
                </div>
            )}

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="border-b border-slate-100 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold">{account.account_name}</CardTitle>
                            <p className="text-sm text-slate-500 mt-0.5">{providerLabels[account.provider_type] ?? account.provider_type}</p>
                        </div>
                        <AccountStatusBadge status={account.status} />
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Virtual Acct</p>
                            <p className="font-medium text-slate-900">{account.virtual_account_number ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Contact</p>
                            <p className="font-medium text-slate-900">{account.contact_name ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                            <p className="font-medium text-slate-900 truncate">{account.contact_email ?? '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Requested</p>
                            <p className="font-medium text-slate-900">{format(new Date(account.requested_at), 'MMM dd, yyyy')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="border-b border-slate-100 py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">
                            Enrolled Vehicles ({account.vehicles.length})
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {account.vehicles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <Car className="h-8 w-8 mb-2" />
                            <p className="text-sm">No vehicles enrolled yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3">Vehicle</th>
                                        <th className="px-5 py-3">Card Status</th>
                                        <th className="px-5 py-3">Card No.</th>
                                        <th className="px-5 py-3">Enrolled</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {account.vehicles.map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50">
                                            <td className="px-5 py-3">
                                                <div className="font-semibold text-slate-900">{v.registration_number}</div>
                                                <div className="text-xs text-slate-400">{v.make} {v.model}</div>
                                            </td>
                                            <td className="px-5 py-3"><CardStatusBadge status={v.card_status} /></td>
                                            <td className="px-5 py-3 font-mono text-slate-700">
                                                {v.card_number_last4 ? `****${v.card_number_last4}` : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-slate-500 text-xs">
                                                {format(new Date(v.assigned_at), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Button
                                                    size="sm" variant="ghost"
                                                    className="h-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
                                                    onClick={() => removeVehicle(v.id)}
                                                >
                                                    Remove
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

// ── Transactions tab ──────────────────────────────────────────────────────────

function LinkVehicleDialog({ transaction, onClose }: { transaction: FuelCardTransaction | null; onClose: () => void }) {
    const queryClient = useQueryClient()
    const [vehicleId, setVehicleId] = useState('')

    const { data: vehiclesData } = useQuery({
        queryKey: ['vehicles', 1, ''],
        queryFn: () => getVehicles({ per_page: 100 }),
        enabled: !!transaction,
    })

    const { mutate, isPending } = useMutation({
        mutationFn: () => api.linkTransactionToVehicle(transaction!.id, Number(vehicleId)),
        onSuccess: () => {
            toast.success('Vehicle linked to transaction.')
            queryClient.invalidateQueries({ queryKey: ['card-transactions'] })
            onClose()
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    return (
        <Dialog open={!!transaction} onOpenChange={() => { setVehicleId(''); onClose() }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Link Vehicle to Transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label>Select Vehicle</Label>
                        <select
                            value={vehicleId}
                            onChange={e => setVehicleId(e.target.value)}
                            className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Choose vehicle...</option>
                            {vehiclesData?.data?.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.attributes.registration_number} — {v.attributes.make} {v.attributes.model}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setVehicleId(''); onClose() }}>Cancel</Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={!vehicleId || isPending}
                        onClick={() => mutate()}
                    >
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Link Vehicle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function TransactionsTab() {
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [linkTarget, setLinkTarget] = useState<FuelCardTransaction | null>(null)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['card-transactions', { page, startDate, endDate }],
        queryFn: () => api.getCardTransactions({ page, per_page: 15, start_date: startDate || undefined, end_date: endDate || undefined }),
    })

    const { mutate: createExpense } = useMutation({
        mutationFn: (id: string) => api.createExpenseFromTransaction(id),
        onSuccess: () => {
            toast.success('Expense created from transaction.')
            queryClient.invalidateQueries({ queryKey: ['card-transactions'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expenses'] })
        },
        onError: (err) => toast.error(extractApiError(err)),
    })

    const transactions = data?.data?.fuel_card_transactions ?? []
    const pagination = data?.data?.pagination

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2">
                    <Input type="date" className="h-9 w-36 bg-slate-50 border-slate-200 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <span className="text-slate-400 self-center">→</span>
                    <Input type="date" className="h-9 w-36 bg-slate-50 border-slate-200 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" className="shadow-sm">
                    <Upload className="mr-2 h-4 w-4" /> Ingest CSV
                </Button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3.5">Date</th>
                                        <th className="px-5 py-3.5">Merchant</th>
                                        <th className="px-5 py-3.5">Card</th>
                                        <th className="px-5 py-3.5 whitespace-nowrap">Vol (L)</th>
                                        <th className="px-5 py-3.5">Amount</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                                                <CreditCard className="h-8 w-8 mx-auto mb-2" />
                                                <p className="text-sm">No card transactions found.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        transactions.map(txn => (
                                            <tr key={txn.id} className="hover:bg-slate-50">
                                                <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                                                    {format(new Date(txn.attributes.transaction_date), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="font-medium text-slate-900">{txn.attributes.merchant_name}</div>
                                                    <div className="text-xs text-slate-400 capitalize">{txn.attributes.provider}</div>
                                                </td>
                                                <td className="px-5 py-3.5 font-mono text-slate-600">
                                                    ****{txn.attributes.card_number_last4}
                                                </td>
                                                <td className="px-5 py-3.5 font-mono">{(txn.attributes.volume_liters ?? 0).toFixed(1)} L</td>
                                                <td className="px-5 py-3.5 font-mono font-medium">
                                                    ₦{(txn.attributes.amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </td>
                                                <td className="px-5 py-3.5"><TxnStatusBadge status={txn.attributes.status} /></td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {txn.attributes.status === 'unmatched' && (
                                                            <>
                                                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setLinkTarget(txn)}>
                                                                    <Link2 className="h-3 w-3" /> Link Vehicle
                                                                </Button>
                                                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => createExpense(txn.id)}>
                                                                    <FileText className="h-3 w-3" /> → Expense
                                                                </Button>
                                                            </>
                                                        )}
                                                        {txn.attributes.status === 'matched' && (
                                                            <span className="text-xs text-emerald-600 font-medium">Linked: VID {txn.attributes.vehicle_id}</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <TablePagination pagination={pagination} onPageChange={setPage} />
                </CardContent>
            </Card>

            <LinkVehicleDialog transaction={linkTarget} onClose={() => setLinkTarget(null)} />
        </div>
    )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FuelCardsPage() {
    const [showSetup, setShowSetup] = useState(false)

    const { data, isLoading, error } = useQuery({
        queryKey: ['fuel-card-account'],
        queryFn: () => api.getFuelCardAccount(),
        retry: (count, err: any) => err?.response?.status !== 404 && count < 2,
    })

    const account = data?.data?.account
    const noAccount = !isLoading && (!account || (error as any)?.response?.status === 404)

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Card Management</h1>
                    <p className="text-slate-500 mt-1">Manage your organization&apos;s fuel card account and track card transactions.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
            ) : noAccount || showSetup ? (
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-base font-semibold">
                            {showSetup ? 'Set Up Fuel Card Account' : 'No Fuel Card Account'}
                        </CardTitle>
                        {!showSetup && (
                            <CardDescription>Set up your organization&apos;s fuel card account to start tracking card transactions automatically.</CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="p-6">
                        {showSetup ? (
                            <SetupWizard onSuccess={() => setShowSetup(false)} />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                    <CreditCard className="h-8 w-8 text-emerald-600" />
                                </div>
                                <p className="text-slate-500 max-w-sm mb-6">Set up your organization&apos;s fuel card account to start tracking card transactions automatically.</p>
                                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowSetup(true)}>
                                    <Plus className="mr-2 h-4 w-4" /> Set Up Fuel Card Account
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : account ? (
                <Tabs defaultValue="account" className="space-y-6">
                    <TabsList className="bg-slate-100/50 p-1">
                        <TabsTrigger value="account" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Account Setup</TabsTrigger>
                        <TabsTrigger value="transactions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Transactions</TabsTrigger>
                    </TabsList>

                    <TabsContent value="account">
                        <ActiveAccountView account={account} />
                    </TabsContent>

                    <TabsContent value="transactions">
                        <TransactionsTab />
                    </TabsContent>
                </Tabs>
            ) : null}
        </div>
    )
}
