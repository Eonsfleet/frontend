'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getMaintenanceJobById,
    getJobHistory,
    getJobConversation,
    postJobMessage,
    getJobCostSummary,
} from '@/lib/api/maintenance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, DollarSign, Wrench, MessageSquare, History, Plus, Star, MapPin } from 'lucide-react'
import Link from 'next/link'
import { WorkflowTimeline } from '@/components/shared/WorkflowTimeline'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { JobWorkflowActions } from '@/components/shared/JobWorkflowActions'
import { getVendors } from '@/lib/api/vendors'
import { assignMaintenanceJob } from '@/lib/api/maintenance'
import { usePermission } from '@/hooks/usePermission'

export default function MaintenanceJobDetailPage() {
    const params = useParams()
    const jobId = params.id as string
    const queryClient = useQueryClient()
    const [message, setMessage] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['maintenance-job', jobId],
        queryFn: () => getMaintenanceJobById(jobId),
        enabled: !!jobId,
    })

    const { data: historyData } = useQuery({
        queryKey: ['job-history', jobId],
        queryFn: () => getJobHistory(jobId),
        enabled: !!jobId,
    })

    const { data: convData } = useQuery({
        queryKey: ['job-conversation', jobId],
        queryFn: () => getJobConversation(jobId),
        enabled: !!jobId,
    })

    const { data: costData } = useQuery({
        queryKey: ['job-cost-summary', jobId],
        queryFn: () => getJobCostSummary(jobId),
        enabled: !!jobId,
    })

    const { mutate: sendMessage, isPending: isSending } = useMutation({
        mutationFn: (body: string) => postJobMessage(jobId, { body }),
        onSuccess: () => {
            toast.success('Message sent')
            setMessage('')
            queryClient.invalidateQueries({ queryKey: ['job-conversation', jobId] })
        },
        onError: () => toast.error('Failed to send message'),
    })

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading job details...</div>
    }

    const job = data?.data

    if (!job) {
        return <div className="p-8 text-center text-rose-500">Job not found</div>
    }

    const cost = costData?.data?.cost_summary
    const history = (historyData?.data?.history ?? []).map((e: any) => ({
        status: e.to_status ?? e.status ?? '',
        actor: e.actor?.name ?? e.actor ?? 'System',
        timestamp: e.created_at ?? e.timestamp ?? '',
        reason: e.reason ?? e.notes ?? null,
    }))
    const messages = convData?.data?.conversation?.messages ?? []

    const laborKobo: number = cost?.labor_cost ?? (job.attributes.labor_cost as number | undefined) ?? 0
    const partsKobo: number = cost?.parts_cost ?? (job.attributes.parts_cost as number | undefined) ?? 0
    const totalKobo: number = cost?.actual_cost ?? (job.attributes.total_cost as number | undefined) ?? laborKobo + partsKobo

    const toNaira = (kobo: number) => (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })

    const vehicleLabel = (() => {
        const v = job.relationships?.vehicle as any
        if (!v) return 'N/A'
        return v.registration_number ?? v.data?.id ?? 'N/A'
    })()

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
                                Job {job.attributes.reference_number ?? job.attributes.reference}
                            </h1>
                            <Badge variant="outline" className="capitalize bg-white text-slate-700">
                                {job.attributes.status.replace(/_/g, ' ')}
                            </Badge>
                        </div>
                        <p className="text-slate-500 mt-1">{job.attributes.title ?? job.attributes.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <JobWorkflowActions 
                        jobId={jobId} 
                        currentStatus={job.attributes.status} 
                        estimatedCost={job.attributes.cost_estimate || 0} 
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-white border text-slate-500 h-11 p-1">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                        <Wrench className="w-4 h-4 mr-2" /> Overview
                    </TabsTrigger>
                    {job.attributes.status === 'approved' && (
                        <TabsTrigger value="assignment" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                            <Plus className="w-4 h-4 mr-2" /> Assign Workshop
                        </TabsTrigger>
                    )}
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
                                        <p className="font-semibold text-slate-900">{vehicleLabel}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Priority</p>
                                        <Badge variant="secondary" className="capitalize">{job.attributes.priority}</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Fault Category</p>
                                        <p className="text-sm text-slate-900 capitalize">{job.attributes.fault_category?.replace(/_/g, ' ') ?? 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Reference</p>
                                        <p className="text-sm text-slate-900 font-mono">
                                            {job.attributes.reference_number || job.attributes.reference}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Vendor</p>
                                        <p className="text-sm text-slate-900">
                                            {job.relationships?.vendor?.name || 'Unassigned'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-500">Started</p>
                                        <p className="text-sm text-slate-900">
                                            {job.attributes.started_at ? format(new Date(job.attributes.started_at as string), 'PPP') : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="assignment">
                    <WorkshopAssignmentSection jobId={jobId} />
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
                                    <span className="font-medium text-slate-900">₦{toNaira(laborKobo)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-600">Parts</span>
                                    <span className="font-medium text-slate-900">₦{toNaira(partsKobo)}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 bg-slate-50 px-3 rounded-lg">
                                    <span className="font-semibold text-slate-900">Total</span>
                                    <span className="font-bold text-lg text-blue-700">₦{toNaira(totalKobo)}</span>
                                </div>
                                {cost?.cost_estimate != null && (
                                    <p className="text-xs text-slate-400">
                                        Estimate: ₦{toNaira(cost.cost_estimate)}
                                        {cost.variance != null && (
                                            <span className={cost.variance > 0 ? ' text-rose-500' : ' text-emerald-600'}>
                                                {' '}({cost.variance > 0 ? '+' : ''}₦{toNaira(cost.variance)} variance)
                                            </span>
                                        )}
                                    </p>
                                )}
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
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {messages.length ? (
                                    messages.map((msg: any) => (
                                        <div key={msg.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-semibold text-slate-700">{msg.sender?.name ?? 'User'}</span>
                                                <span className="text-xs text-slate-400">{msg.created_at ? format(new Date(msg.created_at), 'MMM d, p') : ''}</span>
                                            </div>
                                            <p className="text-sm text-slate-800">{msg.body}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-slate-500">
                                        <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                        <p>No messages yet. Start the conversation.</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                <Textarea
                                    placeholder="Add a message..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="bg-white min-h-[72px] resize-none"
                                />
                                <Button
                                    className="shrink-0 self-end"
                                    disabled={isSending || !message.trim()}
                                    onClick={() => sendMessage(message)}
                                >
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                                </Button>
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
                            <WorkflowTimeline history={history} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function WorkshopAssignmentSection({ jobId }: { jobId: string | number }) {
    const queryClient = useQueryClient()
    const { data: vendorsData, isLoading } = useQuery({
        queryKey: ['vendors-list'],
        queryFn: () => getVendors(),
    })

    const { mutate: assign, isPending } = useMutation({
        mutationFn: (vendorId: string | number) => assignMaintenanceJob(jobId, { vendor_id: vendorId }),
        onSuccess: () => {
            toast.success('Workshop assigned successfully')
            queryClient.invalidateQueries({ queryKey: ['maintenance-job', jobId.toString()] })
        },
        onError: () => toast.error('Failed to assign workshop'),
    })

    if (isLoading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-300" /></div>

    const vendors = vendorsData?.data || []

    return (
        <Card className="border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b">
                <CardTitle className="text-sm">Registered Workshops</CardTitle>
                <CardDescription>Select a workshop to handle this repair.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors.map((vendor: any) => (
                        <div key={vendor.id} className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-[#0055FF] hover:shadow-lg transition-all group relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0055FF]/10 transition-colors">
                                    <Wrench className="h-5 w-5 text-slate-400 group-hover:text-[#0055FF]" />
                                </div>
                                <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    <span className="text-[10px] font-bold text-slate-600">4.8</span>
                                </div>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0055FF] transition-colors">{vendor.name}</h4>
                            <div className="flex items-center gap-1 text-slate-400 mt-1 mb-4">
                                <MapPin className="h-3 w-3" />
                                <span className="text-[10px] truncate">{vendor.address || 'Remote Workshop'}</span>
                            </div>
                            <Button 
                                className="w-full bg-slate-900 group-hover:bg-[#0055FF] rounded-xl text-[10px] font-black uppercase tracking-widest h-10"
                                onClick={() => assign(vendor.id)}
                                disabled={isPending}
                            >
                                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Assign Job'}
                            </Button>
                        </div>
                    ))}
                    {!vendors.length && <p className="text-slate-400 text-sm py-8 text-center col-span-full">No active workshops found.</p>}
                </div>
            </CardContent>
        </Card>
    )
}
