'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMaintenanceJobs, getMaintenanceStats, createMaintenanceJob } from '@/lib/api/maintenance'
import { getVehicles } from '@/lib/api/vehicles'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
    ListFilter,
    Plus,
    Wrench,
    Clock,
    CheckCircle2,
    MoreHorizontal,
    Car,
    User,
    Calendar,
    ArrowRight,
    Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

const COLUMNS = [
    { id: 'pending', title: 'Backlog', icon: ListFilter, color: 'text-slate-400', bg: 'bg-slate-50' },
    { id: 'scheduled', title: 'Scheduled', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'in_progress', title: 'In Progress', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'completed', title: 'Completed', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
]

export default function MaintenanceJobBoardPage() {
    const [createOpen, setCreateOpen] = useState(false)

    const { data: jobData, isLoading } = useQuery({
        queryKey: ['maintenance-jobs'],
        queryFn: () => getMaintenanceJobs({ per_page: 100 }),
    })

    const { data: statsData } = useQuery({
        queryKey: ['maintenance-stats'],
        queryFn: () => getMaintenanceStats(),
    })

    const jobs = jobData?.data?.jobs || []
    const stats = statsData?.data || {}

    const jobsByStatus = React.useMemo(() => {
        const acc: Record<string, any[]> = {
            pending: [],
            scheduled: [],
            in_progress: [],
            completed: []
        }
        jobs.forEach(job => {
            const status = job.attributes.status?.toLowerCase() || 'pending'
            if (acc[status]) acc[status].push(job)
            else acc.pending.push(job) // fallback
        })
        return acc
    }, [jobs])

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/maintenance" className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                            Maintenance Command
                        </Link>
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Job Board</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
                        Ops <span className="text-blue-600">Theater</span>
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic text-sm">Visualizing real-time maintenance throughput and technician assignments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm gap-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Jobs</span>
                            <span className="text-sm font-black text-slate-900">{(stats.in_progress_jobs || 0) + (stats.scheduled_jobs || 0)}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
                            <span className="text-sm font-black text-emerald-600">{stats.compliance_rate || 0}%</span>
                        </div>
                    </div>
                    <Button
                        className="bg-slate-950 hover:bg-slate-900 shadow-xl px-6 font-bold text-xs uppercase tracking-widest group"
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> Initiate Job
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                {COLUMNS.map((col) => (
                    <div key={col.id} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <div className={cn("p-1.5 rounded-lg", col.bg)}>
                                    <col.icon className={cn("h-4 w-4", col.color)} />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 italic">
                                    {col.title}
                                </h3>
                                <Badge variant="secondary" className="bg-white border-slate-100 text-[10px] font-black text-slate-400 px-2 rounded-md">
                                    {jobsByStatus[col.id]?.length || 0}
                                </Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="space-y-4 min-h-[500px]">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-32 w-full rounded-2xl bg-slate-100/50" />
                                ))
                            ) : jobsByStatus[col.id]?.length ? (
                                jobsByStatus[col.id].map((job) => (
                                    <Link key={job.id} href={`/maintenance/jobs/${job.id}`} className="block">
                                        <JobCard job={job} />
                                    </Link>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-slate-100/30 rounded-2xl border-2 border-slate-100 border-dashed">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Empty Lane</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <CreateJobModal open={createOpen} onOpenChange={setCreateOpen} />
        </div>
    )
}

function CreateJobModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const queryClient = useQueryClient()
    const [form, setForm] = React.useState({ vehicle_id: '', title: '', description: '', fault_category: '', cost_estimate: '' })

    const { data: vehiclesData } = useQuery({
        queryKey: ['vehicles-jobs-modal'],
        queryFn: () => getVehicles({ per_page: 100 }),
        enabled: open,
    })

    const { mutate: create, isPending } = useMutation({
        mutationFn: () => createMaintenanceJob({
            vehicle_id: form.vehicle_id,
            title: form.title,
            description: form.description,
            fault_category: form.fault_category,
            cost_estimate_kobo: form.cost_estimate ? Math.round(parseFloat(form.cost_estimate) * 100) : 0,
        }),
        onSuccess: () => {
            toast.success('Job created successfully.')
            queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] })
            onOpenChange(false)
            setForm({ vehicle_id: '', title: '', description: '', fault_category: '', cost_estimate: '' })
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create job.'),
    })

    const canSubmit = form.vehicle_id && form.title && form.fault_category

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-8 bg-slate-900 text-white">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight italic flex items-center gap-3">
                        <Wrench className="h-5 w-5 text-blue-400" /> Initiate Work Order
                    </DialogTitle>
                </DialogHeader>
                <div className="p-8 space-y-5 bg-white">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</Label>
                        <Select value={form.vehicle_id} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v }))}>
                            <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-xs uppercase">
                                <SelectValue placeholder="Select asset" />
                            </SelectTrigger>
                            <SelectContent>
                                {vehiclesData?.data?.map((v: any) => (
                                    <SelectItem key={v.id} value={v.id.toString()} className="font-bold uppercase text-[10px]">
                                        {v.attributes.registration_number} — {v.attributes.make} {v.attributes.model}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Job Title</Label>
                        <Input className="h-11 rounded-xl border-slate-100 bg-slate-50 font-medium" placeholder="e.g. Engine oil replacement" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fault Category</Label>
                        <Select value={form.fault_category} onValueChange={v => setForm(f => ({ ...f, fault_category: v }))}>
                            <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-xs uppercase">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {['engine', 'transmission', 'brakes', 'tyres', 'electrical', 'bodywork', 'suspension', 'fuel_system', 'other'].map(c => (
                                    <SelectItem key={c} value={c} className="font-bold uppercase text-[10px]">{c.replace(/_/g, ' ')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
                        <Textarea className="rounded-xl border-slate-100 bg-slate-50 min-h-[80px] font-medium text-sm" placeholder="Describe the fault or work required..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cost Estimate (₦)</Label>
                        <Input type="number" min={0} className="h-11 rounded-xl border-slate-100 bg-slate-50 font-medium" placeholder="0.00" value={form.cost_estimate} onChange={e => setForm(f => ({ ...f, cost_estimate: e.target.value }))} />
                    </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-[10px] tracking-widest text-slate-400">Cancel</Button>
                    <Button onClick={() => create()} disabled={isPending || !canSubmit} className="bg-slate-900 hover:bg-slate-800 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Job'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function JobCard({ job }: { job: any }) {
    const attrs = job.attributes
    const vehicle = job.relationships?.vehicle
    const technician = job.relationships?.technician

    return (
        <Card className="border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer overflow-hidden bg-white">
            <CardContent className="p-0">
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter border-slate-200 text-slate-500 rounded-md bg-slate-50">
                            WO-{job.id.toString().padStart(4, '0')}
                        </Badge>
                        <div className="flex -space-x-2">
                            <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                                <User className="h-3 w-3 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                            {attrs.service_type?.replace(/_/g, ' ') || 'General Maintenance'}
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <Car className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                {vehicle?.registration_number || attrs.vehicle_id}
                            </span>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">
                                {attrs.scheduled_at ? new Date(attrs.scheduled_at).toLocaleDateString() : 'Unscheduled'}
                            </span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                </div>

                {attrs.status === 'in_progress' && (
                    <div className="h-1 w-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-500 w-1/2 animate-pulse" />
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function ChevronRight({ className }: { className?: string }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" /></svg>
}
