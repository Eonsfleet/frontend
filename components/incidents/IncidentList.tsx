'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, AlertTriangle, Eye } from 'lucide-react'
import { getIncidents } from '@/lib/api/incidents'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { IncidentDrawer } from './IncidentDrawer'

export function IncidentList() {
    const [page, setPage] = React.useState(1)
    const [drawerIncidentId, setDrawerIncidentId] = React.useState<string | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['incidents', { page }],
        queryFn: () => getIncidents({ page, per_page: 10 }),
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'reported': return 'bg-slate-100 text-slate-800'
            case 'under_investigation': return 'bg-blue-100 text-blue-800'
            case 'action_required': return 'bg-amber-100 text-amber-800'
            case 'action_taken': return 'bg-cyan-100 text-cyan-800'
            case 'pending_resolution': return 'bg-purple-100 text-purple-800'
            case 'resolved': return 'bg-emerald-100 text-emerald-800'
            case 'closed': return 'bg-slate-800 text-slate-100'
            case 'cancelled':
            case 'dismissed': return 'bg-slate-100 text-slate-500 line-through'
            case 'escalated': return 'bg-rose-100 text-rose-800 font-bold border-rose-300 border'
            default: return 'bg-slate-100'
        }
    }

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'critical': return <Badge variant="destructive" className="uppercase text-[10px]">Critical</Badge>
            case 'high': return <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 uppercase text-[10px]">High</Badge>
            case 'medium': return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 uppercase text-[10px]">Medium</Badge>
            default: return <Badge variant="outline" className="text-slate-500 uppercase text-[10px]">Low</Badge>
        }
    }

    return (
        <>
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between bg-white border-b border-slate-100">
                <div>
                    <CardTitle className="text-lg">Incident Reports</CardTitle>
                    <CardDescription>Track events through the 9-state resolution workflow.</CardDescription>
                </div>
                <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
                    <Link href="/incidents/new">
                        <Plus className="mr-2 h-4 w-4" /> Report Incident
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                        <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-4" />
                        <p>Loading incident data...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Reference</th>
                                    <th className="px-6 py-4 font-medium">Type</th>
                                    <th className="px-6 py-4 font-medium">Vehicle & Context</th>
                                    <th className="px-6 py-4 font-medium">Priority</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Reported At</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data?.data?.incidents?.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                    <AlertTriangle className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <p className="font-medium text-slate-900">No Incidents Found</p>
                                                <p className="text-sm mt-1 mb-4">Your fleet is currently incident-free.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.data?.incidents?.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={() => setDrawerIncidentId(item.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-blue-600">
                                                    {item.attributes.reference_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 capitalize font-medium text-slate-700">
                                                {item.attributes.type.replace(/_/g, ' ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{item.relationships?.vehicle ? ('registration_number' in item.relationships.vehicle ? item.relationships.vehicle.registration_number : (item.relationships.vehicle as any).data?.id ?? 'N/A') : 'General / No Vehicle'}</div>
                                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{item.attributes.description}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getPriorityBadge(item.attributes.priority)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${getStatusColor(item.attributes.status)}`}>
                                                    {item.attributes.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                                                {(() => {
                                                    const rawDate = item.attributes.occured_date
                                                    const rawTime = item.attributes.occured_time

                                                    if (!rawDate) return 'N/A'

                                                    // Parse date portion from the ISO string
                                                    const dateObj = new Date(rawDate)
                                                    if (isNaN(dateObj.getTime())) return 'Invalid Date'
                                                    const datePart = format(dateObj, 'yyyy-MMM-dd')

                                                    // Parse time: strip trailing am/pm label, split HH:mm:ss
                                                    let timePart = '—'
                                                    if (rawTime) {
                                                        const cleaned = rawTime.replace(/\s*(am|pm)$/i, '').trim()
                                                        const [hStr, mStr] = cleaned.split(':')
                                                        const h = parseInt(hStr, 10)
                                                        const m = parseInt(mStr, 10)
                                                        if (!isNaN(h) && !isNaN(m)) {
                                                            const suffix = h >= 12 ? 'PM' : 'AM'
                                                            const h12 = h % 12 === 0 ? 12 : h % 12
                                                            timePart = `${h12}:${String(m).padStart(2, '0')}${suffix}`
                                                        }
                                                    }

                                                    return (
                                                        <span className="flex flex-col gap-0.5">
                                                            <span className="font-medium text-slate-700">{datePart}</span>
                                                            <span className="text-slate-400">{timePart}</span>
                                                        </span>
                                                    )
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="View details"
                                                    onClick={(e) => { e.stopPropagation(); setDrawerIncidentId(item.id) }}
                                                >
                                                    <Eye className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>

            {/* Pagination */}
            {(data?.data?.pagination?.last_page ?? 1) > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="text-[10px] font-black uppercase tracking-widest"
                    >
                        Prev
                    </Button>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Page {page} of {data?.data?.pagination?.last_page}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === (data?.data?.pagination?.last_page ?? 1)}
                        onClick={() => setPage((p) => p + 1)}
                        className="text-[10px] font-black uppercase tracking-widest"
                    >
                        Next
                    </Button>
                </div>
            )}
        </Card>

        <IncidentDrawer
            incidentId={drawerIncidentId}
            onClose={() => setDrawerIncidentId(null)}
        />
        </>
    )
}
