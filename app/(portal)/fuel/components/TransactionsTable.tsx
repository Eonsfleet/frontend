'use client'

import { useMemo, useState } from 'react'
import { Search, FileText, Truck, Eye, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TX_TYPE_META, type FuelTransactionFilters, type TransactionRow, type TxType } from './useFuelTransactions'
import type { FuelPagination } from '@/lib/api/fuel'

interface TransactionsTableProps {
    rows: TransactionRow[]
    isLoading?: boolean
    filters: FuelTransactionFilters
    pagination: FuelPagination
    onFiltersChange: (filters: FuelTransactionFilters) => void
    onViewRow: (row: TransactionRow) => void
    onEditRow: (row: TransactionRow) => void
    onDeleteRows: (rows: TransactionRow[]) => void
    onBulkEditRows: (rows: TransactionRow[]) => void
}

const PILLS: { key: 'all' | TxType; label: string }[] = [
    { key: 'all', label: 'All Transactions' },
    { key: 'refill', label: 'Refills' },
    { key: 'theft', label: 'Theft' },
    { key: 'leakage', label: 'Leakage' },
]

const STATUS_LABEL: Record<TransactionRow['status'], string> = {
    pending_approval: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    reimbursed: 'Reimbursed',
}

const STATUS_CLASS: Record<TransactionRow['status'], string> = {
    pending_approval: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-rose-50 text-rose-700',
    reimbursed: 'bg-blue-50 text-blue-700',
}

