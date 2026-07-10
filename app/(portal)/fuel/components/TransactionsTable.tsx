'use client'

import { useMemo, useState } from 'react'
import { Search, Trash2, SlidersHorizontal, MoreVertical, FileText, Truck, CreditCard, Banknote } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TX_TYPE_META, type TransactionRow, type TxType } from './useFuelTransactions'

interface TransactionsTableProps {
    rows: TransactionRow[]
    isLoading?: boolean
}

const PILLS: { key: 'all' | TxType; label: string }[] = [
    { key: 'all', label: 'All Transactions' },
    { key: 'purchase', label: 'Fuel Purchases' },
    { key: 'refill', label: 'Refills' },
    { key: 'adjustment', label: 'Adjustments' },
    { key: 'drain', label: 'Drains' },
]

const PAGE_SIZE = 10
const fmtNaira = (n: number | null) => (n == null ? '—' : `₦${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

function PaymentCell({ method }: { method: TransactionRow['payment'] }) {
    if (method === 'cash') {
        return (
            <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Banknote className="h-4 w-4 text-emerald-500" /> Cash
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
            <CreditCard className="h-4 w-4 text-blue-500" /> Fleet Card
        </span>
    )
}

export function TransactionsTable({ rows, isLoading }: TransactionsTableProps) {
    const [pill, setPill] = useState<'all' | TxType>('all')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter((r) => {
            if (pill !== 'all' && r.type !== pill) return false
            if (!q) return true
            return (
                r.vehicle.toLowerCase().includes(q) ||
                r.driver.toLowerCase().includes(q) ||
                r.station.toLowerCase().includes(q)
            )
        })
    }, [rows, pill, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const clampedPage = Math.min(page, totalPages)
    const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE)

    return (
        <Card className="flex h-full flex-col rounded-2xl border-slate-100 p-0 shadow-none">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    {PILLS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => { setPill(p.key); setPage(1) }}
                            className={cn(
                                'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-200',
                                pill === p.key ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50',
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full lg:w-56">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Search transactions..."
                            className="h-9 border-slate-200 bg-slate-50 pl-8 text-sm"
                            aria-label="Search transactions"
                        />
                    </div>
                    <button type="button" aria-label="Delete selected" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors duration-200 hover:bg-slate-50">
                        <Trash2 className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Column settings" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors duration-200 hover:bg-slate-50">
                        <SlidersHorizontal className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            <th className="px-4 py-3">Date &amp; Time</th>
                            <th className="px-4 py-3">Vehicle</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Fuel Station / Location</th>
                            <th className="px-4 py-3">Driver</th>
                            <th className="px-4 py-3">Volume (L)</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Price / L</th>
                            <th className="px-4 py-3">Payment Method</th>
                            <th className="px-4 py-3">Receipt</th>
                            <th className="w-10 px-4 py-3" aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i}><td colSpan={11} className="px-4 py-3"><div className="h-8 w-full animate-pulse rounded bg-slate-50" /></td></tr>
                            ))
                        ) : pageRows.length === 0 ? (
                            <tr><td colSpan={11} className="px-4 py-16 text-center text-slate-400">No transactions found.</td></tr>
                        ) : (
                            pageRows.map((r) => {
                                const meta = TX_TYPE_META[r.type]
                                const negative = (r.volumeLiters ?? 0) < 0
                                return (
                                    <tr key={r.id} className="align-middle hover:bg-slate-50/60">
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
                                            {r.volumeLiters != null ? `${r.volumeLiters} L` : '—'}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-700">{fmtNaira(r.amountNaira)}</td>
                                        <td className="px-4 py-3 text-slate-600">{r.pricePerLiter != null ? fmtNaira(r.pricePerLiter) : '—'}</td>
                                        <td className="px-4 py-3"><PaymentCell method={r.payment} /></td>
                                        <td className="px-4 py-3">
                                            <FileText className={cn('h-4 w-4', r.hasReceipt ? 'text-rose-500' : 'text-slate-300')} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <button type="button" aria-label={`Actions for ${r.vehicle}`} className="rounded-md p-1 text-slate-300 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-500">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
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
                    Showing {filtered.length === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1} to{' '}
                    {Math.min(clampedPage * PAGE_SIZE, filtered.length)} of {filtered.length} transactions
                </span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={clampedPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ‹
                    </button>
                    {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setPage(i + 1)}
                            className={cn(
                                'flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[12px] font-medium transition-colors duration-200',
                                clampedPage === i + 1 ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button
                        type="button"
                        disabled={clampedPage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ›
                    </button>
                </div>
            </div>
        </Card>
    )
}
