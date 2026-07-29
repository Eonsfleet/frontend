'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Layers, Search, Loader2, PackagePlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QueryError } from '@/components/shared/QueryError'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { BillingGroupStatusBadge } from '@/components/shared/subscription/StatusBadges'
import { MoneyDisplay } from '@/components/shared/subscription/MoneyDisplay'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import * as api from '@/lib/api/billing-groups'
import type { BillingGroupStatus } from '@/types/subscription'

type StatusFilter = 'all' | BillingGroupStatus

export default function BillingGroupsPage() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

    const { data: groups, isLoading, isError, refetch } = useQuery({
        queryKey: ['billing-groups'],
        queryFn: api.getBillingGroups,
    })

    const filtered = useMemo(() => {
        if (!groups) return []
        return groups.filter((group) => {
            const matchesStatus = statusFilter === 'all' || group.status === statusFilter
            const matchesSearch = !search.trim() || group.name.toLowerCase().includes(search.trim().toLowerCase())
            return matchesStatus && matchesSearch
        })
    }, [groups, search, statusFilter])

    return (
        <div className="max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Billing Groups</h1>
                    <p className="mt-1 text-sm text-slate-500">Each production asset belongs to a billing group with its own renewal date.</p>
                </div>
                <Button asChild size="sm" className="h-9 gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
                    <Link href="/subscription/billing-groups/add-assets">
                        <PackagePlus className="h-4 w-4" /> Add Assets
                    </Link>
                </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search billing group name..."
                        className="h-9 border-slate-200 bg-white pl-9 text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="h-9 w-44 border-slate-200 text-xs">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="PAST_DUE">Past Due</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                {isError ? (
                    <div className="p-6"><QueryError message="Failed to load billing groups." onRetry={refetch} /></div>
                ) : isLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="No billing groups yet"
                        description="This organisation has no Production assets attached to a billing group. Add assets to begin asset-based billing."
                        actionLabel="Add assets"
                    />
                ) : (
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3.5">Group name</th>
                                        <th className="px-5 py-3.5">Plan</th>
                                        <th className="px-5 py-3.5 text-right">Assets</th>
                                        <th className="px-5 py-3.5 text-right">Unit price</th>
                                        <th className="px-5 py-3.5">Billing cycle</th>
                                        <th className="px-5 py-3.5">Current period</th>
                                        <th className="px-5 py-3.5">Next renewal</th>
                                        <th className="px-5 py-3.5 text-right">Renewal amount</th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((group) => (
                                        <tr key={group.id} className="transition-colors hover:bg-slate-50/50">
                                            <td className="px-5 py-4 font-medium text-slate-800">{group.name}</td>
                                            <td className="px-5 py-4 text-slate-600">{group.plan}</td>
                                            <td className="px-5 py-4 text-right text-slate-600">{group.assetCount.toLocaleString()}</td>
                                            <td className="px-5 py-4 text-right"><MoneyDisplay value={group.unitPrice} /></td>
                                            <td className="px-5 py-4 capitalize text-slate-600">{group.billingCycle.toLowerCase()}</td>
                                            <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">
                                                {group.currentPeriodStart} &rarr; {group.currentPeriodEnd}
                                            </td>
                                            <td className="px-5 py-4"><BillingDateDisplay date={group.nextRenewal} /></td>
                                            <td className="px-5 py-4 text-right font-semibold"><MoneyDisplay value={group.renewalAmount} /></td>
                                            <td className="px-5 py-4"><BillingGroupStatusBadge status={group.status} /></td>
                                            <td className="px-5 py-4 text-right">
                                                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                                    <Link href={`/subscription/billing-groups/${group.id}`}>View details</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
