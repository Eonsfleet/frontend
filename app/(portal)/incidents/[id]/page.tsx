'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2, AlertTriangle, Clock, MessageSquare, ShieldAlert, GitCommit } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getIncidentById } from '@/lib/api/incidents'
import { format } from 'date-fns'
import { WorkflowTimeline } from '@/components/shared/WorkflowTimeline'
import { IncidentWorkflowActions } from '@/components/incidents/IncidentWorkflowActions'

export default function IncidentDetailPage() {
    const params = useParams()
    const id = params.id as string

    const { data, isLoading } = useQuery({
        queryKey: ['incident', id],
        queryFn: () => getIncidentById(id),
    })

    const incident = data?.data

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        )
    }

    if (!incident) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50">
                <p className="text-slate-500">Incident not found.</p>
            </div>
        )
    }

    const isResolved = ['resolved', 'closed', 'cancelled', 'dismissed'].includes(incident.attributes.status)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'reported': return 'bg-slate-100 text-slate-800'
            case 'investigating': return 'bg-blue-100 text-blue-800'
            case 'action_required': return 'bg-amber-100 text-amber-800'
            case 'action_taken': return 'bg-cyan-100 text-cyan-800'
            case 'pending_resolution': return 'bg-purple-100 text-purple-800'
            case 'resolved': return 'bg-emerald-100 text-emerald-800'
            case 'closed': return 'bg-slate-800 text-slate-100'
            case 'cancelled':
            case 'dismissed': return 'bg-slate-100 text-slate-500'
            case 'escalated': return 'bg-rose-100 text-rose-800 border-rose-300 border'
            default: return 'bg-slate-100'
        }
    }

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-full">
            <Link
                href="/incidents"
                className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
            >
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Incidents
            </Link>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex gap-5">
                    <div className={`h-14 w-14 rounded-full flex flex-shrink-0 items-center justify-center ${isResolved ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600'}`}>
                        <AlertTriangle className="h-7 w-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                {incident.attributes.reference_number}
                            </h1>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${getStatusColor(incident.attributes.status)}`}>
                                {incident.attributes.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="text-slate-500 mt-1 capitalize">{incident.attributes.type.replace(/_/g, ' ')}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Reported: {format(new Date(incident.attributes.reported_at), 'PPp')}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 pt-2 md:pt-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider md:text-right">Priority Level</p>
                    <Badge variant={incident.attributes.priority === 'critical' ? 'destructive' : 'outline'} className="justify-center px-4 py-1.5 uppercase tracking-wider text-xs">
                        {incident.attributes.priority}
                    </Badge>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-[600px] grid-cols-4 mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="conversation">Conversation</TabsTrigger>
                    <TabsTrigger value="actions">Workflow Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-slate-500" /> Incident Description
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{incident.attributes.description}</p>

                                    {incident.attributes.location && (
                                        <div className="mt-6 pt-6 border-t border-slate-100">
                                            <p className="text-sm font-semibold text-slate-900 mb-3">Reported Location</p>
                                            <div className="h-48 w-full bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden relative">
                                                {/* Placeholder for map snapshot */}
                                                <div className="absolute inset-0 bg-[url('https://maps.wikimedia.org/osm-intl/12/697/1594.png')] opacity-60 mix-blend-multiply bg-center bg-cover pointer-events-none" />
                                                <div className="absolute h-4 w-4 bg-red-600 rounded-full border-2 border-white shadow-lg z-10 animate-pulse" />
                                                <p className="absolute bottom-2 left-2 bg-white/90 backdrop-blur text-xs px-2 py-1 rounded shadow-sm text-slate-700 font-medium z-10">
                                                    {incident.attributes.location.lat.toFixed(4)}, {incident.attributes.location.lng.toFixed(4)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                                    <CardTitle className="text-base">Involved Assets</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 divide-y divide-slate-100">
                                    {incident.relationships.vehicle?.data && (
                                        <div className="p-4 flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vehicle ID</span>
                                            <Link href={`/vehicles/${incident.relationships.vehicle.data.id}`} className="font-medium text-blue-600 hover:underline">
                                                Vehicle #{incident.relationships.vehicle.data.id}
                                            </Link>
                                        </div>
                                    )}
                                    {incident.relationships.driver?.data && (
                                        <div className="p-4 flex flex-col gap-1">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Driver</span>
                                            <span className="font-medium text-slate-900">User #{incident.relationships.driver.data.id}</span>
                                        </div>
                                    )}
                                    {incident.relationships.assignee?.data && (
                                        <div className="p-4 flex flex-col gap-1 bg-amber-50/50">
                                            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Investigation Assignee</span>
                                            <span className="font-medium text-slate-900">User #{incident.relationships.assignee.data.id}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="timeline">
                    <Card className="border-slate-200 shadow-sm max-w-3xl">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-base flex items-center gap-2">
                                <GitCommit className="h-4 w-4 text-slate-500" /> Work History & Transitions
                            </CardTitle>
                            <CardDescription>Review the state changes and logged updates since this incident was reported.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <WorkflowTimeline
                                history={[
                                    { status: 'reported', actor: 'System Alert', timestamp: incident.attributes.reported_at, reason: 'Initial incident filing via telematics.' },
                                    ...(incident.attributes.status !== 'reported' ? [
                                        { status: incident.attributes.status, actor: 'Fleet Manager', timestamp: new Date().toISOString(), reason: 'Current state indicator' }
                                    ] : [])
                                ]}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="conversation">
                    <Card className="border-slate-200 shadow-sm max-w-3xl">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-base flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-slate-500" /> Internal Notes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-12 text-center text-slate-500">
                            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                            <p>No internal notes left on this incident yet.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="actions">
                    <div className="max-w-3xl">
                        <IncidentWorkflowActions id={incident.id} currentStatus={incident.attributes.status} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
