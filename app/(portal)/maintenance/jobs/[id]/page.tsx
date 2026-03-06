'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getMaintenanceJobById } from '@/lib/api/maintenance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Clock, DollarSign, Wrench, MessageSquare, History } from 'lucide-react'
import Link from 'next/link'
import { WorkflowTimeline, WorkflowEvent } from '@/components/shared/WorkflowTimeline'
import { format } from 'date-fns'

// Mock history for the timeline since backend might not have it structured perfectly yet
const MOCK_HISTORY: WorkflowEvent[] = [
    { status: 'draft', actor: 'System', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), reason: 'Created automatically from alert' },
    { status: 'submitted', actor: 'Fleet Manager', timestamp: new Date(Date.now() - 86400000).toISOString(), reason: 'Sent for approval' },
    { status: 'approved', actor: 'Admin', timestamp: new Date(Date.now() - 43200000).toISOString(), reason: null },
    { status: 'assigned', actor: 'Dispatcher', timestamp: new Date().toISOString(), reason: 'Assigned to Mechanic A' },
]

export default function MaintenanceJobDetailPage() {
    const params = useParams()
    const jobId = params.id as string

    const { data, isLoading } = useQuery({
        queryKey: ['maintenance-job', jobId],
        queryFn: () => getMaintenanceJobById(jobId),
        enabled: !!jobId
    })

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading job details...</div>
    }

    const job = data?.data

    if (!job) {
        return <div className="p-8 text-center text-rose-500">Job not found</div>
    }

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full">
                        <Link href="/maintenance/jobs">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                Job {job.attributes.reference_number}
                            </h1>
                            <Badge variant="outline" className="capitalize bg-white text-slate-700">
                                {job.attributes.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <p className="text-slate-500 mt-1">{job.attributes.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Edit Job</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">Advance Workflow</Button>
                </div>
            </div>

            {/* Tabs content */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-white border text-slate-500 h-11 p-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                        <Wrench className="w-4 h-4 mr-2" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="parts" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                        Parts
                    </TabsTrigger>
                    <TabsTrigger value="costs" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                        <DollarSign className="w-4 h-4 mr-2" /> Costs
                    </TabsTrigger>
                    <TabsTrigger value="conversation" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                        <MessageSquare className="w-4 h-4 mr-2" /> Chat
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                        <History className="w-4 h-4 mr-2" /> Workflow
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-slate-200">
                            <CardHeader className="bg-slate-50/50 border-b">
                                <CardTitle className="text-sm">Job Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Vehicle</p>
                                        <p className="font-semibold text-slate-900 hover:text-blue-600 cursor-pointer">{job.relationships.vehicle?.data?.id}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Priority</p>
                                        <Badge variant="secondary" className="capitalize">{job.attributes.priority}</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Scheduled Date</p>
                                        <p className="text-sm text-slate-900">{format(new Date(job.attributes.scheduled_date), 'PPP')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Completed Date</p>
                                        <p className="text-sm text-slate-900">{job.attributes.completed_date ? format(new Date(job.attributes.completed_date), 'PPP') : 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Service Odometer</p>
                                        <p className="text-sm text-slate-900">{job.attributes.odometer_at_service ? `${job.attributes.odometer_at_service.toLocaleString()} km` : 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Assignee</p>
                                        <p className="text-sm text-slate-900">{job.relationships.assignee?.data?.id || 'Unassigned'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="parts">
                    <Card className="border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm">Parts Used</CardTitle>
                                <CardDescription>Inventory items associated with this repair.</CardDescription>
                            </div>
                            <Button size="sm" variant="outline">Add Part</Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center py-8 text-slate-500">
                                <Wrench className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                <p>No parts added yet.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="costs">
                    <Card className="border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="text-sm">Cost Summary</CardTitle>
                            <CardDescription>Breakdown of labor and parts.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4 max-w-sm">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-600">Labor</span>
                                    <span className="font-medium text-slate-900">₦{job.attributes.labor_cost.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-600">Parts</span>
                                    <span className="font-medium text-slate-900">₦{job.attributes.parts_cost.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 bg-slate-50 px-3 rounded-lg">
                                    <span className="font-semibold text-slate-900">Total</span>
                                    <span className="font-bold text-lg text-blue-700">₦{job.attributes.total_cost.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="conversation">
                    <Card className="border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="text-sm">Internal Discussion</CardTitle>
                            <CardDescription>Secure thread for mechanics and managers.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center py-8 text-slate-500">
                                <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                <p>No messages yet. Start the conversation.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="border-slate-200">
                        <CardHeader className="bg-slate-50/50 border-b">
                            <CardTitle className="text-sm">Workflow Timeline</CardTitle>
                            <CardDescription>Audit trail of state transitions.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-8">
                            <WorkflowTimeline history={MOCK_HISTORY} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