const fmtNaira = (n: number | null) => (n == null ? '-' : `NGN ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

export function TransactionsTable({
    rows,
    isLoading,
    filters,
    pagination,
    onFiltersChange,
    onViewRow,
    onEditRow,
    onDeleteRows,
    onBulkEditRows,
}: TransactionsTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const totalPages = Math.max(1, pagination.last_page)
    const clampedPage = Math.min(filters.page, totalPages)
    const pageWindowStart = Math.max(1, Math.min(clampedPage - 2, Math.max(1, totalPages - 4)))
    const pageNumbers = Array.from(
        { length: Math.min(5, totalPages - pageWindowStart + 1) },
        (_, index) => pageWindowStart + index,
    )
    const manageableRows = useMemo(() => rows.filter((row) => row.canManage), [rows])
    const selectedRows = useMemo(
        () => manageableRows.filter((row) => selectedIds.includes(row.id)),
        [manageableRows, selectedIds],
    )
    const allRowsSelected = manageableRows.length > 0 && manageableRows.every((row) => selectedIds.includes(row.id))
    const someRowsSelected = selectedRows.length > 0 && !allRowsSelected

    const updateFilters = (next: Partial<FuelTransactionFilters>) => {
        onFiltersChange({ ...filters, ...next })
    }

    const toggleRow = (row: TransactionRow) => {
        if (!row.canManage) return
        setSelectedIds((current) => (
            current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id]
        ))
    }

    const toggleAllRows = () => {
        setSelectedIds((current) => {
            if (allRowsSelected) return current.filter((id) => !manageableRows.some((row) => row.id === id))
            const next = new Set(current)
            manageableRows.forEach((row) => next.add(row.id))
            return Array.from(next)
        })
    }

    const selectedCount = selectedRows.length

    return (
        <Card className="flex h-full flex-col rounded-2xl border-slate-100 p-0 shadow-none">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {PILLS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => updateFilters({ type: p.key, page: 1 })}
                            className={cn(
                                'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-200',
                                filters.type === p.key ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50',
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {selectedCount > 0 && (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                            <span className="text-[12px] font-medium text-slate-600">{selectedCount} selected</span>
                            <button
                                type="button"
                                onClick={() => onBulkEditRows(selectedRows)}
                                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-blue-600 hover:bg-white"
                            >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => onDeleteRows(selectedRows)}
                                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-rose-600 hover:bg-white"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                        </div>
                    )}
                    <div className="relative w-full lg:w-56">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={filters.search}
                            onChange={(e) => updateFilters({ search: e.target.value, page: 1 })}
                            placeholder="Search transactions..."
                            className="h-9 border-slate-200 bg-slate-50 pl-8 text-sm"
                            aria-label="Search transactions"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[1280px] whitespace-nowrap text-left text-[13px]">
                    <thead className="sticky top-0 z-10 bg-white">
                        <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <th className="w-10 px-4 py-3">
                                <input
                                    type="checkbox"
                                    aria-label="Select all transactions on this page"
                                    checked={allRowsSelected}
                                    ref={(input) => {
                                        if (input) input.indeterminate = someRowsSelected
                                    }}
                                    onChange={toggleAllRows}
                                    disabled={manageableRows.length === 0}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                />
                            </th>
                            <th className="px-4 py-3">Date &amp; Time</th>
                            <th className="px-4 py-3">Vehicle</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Fuel Station / Location</th>
                            <th className="px-4 py-3">Driver</th>
                            <th className="px-4 py-3">Volume (L)</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Price / L</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Receipt</th>
                            <th className="w-28 px-4 py-3" aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i}><td colSpan={12} className="px-4 py-3"><div className="h-8 w-full animate-pulse rounded bg-slate-50" /></td></tr>
                            ))
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={12} className="px-4 py-16 text-center text-slate-400">No transactions found.</td></tr>
                        ) : (
                            rows.map((r) => {
                                const meta = TX_TYPE_META[r.type]
                                const negative = (r.volumeLiters ?? 0) < 0
                                const selected = selectedIds.includes(r.id)
                                return (
                                    <tr key={r.id} className="align-middle hover:bg-slate-50/60">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                aria-label={`Select transaction for ${r.vehicle}`}
                                                checked={selected}
                                                onChange={() => toggleRow(r)}
                                                disabled={!r.canManage}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 disabled:opacity-30"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">{r.date}</div>
                                            <div className="text-[11px] text-slate-400">{r.time}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                                    <Truck className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate font-semibold text-slate-900">{r.vehicle}</div>
                                                    <div className="truncate text-[11px] text-slate-400">{r.vehicleModel}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', meta.badge)}>{meta.label}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{r.station}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                                                    {r.driver.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                                </span>
                                                <span className="text-slate-700">{r.driver}</span>
                                            </div>
                                        </td>
                                        <td className={cn('px-4 py-3 font-medium', negative ? 'text-rose-600' : 'text-slate-700')}>
                                            {r.volumeLiters != null ? `${r.volumeLiters} L` : '-'}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">{fmtNaira(r.amountNaira)}</td>
                                        <td className="px-4 py-3 text-slate-600">{r.pricePerLiter != null ? fmtNaira(r.pricePerLiter) : '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_CLASS[r.status])}>{STATUS_LABEL[r.status]}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <FileText className={cn('h-4 w-4', r.hasReceipt ? 'text-rose-500' : 'text-slate-300')} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button type="button" aria-label={`View ${r.vehicle}`} onClick={() => onViewRow(r)} className="rounded-md p-1.5 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button type="button" aria-label={`Edit ${r.vehicle}`} disabled={!r.canManage} onClick={() => onEditRow(r)} className="rounded-md p-1.5 text-slate-400 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button type="button" aria-label={`Delete ${r.vehicle}`} disabled={!r.canManage} onClick={() => onDeleteRows([r])} className="rounded-md p-1.5 text-slate-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                    Showing {pagination.total === 0 ? 0 : (clampedPage - 1) * pagination.per_page + 1} to{' '}
                    {Math.min(clampedPage * pagination.per_page, pagination.total)} of {pagination.total} transactions
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={clampedPage <= 1}
                        onClick={() => updateFilters({ page: Math.max(1, clampedPage - 1) })}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        &lt;
                    </button>
                    {pageNumbers.map((pageNumber) => (
                        <button
                            key={pageNumber}
                            type="button"
                            onClick={() => updateFilters({ page: pageNumber })}
                            className={cn(
                                'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12px] font-medium transition-colors duration-200',
                                clampedPage === pageNumber ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            {pageNumber}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={clampedPage >= totalPages}
                        onClick={() => updateFilters({ page: Math.min(totalPages, clampedPage + 1) })}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        &gt;
                    </button>
                </div>
            </div>
        </Card>
    )
}