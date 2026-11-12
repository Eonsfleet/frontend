'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/shared/QueryError'
import { adjustFuelBudgets, applyFuelBudgetProposals, getFuelBudgets, saveFuelBudgets, type FuelBudgetRow, type FuelScopeFilters } from '@/lib/api/fuelPage'
import { formatNumber } from '@/lib/fuel-format'
import { FuelTabs } from '../../components/FuelTabs'
import { useFuelClusters } from '../../components/useFuelClusters'
import { errorMessage } from '../../components/shared/AlertActions'
import { parseLitres } from '../../components/budget'

const PER_PAGE = 50
const select = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm'

export default function FuelBudgetsPage() {
    const queryClient = useQueryClient()
    const { clusters } = useFuelClusters()
    const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
    const [filters, setFilters] = useState<FuelScopeFilters>({})
    const [page, setPage] = useState(1)
    const [edits, setEdits] = useState<Record<number, string>>({})
    const [percent, setPercent] = useState('')

    const params = { month, page, per_page: PER_PAGE, ...filters }
    const query = useQuery({ queryKey: ['fuel', 'budgets', params], queryFn: () => getFuelBudgets(params), enabled: /^\d{4}-\d{2}$/.test(month) })
    const data = query.data
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['fuel'] })

    const types = useMemo(() => [...new Set([...(data?.vehicles ?? []).map((v) => v.type), filters.type].filter((t): t is string => !!t))].sort(), [data, filters.type])

    const invalid = Object.values(edits).some((t) => t.trim() !== '' && parseLitres(t) === null)
    const entries = Object.entries(edits).flatMap(([id, t]) => {
        const litres = parseLitres(t)
        return litres === null ? [] : [{ vehicle_id: Number(id), litres }]
    })

    const save = useMutation({
        mutationFn: () => saveFuelBudgets(month, entries),
        onSuccess: (r) => { toast.success(`${r.saved} budget${r.saved === 1 ? '' : 's'} saved`); setEdits({}); refresh() },
        onError: (e) => toast.error(errorMessage(e)),
    })
    const fill = useMutation({
        mutationFn: () => applyFuelBudgetProposals(month, filters),
        onSuccess: (r) => {
            toast.success(`Filled ${r.written} from history · kept ${r.skipped_manual} you set by hand · ${r.no_history} without enough history`)
            refresh()
        },
        onError: (e) => toast.error(errorMessage(e)),
    })
    const adjust = useMutation({
        mutationFn: (p: number) => adjustFuelBudgets(month, p, filters),
        onSuccess: (r) => { toast.success(`${r.changed} budget${r.changed === 1 ? '' : 's'} adjusted`); setPercent(''); refresh() },
        onError: (e) => toast.error(errorMessage(e)),
    })

    const percentValue = percent.trim() === '' ? null : Number(percent)
    const percentOk = percentValue !== null && Number.isFinite(percentValue) && percentValue >= -90 && percentValue <= 100 && percentValue !== 0
    const lastPage = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1

    return (
        <div className="space-y-5 pb-6">
            <div>
                <Link href="/fuel/settings" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" />Fuel settings</Link>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Fuel budgets</h1>
                <p className="mt-1 text-sm text-slate-500">A litre budget for each vehicle, for one month. The Overview adds them up and projects the month.</p>
            </div>

            <FuelTabs active="Fuel Settings" />

            <div className="flex flex-wrap items-center gap-2">
                <label><span className="sr-only">Month</span><input type="month" aria-label="Month" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); setEdits({}) }} className={select} /></label>
                <label><span className="sr-only">Cluster</span>
                    <select value={filters.cluster_id ?? ''} onChange={(e) => { setFilters((f) => ({ ...f, cluster_id: e.target.value ? Number(e.target.value) : undefined })); setPage(1) }} className={select}>
                        <option value="">All clusters</option>
                        {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
                <label><span className="sr-only">Vehicle type</span>
                    <select value={filters.type ?? ''} onChange={(e) => { setFilters((f) => ({ ...f, type: e.target.value || undefined })); setPage(1) }} className={select}>
                        <option value="">All types</option>
                        {types.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>
            </div>

            {query.isError && !data ? <QueryError message="Failed to load budgets." onRetry={() => void query.refetch()} /> : !data ? (
                <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">Loading budgets…</p>
            ) : (
                <>
                    <div className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-4">
                        <Total label="Vehicles" value={data.totals.vehicles} />
                        <Total label="With a budget" value={data.totals.budgeted} />
                        <Total label="Without" value={data.totals.unbudgeted} />
                        <Total label="Budgeted litres" value={data.totals.litres} unit="L" />
                    </div>

                    <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4">
                        <div className="max-w-md text-sm text-slate-600">
                            <p className="font-medium text-slate-900">Start from each vehicle&apos;s own history</p>
                            <p>Fills vehicles with at least two weeks of use in the last three months. Budgets you set by hand are never replaced.</p>
                        </div>
                        <Button type="button" variant="outline" disabled={fill.isPending} onClick={() => fill.mutate()}>
                            {fill.isPending ? <Loader2 className="animate-spin" /> : <Wand2 />} Fill from history
                        </Button>
                        <div className="ml-auto flex items-end gap-2">
                            <label className="text-sm text-slate-600">
                                Adjust all shown by %
                                <input aria-label="Adjust by percent" inputMode="decimal" placeholder="e.g. -10" value={percent} onChange={(e) => setPercent(e.target.value)} className={`${select} ml-2 w-24`} />
                            </label>
                            <Button type="button" variant="outline" disabled={!percentOk || adjust.isPending}
                                onClick={() => { if (window.confirm(`Change every budget in this view by ${percentValue}%?`)) adjust.mutate(percentValue as number) }}>
                                Apply
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl bg-white p-2">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    {['Vehicle', 'Cluster', 'Budget (L)', 'Set by', 'Proposed from history'].map((h) => <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data.vehicles.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-sm text-slate-500">No vehicles match.</td></tr>}
                                {data.vehicles.map((v) => (
                                    <BudgetRow key={v.vehicle_id} v={v} clusterName={clusters.find((c) => c.id === v.cluster_id)?.name} edit={edits[v.vehicle_id]}
                                        onEdit={(t) => setEdits((e) => ({ ...e, [v.vehicle_id]: t }))} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                            <span>Page {page} of {lastPage}</span>
                            <Button type="button" size="sm" variant="outline" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Next</Button>
                        </div>
                        <div className="flex items-center gap-3">
                            {invalid && <span className="text-sm text-red-600">Budgets must be litres of 0 or more.</span>}
                            {Object.keys(edits).length > 0 && <Button type="button" variant="ghost" onClick={() => setEdits({})}>Discard changes</Button>}
                            <Button type="button" disabled={entries.length === 0 || invalid || save.isPending} onClick={() => save.mutate()}>
                                {save.isPending && <Loader2 className="animate-spin" />}Save {entries.length > 0 ? `${entries.length} change${entries.length === 1 ? '' : 's'}` : 'changes'}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function Total({ label, value, unit }: { label: string; value: number; unit?: string }) {
    return (
        <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">{formatNumber(value, 0)}{unit ? ` ${unit}` : ''}</p>
        </div>
    )
}

function BudgetRow({ v, clusterName, edit, onEdit }: { v: FuelBudgetRow; clusterName?: string; edit: string | undefined; onEdit: (text: string) => void }) {
    const shown = edit ?? (v.budget_litres == null ? '' : String(v.budget_litres))
    const bad = edit !== undefined && edit.trim() !== '' && parseLitres(edit) === null
    return (
        <tr className="border-t border-slate-100">
            <td className="px-2 py-2 text-sm">
                <span className="font-medium text-slate-900">{v.registration_number ?? `Vehicle ${v.vehicle_id}`}</span>
                <span className="block text-xs capitalize text-slate-400">{[v.make, v.model].filter(Boolean).join(' ')}</span>
            </td>
            <td className="px-2 py-2 text-sm text-slate-600">{clusterName ?? '—'}</td>
            <td className="px-2 py-2">
                <input aria-label={`Budget for ${v.registration_number ?? v.vehicle_id}`} inputMode="decimal" value={shown} onChange={(e) => onEdit(e.target.value)} placeholder="Not set"
                    className={`w-28 rounded-lg border px-2 py-1.5 text-sm tabular-nums ${bad ? 'border-red-400' : 'border-slate-200'}`} />
            </td>
            <td className="px-2 py-2 text-xs text-slate-500">{v.source === 'manual' ? 'You' : v.source === 'proposed' ? 'History' : '—'}</td>
            <td className="px-2 py-2 text-sm text-slate-600">
                {v.proposal ? (
                    <>
                        <span className="tabular-nums">{formatNumber(v.proposal.litres, 0, 'L')}</span>
                        <span className="text-xs text-slate-400"> · {v.proposal.days_of_data} days of use</span>
                        <button type="button" onClick={() => onEdit(String(v.proposal!.litres))} className="ml-2 text-xs font-medium text-blue-700 hover:underline">Use</button>
                    </>
                ) : <span className="text-xs text-slate-400">Not enough history</span>}
            </td>
        </tr>
    )
}
