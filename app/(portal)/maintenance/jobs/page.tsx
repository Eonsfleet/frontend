'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMaintenanceJobs, getMaintenanceStats, createMaintenanceJob, transitionMaintenanceJob, deleteMaintenanceJob } from '@/lib/api/maintenance'
import { useVehiclesDropdown } from '@/hooks/useVehiclesDropdown'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Check,
    ChevronsUpDown,
    MoreHorizontal,
    Car,
    User,
    Calendar,
    ArrowRight,
    Loader2,
    ChevronRight,
    Search,
    Plus,
    ListFilter,
    Settings,
    Wrench,
    CheckCircle2,
    Clock,
    Trash2
} from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'
import { cn, extractApiError } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

const BRAND_BLUE = "text-[#0055FF]"
const BRAND_BLUE_BG = "bg-[#0055FF]"
const BRAND_ACCENT = "bg-[#0055FF]/10 text-[#0055FF]"

const COLUMNS = [
    { id: 'submitted', title: 'Requests', icon: ListFilter, color: 'text-slate-400', bg: 'bg-slate-50', toStatus: 'needs_inspection' },
    { id: 'pending_inspection', title: 'Inspection', icon: Search, color: 'text-amber-500', bg: 'bg-amber-50', toStatus: 'pending_approval' },
    { id: 'approved', title: 'Approved', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', toStatus: 'assigned' },
    { id: 'in_progress', title: 'Active Repair', icon: Wrench, color: 'text-blue-500', bg: 'bg-blue-50', toStatus: 'pending_verification' },
    { id: 'closed', title: 'Closed', icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-50', toStatus: null },
]

export default function MaintenanceJobBoardPage() {
    const queryClient = useQueryClient()
    const { role } = usePermission()
    const [createOpen, setCreateOpen] = useState(false)

    const { data: jobsData, isLoading } = useQuery({
        queryKey: ['maintenance-jobs'],
        queryFn: () => getMaintenanceJobs(),
    })

    const jobs = React.useMemo(() => {
        const allJobs = jobsData?.data?.jobs || []
        if (role === 'driver') {
            // In a real scenario, the backend should filter this, 
            // but we add a safety frontend filter here.
            return allJobs.filter(job => job.attributes.status === 'submitted')
        }
        return allJobs
    }, [jobsData, role])

    const { data: statsData } = useQuery({
        queryKey: ['maintenance-stats'],
        queryFn: () => getMaintenanceStats(),
    })

    const stats = statsData?.data || {}

    const jobsByStatus = React.useMemo(() => {
        const acc: Record<string, any[]> = {
            submitted: [],
            pending_inspection: [],
            approved: [],
            in_progress: [],
            closed: [],
        }
        jobs.forEach(job => {
            const status = job.attributes.status?.toLowerCase() || 'submitted'

            if (['draft', 'submitted'].includes(status)) {
                acc.submitted.push(job)
            } else if (['needs_inspection', 'pending_inspection', 'pending_approval', 'pending_finance_approval'].includes(status)) {
                acc.pending_inspection.push(job)
            } else if (['approved', 'assigned'].includes(status)) {
                acc.approved.push(job)
            } else if (['in_progress', 'pending_verification', 'reopened'].includes(status)) {
                acc.in_progress.push(job)
            } else if (['closed', 'completed', 'cancelled', 'rejected'].includes(status)) {
                acc.closed.push(job)
            }
        })
        return acc
    }, [jobs])

    const { mutate: transitionMutation } = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => 
            transitionMaintenanceJob(id, { to_status: status }),
        onMutate: () => {
            toast.loading('Updating job status...', { id: 'transition' })
        },
        onSuccess: () => {
            toast.success('Job status updated.', { id: 'transition' })
            queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] })
        },
        onError: (err: unknown) => {
            toast.error(extractApiError(err, 'Failed to update job status.'), { id: 'transition' })
        },
    })

    const [deleteTarget, setDeleteTarget] = useState<any>(null)
    const { mutate: deleteJob, isPending: isDeleting } = useMutation({
        mutationFn: (id: string) => deleteMaintenanceJob(id),
        onSuccess: () => {
            toast.success('Job removed.')
            queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] })
            setDeleteTarget(null)
        },
        onError: (err: unknown) => toast.error(extractApiError(err, 'Failed to delete job.')),
    })

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleDrop = (e: React.DragEvent, col: typeof COLUMNS[number]) => {
        e.preventDefault()
        const id = e.dataTransfer.getData('jobId')
        if (id && col.toStatus) {
            transitionMutation({ id, status: col.toStatus })
        }
    }

    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/maintenance" className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-[0.2em] transition-colors">
                            Command
                        </Link>
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        <span className="text-[10px] font-black text-[#0055FF] uppercase tracking-[0.2em]">Theater</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">
                        Ops <span className="text-[#0055FF]">Theater</span>
                    </h1>
                    <p className="text-slate-400 mt-2 font-bold italic text-[11px] uppercase tracking-widest flex items-center gap-2">
                        <span className="h-1 w-8 bg-[#0055FF] rounded-full" />
                        Real-time Maintenance Flow Control
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white px-6 py-2.5 rounded-[20px] border border-slate-100 shadow-sm gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Jobs</span>
                            <span className="text-lg font-black text-slate-900 tracking-tighter">{(stats.in_progress_jobs || 0) + (stats.scheduled_jobs || 0)}</span>
                        </div>
                        <div className="w-px h-10 bg-slate-50" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
                            <span className="text-lg font-black text-emerald-600 tracking-tighter">{stats.compliance_rate || 0}%</span>
                        </div>
                    </div>
                    {(role === 'fleet_manager' || role === 'administrator') && (
                        <Button
                            variant="outline"
                            className="bg-white hover:bg-slate-50 border-slate-200 shadow-sm px-6 h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                            asChild
                        >
                            <Link href="/maintenance/settings">
                                <Settings className="mr-2 h-4 w-4" /> Settings
                            </Link>
                        </Button>
                    )}
                    <Button
                        className="bg-slate-950 hover:bg-slate-900 shadow-2xl px-8 h-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] group border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 transition-all"
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" /> Request Repair
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-start">
                {COLUMNS.map((col) => (
                    <div 
                        key={col.id} 
                        className="space-y-6"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col)}
                    >
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl shadow-sm", col.bg)}>
                                    <col.icon className={cn("h-4 w-4", col.color)} />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        {col.title}
                                    </h3>
                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none mt-1">
                                        {jobsByStatus[col.id]?.length || 0} Assets
                                    </p>
                                </div>
                            </div>
                            {/* <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-900 rounded-xl">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button> */}
                        </div>

                        <div className="space-y-5 min-h-[600px] p-2 rounded-[32px] bg-slate-100/30 border border-slate-100/50">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-40 w-full rounded-[24px] bg-white shadow-sm" />
                                ))
                            ) : jobsByStatus[col.id]?.length ? (
                                jobsByStatus[col.id].map((job) => (
                                    <JobCard 
                                        key={job.id} 
                                        job={job} 
                                        onDelete={() => setDeleteTarget(job)}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 px-6 text-center opacity-30">
                                    <div className="h-12 w-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mb-4">
                                        <Wrench className="h-5 w-5 text-slate-300" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Free Lane</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <CreateJobModal open={createOpen} onOpenChange={setCreateOpen} />

            <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <DialogContent className="sm:max-w-[400px] rounded-[32px] p-0 overflow-hidden border-none shadow-3xl">
                    <div className="p-8 space-y-6 bg-white">
                        <div className="text-center space-y-4">
                            <div className="h-14 w-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
                                <Trash2 className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight italic">Discard Request?</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                This will permanently remove the maintenance request for 
                                <span className="text-slate-900 ml-1 italic">{deleteTarget?.relationships?.vehicle?.registration_number}</span>.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 h-14 rounded-[18px]"
                            >
                                Keep it
                            </Button>
                            <Button 
                                onClick={() => deleteJob(deleteTarget.id)}
                                disabled={isDeleting}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-14 rounded-[18px] font-black uppercase text-[10px] tracking-[0.2em]"
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Discard'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function CreateJobModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const queryClient = useQueryClient()
    const { can } = usePermission()
    const [form, setForm] = React.useState({ vehicle_id: '', title: '', description: '', fault_category: '', cost_estimate: '' })
    const isSpecialist = can('administrator') || can('*') || usePermission().role === 'fleet_manager'

    const { data: vehiclesData } = useVehiclesDropdown(open)

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
        onError: (err: unknown) => toast.error(extractApiError(err, 'Failed to create job.')),
    })

    const canSubmit = form.vehicle_id && form.title && form.fault_category

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px] rounded-[32px] p-0 overflow-hidden border-none shadow-3xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-10 bg-slate-900 text-white relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#0055FF]/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-4">
                        <div className="p-3 bg-[#0055FF] rounded-2xl shadow-lg shadow-[#0055FF]/20">
                            <Wrench className="h-5 w-5 text-white" />
                        </div>
                        Request a Repair
                    </DialogTitle>
                </DialogHeader>
                <div className="p-10 space-y-6 bg-white overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Strategic Asset</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between h-14 rounded-[18px] border-slate-100 bg-slate-50 font-black text-[11px] uppercase px-6 focus:ring-[#0055FF]"
                                    >
                                        {form.vehicle_id ? (
                                            <div className="flex items-center gap-2">
                                                <Car className="h-4 w-4 text-[#0055FF]" />
                                                <span>
                                                    {vehiclesData?.data?.find((v: any) => v.id.toString() === form.vehicle_id)?.attributes.registration_number}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">Select asset for service</span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-slate-100" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search registration number..." />
                                        <CommandList className="max-h-[250px]">
                                            <CommandEmpty>No asset found.</CommandEmpty>
                                            <CommandGroup>
                                                {vehiclesData?.data?.map((v: any) => (
                                                    <CommandItem
                                                        key={v.id}
                                                        value={v.attributes.registration_number}
                                                        onSelect={() => {
                                                            setForm(f => ({ ...f, vehicle_id: v.id.toString() }))
                                                        }}
                                                        className="font-black uppercase text-[10px] py-3 px-4"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                form.vehicle_id === v.id.toString() ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span>{v.attributes.registration_number}</span>
                                                            <span className="text-[9px] text-slate-400 italic font-bold">
                                                                {v.attributes.make} {v.attributes.model}
                                                            </span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mission Description</Label>
                            <Input className="h-14 rounded-[18px] border-slate-100 bg-slate-50 font-black text-[11px] uppercase px-6 focus:ring-[#0055FF]" placeholder="e.g. Full engine diagnostic & repair" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Fault Category</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                            "w-full justify-between h-14 rounded-[18px] border-slate-100 bg-slate-50 font-black text-[11px] uppercase px-6 focus:ring-[#0055FF]",
                                            !form.fault_category && "text-slate-400"
                                        )}
                                    >
                                        {form.fault_category ? form.fault_category.replace(/_/g, ' ') : "Select Category"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-slate-100" align="start">
                                    <Command>
                                        <CommandList>
                                            <CommandGroup>
                                                {['engine', 'brakes', 'electrical', 'bodywork', 'suspension', 'transmission', 'tyres', 'fuel_system', 'other'].map(c => (
                                                    <CommandItem
                                                        key={c}
                                                        value={c}
                                                        onSelect={() => setForm(f => ({ ...f, fault_category: c }))}
                                                        className="font-black uppercase text-[10px] py-3 px-4"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                form.fault_category === c ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {c.replace(/_/g, ' ')}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        {isSpecialist ? (
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Budget (₦) - Optional</Label>
                                <Input type="number" min={0} className="h-14 rounded-[18px] border-slate-100 bg-slate-50 font-black text-[11px] uppercase px-6 focus:ring-[#0055FF]" placeholder="Estimated cost..." value={form.cost_estimate} onChange={e => setForm(f => ({ ...f, cost_estimate: e.target.value }))} />
                            </div>
                        ) : (
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Estimated Cost (₦) - Optional</Label>
                                <Input type="number" min={0} className="h-14 rounded-[18px] border-slate-100 bg-slate-50 font-black text-[11px] uppercase px-6 focus:ring-[#0055FF]" placeholder="0.00" value={form.cost_estimate} onChange={e => setForm(f => ({ ...f, cost_estimate: e.target.value }))} />
                            </div>
                        )}
                        <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Detailed Explanation</Label>
                            <Textarea className="rounded-[20px] border-slate-100 bg-slate-50 min-h-[100px] font-medium text-sm p-6 focus:ring-[#0055FF]" placeholder="Describe the fault in detail..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Photo Evidence (Optional)</Label>
                            <div className="border-2 border-dashed border-slate-100 rounded-[20px] p-8 flex flex-col items-center justify-center gap-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                                    <Plus className="h-5 w-5 text-slate-400" />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attach Images</p>
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400 hover:bg-slate-100 rounded-xl px-6">Discard</Button>
                    <Button onClick={() => create()} disabled={isPending || !canSubmit} className="bg-slate-900 hover:bg-black text-white px-10 h-14 rounded-[18px] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl transition-all hover:-translate-y-1">
                        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Order'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const STATUS_STYLES: Record<string, string> = {
    draft:                'bg-slate-100 text-slate-500',
    submitted:            'bg-blue-50 text-blue-600',
    needs_inspection:     'bg-amber-50 text-amber-600',
    pending_inspection:   'bg-amber-50 text-amber-600',
    pending_approval:     'bg-orange-50 text-orange-600',
    pending_finance_approval: 'bg-orange-50 text-orange-600',
    approved:             'bg-emerald-50 text-emerald-600',
    assigned:             'bg-teal-50 text-teal-600',
    in_progress:          'bg-blue-50 text-blue-700',
    pending_verification: 'bg-purple-50 text-purple-600',
    reopened:             'bg-rose-50 text-rose-600',
    closed:               'bg-slate-100 text-slate-500',
    completed:            'bg-green-50 text-green-600',
    cancelled:            'bg-red-50 text-red-500',
    rejected:             'bg-red-50 text-red-500',
}

function JobCard({ job, onDelete }: { job: any; onDelete: () => void }) {
    const attrs = job.attributes
    const vehicle = job.relationships?.vehicle
    const technician = job.relationships?.technician

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('jobId', job.id.toString())
    }

    return (
        <Card 
            draggable
            onDragStart={handleDragStart}
            className="border-none shadow-sm hover:shadow-2xl transition-all duration-500 group cursor-grab active:cursor-grabbing overflow-hidden bg-white rounded-[24px] relative"
        >
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-white/80 backdrop-blur shadow-sm border border-slate-100 flex items-center justify-center hover:bg-white transition-all">
                            <MoreHorizontal className="h-3 w-3 text-slate-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-2xl border-slate-100 shadow-xl p-2">
                        <DropdownMenuItem asChild>
                            <Link href={`/maintenance/jobs/${job.id}`} className="rounded-xl flex items-center gap-3 px-3 py-2 cursor-pointer focus:bg-slate-50 transition-colors">
                                <Search className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Inspect</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={onDelete}
                            className="rounded-xl flex items-center gap-3 px-3 py-2 cursor-pointer focus:bg-rose-50 transition-colors group/del"
                        >
                            <Trash2 className="h-3.5 w-3.5 text-slate-400 group-hover/del:text-rose-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover/del:text-rose-600">Discard</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <Link href={`/maintenance/jobs/${job.id}`} className="block">
                <CardContent className="p-6">
                <div className="space-y-5">
                    <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-[0.2em] border-slate-100 text-slate-400 rounded-full px-3 py-1 bg-slate-50/50">
                            #{job.id.toString().padStart(4, '0')}
                        </Badge>
                        <span className={cn(
                            'text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full',
                            STATUS_STYLES[attrs.status?.toLowerCase()] ?? 'bg-slate-100 text-slate-500'
                        )}>
                            {attrs.status?.replace(/_/g, ' ') ?? '—'}
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-[#0055FF] transition-colors line-clamp-2">
                            {attrs.title || attrs.service_type?.replace(/_/g, ' ') || 'General Maintenance'}
                        </h4>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#0055FF]" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                {vehicle?.registration_number || attrs.vehicle_id}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                                {attrs.created_at
                                    ? new Date(attrs.created_at).toLocaleDateString()
                                    : attrs.scheduled_at
                                        ? new Date(attrs.scheduled_at).toLocaleDateString()
                                        : 'Pending'}
                            </span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#0055FF] group-hover:text-white transition-all text-slate-200">
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </div>
                </div>

                {attrs.status === 'in_progress' && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-50 overflow-hidden">
                        <div className="h-full bg-[#0055FF] w-1/3 animate-progress origin-left" />
                    </div>
                )}
            </CardContent>
            </Link>
        </Card>
    )
}

