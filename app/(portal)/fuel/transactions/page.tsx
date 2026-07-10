'use client'

import { Upload, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/shared/QueryError'
import { FuelTabs } from '../components/FuelTabs'
import { TxKpiCards } from '../components/TxKpiCards'
import { TransactionsTable } from '../components/TransactionsTable'
import { TransactionFilters } from '../components/TransactionFilters'
import { useFuelTransactions } from '../components/useFuelTransactions'

export default function FuelTransactionsPage() {
    const { rows, kpis, isLoading, isError } = useFuelTransactions()

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Transactions</h1>
                    <p className="mt-1 text-sm text-slate-500">View and manage all fuel purchases, refills, drains and adjustments.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9 gap-2 shadow-none">
                        <Upload className="h-4 w-4" /> Export
                    </Button>
                    <Button size="sm" className="h-9 gap-2 bg-blue-600 text-white shadow-none hover:bg-blue-700">
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
                        <div className="xl:col-span-3">
                            <TransactionsTable rows={rows} isLoading={isLoading} />
                        </div>
                        <div className="xl:col-span-1">
                            <TransactionFilters />
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
