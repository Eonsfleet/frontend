'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RoleGate } from '@/components/shared/RoleGate'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/vendors'
import { toast } from 'sonner'
import { Loader2, Wrench, Clock, CheckCircle2, AlertCircle, PlayCircle, Truck, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatDistanceToNow } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function WorkshopPortalPage() {
    const queryClient = useQueryClient()
    const [selectedJob, setSelectedJob] = useState<api.WorkshopJob | null>(null)
    const [completionNotes, setCompletionNotes] = useState('')

    const { data: jobsData, isLoading } = useQuery({
        queryKey: ['workshop-jobs'],
        queryFn: api.getWorkshopJobs
    })

    const acceptMutation = useMutation({
        mutationFn: api.acceptJob,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] })
            toast.success('Job accepted. You may begin repairs.')
        }
    })

    const completeMutation = useMutation({
        mutationFn: (data: { id: string; notes: string }) => api.completeJob(data.id, data.notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] })
            toast.success('Job marked as completed.')
            setSelectedJob(null)
            setCompletionNotes('')
        }
    })

    const handleAccept = (jobId: string) => {
        acceptMutation.mutate(jobId)
    }

    const columns: { id: api.WorkshopJob['status']; title: string; icon: any; color: string; border: string }[] = [
        { id: 'pending', title: 'Pending Approval', icon: AlertCircle, color: 'bg-amber-50 text-amber-900', border: 'border-amber-200' },
        { id: 'accepted', title: 'Ready / Queued', icon: Clock, color: 'bg-indigo-50 text-indigo-900', border: 'border-indigo-200' },
        { id: 'in_progress', title: 'In Progress', icon: PlayCircle, color: 'bg-sky-50 text-sky-900', border: 'border-sky-200' },
        { id: 'completed', title: 'Finished', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-900', border: 'border-emerald-200' },
    ]

    const jobs = jobsData?.data || []

    return (
        <RoleGate allowedRoles={['vendor']} fallbackMessage="The Workshop Portal is exclusively available to certified EonsFleet vendors.">
            <div className="p-6 lg:p-8 space-y-6 max-h-[calc(100vh-64px)] flex flex-col">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workshop & Service Portal</h1>
                    <p className="text-slate-500 mt-1">Review assigned repair jobs, update statuses, and log your service completions.</p>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
                ) : (
                    <Tabs defaultValue="board" className="flex-1 flex flex-col min-h-0">
                        <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 rounded-none h-auto p-0 space-x-6 mb-4">
                            <TabsTrigger value="board" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-2 py-3">Kanban Board</TabsTrigger>
                            <TabsTrigger value="metrics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-2 py-3">Metrics & History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="board" className="flex-1 overflow-x-auto overflow-y-hidden pb-4 mt-0 border-0 p-0 outline-none">
                            <div className="flex gap-6 h-full min-w-max">
                                {columns.map(col => {
                                    const columnJobs = jobs.filter(j => j.status === col.id)

                                    return (
                                        <div key={col.id} className="w-80 flex flex-col h-full bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                            <div className={`p-4 border-b ${col.border} ${col.color} flex justify-between items-center`}>
                                                <h3 className="font-bold flex items-center gap-2">
                                                    <col.icon className="w-4 h-4" />
                                                    {col.title}
                                                </h3>
                                                <Badge variant="secondary" className="bg-white/50">{columnJobs.length}</Badge>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                                {columnJobs.length === 0 && (
                                                    <div className="text-center py-10 opacity-50">
                                                        <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                                        <p className="text-sm font-medium">No jobs in this stage.</p>
                                                    </div>
                                                )}
                                                {columnJobs.map(job => (
                                                    <Card key={job.id} className="shadow-sm border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                                                        <CardHeader className="p-4 pb-2">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{job.id.split('-')[0]}</Badge>
                                                                <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDistanceToNow(new Date(job.reported_at))}</span>
                                                            </div>
                                                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                                                <Truck className="w-4 h-4 text-slate-400" />
                                                                {job.vehicle.make} {job.vehicle.model}
                                                            </CardTitle>
                                                            <CardDescription className="text-xs font-mono text-indigo-600 mt-1">{job.vehicle.plate_number}</CardDescription>
                                                        </CardHeader>
                                                        <CardContent className="p-4 pt-0">
                                                            <p className="text-xs text-slate-600 line-clamp-2 mt-2 bg-slate-50 p-2 rounded-md border border-slate-100 italic">"{job.description}"</p>
                                                        </CardContent>
                                                        {job.status === 'pending' && (
                                                            <div className="border-t border-slate-100 p-2 bg-amber-50/30 flex justify-end">
                                                                <Button size="sm" className="w-full text-xs h-8 bg-amber-600 hover:bg-amber-700" onClick={() => handleAccept(job.id)}>
                                                                    Accept Job
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {(job.status === 'accepted' || job.status === 'in_progress') && (
                                                            <div className="border-t border-slate-100 p-2 flex justify-end">
                                                                <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => setSelectedJob(job)}>
                                                                    Update Status
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </TabsContent>

                        <TabsContent value="metrics" className="flex-1 overflow-y-auto mt-0 border-0 p-0 outline-none">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-sm font-medium text-slate-500">Jobs Completed</p>
                                        <h3 className="text-2xl font-bold text-slate-900 mt-1">142</h3>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-sm font-medium text-slate-500">Average Turnaround</p>
                                        <h3 className="text-2xl font-bold text-slate-900 mt-1">2.4 Days</h3>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-sm font-medium text-slate-500">SLA Compliance</p>
                                        <h3 className="text-2xl font-bold text-emerald-600 mt-1">98.5%</h3>
                                    </CardContent>
                                </Card>
                            </div>
                            <Card className="shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold">Recent Completions</CardTitle>
                                    <CardDescription>A log of your historical repairs and invoices.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-slate-500 py-8 text-center border-dashed border-2 border-slate-100 rounded-lg bg-slate-50/50">Historical log table mapped here...</div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Workshop Job</DialogTitle>
                        <DialogDescription>
                            Marking this job as complete will notify the fleet manager.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedJob && (
                        <div className="space-y-4 pt-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                                <span className="font-bold block mb-1">Vehicle:</span>
                                {selectedJob.vehicle.make} {selectedJob.vehicle.model} ({selectedJob.vehicle.plate_number})
                            </div>
                            <div className="space-y-2">
                                <Label>Service Notes / Parts Used <span className="text-red-500">*</span></Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    placeholder="Briefly describe the repairs performed..."
                                    value={completionNotes}
                                    onChange={(e) => setCompletionNotes(e.target.value)}
                                />
                            </div>
                            <DialogFooter className="pt-2">
                                <Button
                                    onClick={() => completeMutation.mutate({ id: selectedJob.id, notes: completionNotes })}
                                    disabled={completeMutation.isPending || completionNotes.length < 5}
                                    className="bg-emerald-600 hover:bg-emerald-700 w-full"
                                >
                                    {completeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Submit Final Report
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </RoleGate>
    )
}
