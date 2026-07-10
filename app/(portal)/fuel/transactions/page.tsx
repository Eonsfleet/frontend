'use client'

import { useState } from 'react'
import { Loader2, Upload, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QueryError } from '@/components/shared/QueryError'
import { FuelTabs } from '../components/FuelTabs'
import { TxKpiCards } from '../components/TxKpiCards'
import { TransactionsTable } from '../components/TransactionsTable'
import { TransactionFilters } from '../components/TransactionFilters'
import { useFuelTransactions, type FuelTransactionFilters } from '../components/useFuelTransactions'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { createFuelExpense, exportFuelExpenses, getFuelVehicles } from '@/lib/api/fuel'
import { getDrivers } from '@/lib/api/drivers'
import { extractApiError } from '@/lib/utils'

interface ExpenseForm {
    vehicleId: string
    userId: string
    volume: string
    costPerVolume: string
    entryDate: string
    currency: string
    fuelTransactionId: string
    purchaseFrom: string
    receiptUrl: string
    referenceNumber: string
    status: 'pending_approval' | 'approved' | 'rejected' | 'reimbursed'
}

const defaultExpenseForm = (): ExpenseForm => ({
    vehicleId: '',
    userId: '',
    volume: '',
    costPerVolume: '',
    entryDate: format(new Date(), 'yyyy-MM-dd'),
    currency: 'NGN',
    fuelTransactionId: '',
    purchaseFrom: '',
    receiptUrl: '',
    referenceNumber: '',
    status: 'pending_approval',
})

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

function AddFuelExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const queryClient = useQueryClient()
    const [form, setForm] = useState<ExpenseForm>(defaultExpenseForm)

    const vehiclesQuery = useQuery({
        queryKey: ['fuel-transaction-create-vehicles'],
        queryFn: () => getFuelVehicles({ per_page: 200 }),
        enabled: open,
    })
    const driversQuery = useQuery({
        queryKey: ['fuel-transaction-create-drivers'],
        queryFn: () => getDrivers({ per_page: 200 }),
        enabled: open,
    })

    const createMutation = useMutation({
        mutationFn: () => {
            const vehicleId = Number(form.vehicleId)
            const userId = Number(form.userId)
            const volume = Number(form.volume)
            const costPerVolume = Number(form.costPerVolume)
            const fuelTransactionId = form.fuelTransactionId ? Number(form.fuelTransactionId) : null

            if (!vehicleId || !userId || !volume || !costPerVolume || !form.entryDate) {
                throw new Error('Vehicle, driver, volume, cost per litre, and date are required.')
            }
            if (form.fuelTransactionId && !Number.isFinite(fuelTransactionId)) {
                throw new Error('Fuel transaction ID must be a valid number.')
            }

            return createFuelExpense({
                vehicle_id: vehicleId,
                user_id: userId,
                volume,
                cost_per_volume: costPerVolume,
                entry_date: form.entryDate,
                currency: form.currency.trim() || null,
                fuel_transaction_id: fuelTransactionId,
                purchase_from: form.purchaseFrom.trim() || null,
                receipt_url: form.receiptUrl.trim() || null,
                reference_number: form.referenceNumber.trim() || null,
                status: form.status,
            })
        },
        onSuccess: () => {
            toast.success('Fuel expense created.')
            queryClient.invalidateQueries({ queryKey: ['fuel-transactions'] })
            queryClient.invalidateQueries({ queryKey: ['fuel-expense-metrics'] })
            setForm(defaultExpenseForm())
            onOpenChange(false)
        },
        onError: (error) => toast.error(extractApiError(error, 'Failed to create fuel expense.')),
    })

    const updateForm = (key: keyof ExpenseForm, value: string) => {
        setForm((current) => ({ ...current, [key]: value }))
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) setForm(defaultExpenseForm())
                onOpenChange(nextOpen)
            }}
        >
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Fuel Transaction</DialogTitle>
                </DialogHeader>

                <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <Label>Vehicle</Label>
                        <select
                            value={form.vehicleId}
                            onChange={(event) => updateForm('vehicleId', event.target.value)}
                            className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
                        >
                            <option value="">Select vehicle...</option>
                            {(vehiclesQuery.data?.data.vehicles ?? []).map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                    {vehicle.attributes.registration_number} - {vehicle.attributes.make} {vehicle.attributes.model}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sm:col-span-2">
                        <Label>Driver</Label>
                        <select
                            value={form.userId}
                            onChange={(event) => updateForm('userId', event.target.value)}
                            className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
                        >
                            <option value="">Select driver...</option>
                            {(driversQuery.data?.data ?? []).map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                    {driver.attributes.full_name || `${driver.attributes.first_name} ${driver.attributes.last_name}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label>Volume (L)</Label>
                        <Input value={form.volume} onChange={(event) => updateForm('volume', event.target.value)} type="number" step="0.01" className="mt-1.5" />
                    </div>
                    <div>
                        <Label>Cost per Litre</Label>
                        <Input value={form.costPerVolume} onChange={(event) => updateForm('costPerVolume', event.target.value)} type="number" step="0.01" className="mt-1.5" />
                    </div>
                    <div>
                        <Label>Entry Date</Label>
                        <Input value={form.entryDate} onChange={(event) => updateForm('entryDate', event.target.value)} type="date" className="mt-1.5" />
                    </div>
                    <div>
                        <Label>Currency</Label>
                        <Input value={form.currency} onChange={(event) => updateForm('currency', event.target.value.toUpperCase().slice(0, 3))} maxLength={3} className="mt-1.5" />
                    </div>
                    <div>
                        <Label>Status</Label>
                        <select
                            value={form.status}
                            onChange={(event) => updateForm('status', event.target.value)}
                            className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
                        >
                            <option value="pending_approval">Pending Approval</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="reimbursed">Reimbursed</option>
                        </select>
                    </div>
                    <div>
                        <Label>Fuel Transaction ID</Label>
                        <Input value={form.fuelTransactionId} onChange={(event) => updateForm('fuelTransactionId', event.target.value)} type="number" className="mt-1.5" />
                    </div>
                    <div>
                        <Label>Purchase From</Label>
                        <Input value={form.purchaseFrom} onChange={(event) => updateForm('purchaseFrom', event.target.value)} className="mt-1.5" />
                    </div>
                    <div>
                        <Label>Reference Number</Label>
                        <Input value={form.referenceNumber} onChange={(event) => updateForm('referenceNumber', event.target.value)} className="mt-1.5" />
                    </div>
                    <div className="sm:col-span-2">
                        <Label>Receipt URL</Label>
                        <Input value={form.receiptUrl} onChange={(event) => updateForm('receiptUrl', event.target.value)} className="mt-1.5" />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function FuelTransactionsPage() {
    const [createOpen, setCreateOpen] = useState(false)
    const [filters, setFilters] = useState<FuelTransactionFilters>({
        search: '',
        vehicleId: undefined,
        type: 'all',
        startDate: '',
        endDate: '',
        page: 1,
        perPage: 10,
        exportLimit: 5000,
        sortBy: 'occurred_at',
        orderBy: 'desc',
    })

    const { rows, kpis, pagination, isLoading, isError } = useFuelTransactions(filters)

    const exportMutation = useMutation({
        mutationFn: () => {
            const exportParams = {
                vehicle_id: filters.vehicleId,
                type: filters.type && filters.type !== 'all' ? filters.type : undefined,
                start_date: filters.startDate || undefined,
                end_date: filters.endDate || undefined,
                limit: filters.exportLimit,
            }

            return exportFuelExpenses(exportParams)
        },
        onSuccess: (blob) => {
            downloadBlob(blob, `fuel-expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`)
            toast.success('Fuel expenses export downloaded.')
        },
        onError: (error) => toast.error(extractApiError(error, 'Failed to export fuel expenses.')),
    })

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Transactions</h1>
                    <p className="mt-1 text-sm text-slate-500">View and manage all fuel purchases, refills, drains and adjustments.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
                        {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Export
                    </Button>
                    <Button size="sm" className="h-9 gap-2 bg-blue-600 text-white shadow-none hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-4 w-4" /> Add Transaction
                    </Button>
                </div>
            </div>

            <FuelTabs active="Fuel Transactions" />

            {isError ? (
                <QueryError message="Failed to load fuel transactions." />
            ) : (
                <>
                    <TxKpiCards kpis={kpis} />

                    {/* Table + filters sidebar */}
                    <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-4">
                        <div className="h-[min(560px,calc(100vh-220px))] xl:col-span-3">
                            <TransactionsTable
                                rows={rows}
                                isLoading={isLoading}
                                filters={filters}
                                pagination={pagination}
                                onFiltersChange={setFilters}
                            />
                        </div>
                        <div className="h-[min(560px,calc(100vh-220px))] xl:col-span-1">
                            <TransactionFilters filters={filters} onFiltersChange={setFilters} />
                        </div>
                    </div>
                </>
            )}
            <AddFuelExpenseDialog open={createOpen} onOpenChange={setCreateOpen} />
        </div>
    )
}
