'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Car, Loader2, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QueryError } from '@/components/shared/QueryError'
import { EmptyState } from '@/components/shared/subscription/EmptyState'
import { BillingDateDisplay } from '@/components/shared/subscription/BillingDateDisplay'
import { KpiTile } from '@/components/shared/subscription/KpiTile'
import * as api from '@/lib/api/billing-groups'

export default function PocOverviewPage() {
    const { data: poc, isLoading: isPocLoading, isError: isPocError, refetch: refetchPoc } = useQuery({
        queryKey: ['poc-overview'],
        queryFn: api.getPocOverview,
    })

    const { data: assets, isLoading: isAssetsLoading } = useQuery({
        queryKey: ['poc-assets'],
        queryFn: api.getPocAssets,
        enabled: !!poc,
    })

    if (isPocLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
    }

    if (isPocError) {
        return <QueryError message="Failed to load POC status." onRetry={refetchPoc} />
    }

    if (!poc) {
        return (
            <div className="max-w-3xl">
                <EmptyState icon={CheckCircle2} title="No active POC" description="This organisation is on a Production subscription. There is no evaluation period to display." />
            </div>
        )
    }

    const isExpired = poc.status === 'EXPIRED'
    const limitReached = poc.assetsUsed >= poc.assetLimit

    return (
        <div className="max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">POC Overview</h1>
                <p className="mt-1 text-sm text-slate-500">Evaluation period usage and conversion path.</p>
            </div>

            {isExpired ? (
                <Card className="border-rose-200 bg-rose-50 shadow-sm">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-bold text-rose-900">Your POC has ended</h2>
                        <p className="mt-1 text-sm text-rose-700">
                            The evaluation period ended on <BillingDateDisplay date={poc.endDate} className="inline font-semibold" />. Your data has been retained.
                            Convert to Production or contact your EonsFleet account manager.
                        </p>
                        <Button asChild size="sm" className="mt-4 bg-blue-600 text-white hover:bg-blue-700">
                            <Link href="/subscription/poc/convert">Convert to Production</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-amber-200 bg-amber-50 shadow-sm">
                    <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-amber-900">
                            Your POC ends on <BillingDateDisplay date={poc.endDate} className="inline font-semibold" />.
                            Convert to Production to continue using EonsFleet after this date.
                        </p>
                        <div className="flex shrink-0 gap-2">
                            <Button asChild size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                                <Link href="/subscription/poc/convert">View Production plans</Link>
                            </Button>
                            <Button variant="outline" size="sm">Contact account manager</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                <KpiTile icon={CalendarClock} color="blue" label="Days Remaining" value={`${Math.max(poc.daysRemaining, 0)} days`} />
                <KpiTile
                    icon={Car}
                    color={limitReached ? 'amber' : 'purple'}
                    label="Assets Used"
                    value={`${poc.assetsUsed} of ${poc.assetLimit}`}
                    caption={limitReached ? `You have reached the approved limit of ${poc.assetLimit} assets.` : undefined}
                />
                <KpiTile icon={CalendarClock} color="amber" label="POC End Date" value={<BillingDateDisplay date={poc.endDate} />} />
                <KpiTile icon={User} color="blue" label="Account Manager" value={poc.accountManager ?? 'Not assigned'} />
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100"><CardTitle className="text-[13px] font-semibold text-slate-700">Trial Assets</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {isAssetsLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                    ) : !assets || assets.length === 0 ? (
                        <EmptyState icon={Car} title="No trial assets yet" description="Assets activated during the POC will appear here." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="px-5 py-3">Asset</th>
                                        <th className="px-5 py-3">Registration number</th>
                                        <th className="px-5 py-3">Device</th>
                                        <th className="px-5 py-3">Activated date</th>
                                        <th className="px-5 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {assets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3.5 font-medium text-slate-800">{asset.label}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{asset.registrationNumber}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{asset.hasDevice ? 'Installed' : 'None'}</td>
                                            <td className="px-5 py-3.5"><BillingDateDisplay date={asset.activatedDate} /></td>
                                            <td className="px-5 py-3.5 capitalize text-slate-600">{asset.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button asChild className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                    <Link href="/subscription/poc/convert">Convert to Production <ArrowRight className="h-4 w-4" /></Link>
                </Button>
            </div>
        </div>
    )
}
