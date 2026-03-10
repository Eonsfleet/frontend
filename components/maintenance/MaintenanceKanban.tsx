'use client'

import React from 'react'
import { MaintenanceJob, MaintenanceJobStatus } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { Wrench, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transitionMaintenanceJob } from '@/lib/api/maintenance'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const COLUMNS: { id: MaintenanceJobStatus; label: string; color: string }[] = [
    { id: 'draft', label: 'Draft', color: 'bg-slate-100 text-slate-700' },
    { id: 'submitted', label: 'Submitted', color: 'bg-amber-100 text-amber-800' },
    { id: 'approved', label: 'Approved', color: 'bg-blue-100 text-blue-800' },
    { id: 'in_progress', label: 'In Progress', color: 'bg-violet-100 text-violet-800' },
    { id: 'pending_verification', label: 'Pending Verification', color: 'bg-orange-100 text-orange-800' },
    { id: 'verified', label: 'Verified', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'closed', label: 'Closed', color: 'bg-slate-200 text-slate-800' },
    { id: 'rejected', label: 'Rejected', color: 'bg-rose-100 text-rose-800' },
]

interface MaintenanceKanbanProps {
    jobs: MaintenanceJob[]
    isLoading?: boolean
}

export function MaintenanceKanban({ jobs, isLoading }: MaintenanceKanbanProps) {
    const queryClient = useQueryClient()

    // Simple transition logic for MVP without full drag-and-drop
    // In a real kanban, we'd use @dnd-kit or react-beautiful-dnd
    const { mutate: updateStatus, isPending } = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => transitionMaintenanceJob(id, { to_status: status }),
        onSuccess: () => {
            toast.success('Job status updated')
            queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] })
        },
        onError: () => toast.error('Failed to update status')
    })

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading job board...</div>
    }

    const jobsByStatus = COLUMNS.reduce((acc, col) => {
        acc[col.id] = jobs?.filter(job => job.attributes.status === col.id) || []
        return acc
    }, {} as Record<MaintenanceJobStatus, MaintenanceJob[]>)

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'text-rose-600 bg-rose-50 border-rose-200'
            case 'high': return 'text-amber-600 bg-amber-50 border-amber-200'
            case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
            default: return 'text-slate-600 bg-slate-50 border-slate-200'
        }
    }

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-12rem)]">
            {COLUMNS.map((column) => (
                <div key={column.id} className="flex-shrink-0 w-80 bg-slate-100/50 rounded-xl border border-slate-200 flex flex-col h-full overflow-hidden">
                    <div className="p-3 border-b border-slate-200 bg-white/50 flex items-center justify-between sticky top-0">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${column.color.split(' ')[0]}`} />
                            <h3 className="font-semibold text-slate-900 text-sm">{column.label}</h3>
                        </div>
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                            {jobsByStatus[column.id].length}
                        </Badge>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                        {jobsByStatus[column.id].map(job => (
                            <Card key={job.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group border-slate-200">
                                <Link href={`/maintenance/jobs/${job.id}`}>
                                    <div className="p-4 flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <Badge variant="outline" className="text-[10px] font-mono uppercase bg-slate-50">
                                                {job.attributes.reference_number}
                                            </Badge>
                                            <Badge variant="outline" className={`text-[10px] capitalize ${getPriorityColor(job.attributes.priority)}`}>
                                                {job.attributes.priority}
                                            </Badge>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                                                {job.attributes.description}
                                            </h4>
                                            {job.relationships?.vehicle && (
                                                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                                                    <Wrench className="h-3 w-3" />
                                                    <span>{'registration_number' in job.relationships.vehicle ? job.relationships.vehicle.registration_number : (job.relationships.vehicle as any).data?.id}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span>{job.attributes.scheduled_date ? format(new Date(job.attributes.scheduled_date), 'MMM dd') : 'TBD'}</span>
                                            </div>

                                            {job.relationships.assignee?.data ? (
                                                <div className="flex -space-x-1">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[10px] font-bold text-blue-700">
                                                        {job.relationships.assignee.data.id.substring(0, 2).toUpperCase()}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>

                                {/* Quick Actions (MVP - usually would be DND) */}
                                <div className="px-4 pb-3 pt-0 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs w-full"
                                        disabled={isPending}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            // Simplistic next-status logic
                                            const currIdx = COLUMNS.findIndex(c => c.id === job.attributes.status)
                                            if (currIdx < COLUMNS.length - 1) {
                                                updateStatus({ id: job.id, status: COLUMNS[currIdx + 1].id })
                                            }
                                        }}
                                    >
                                        Advance Status
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        {jobsByStatus[column.id].length === 0 && (
                            <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                                <span className="text-xs text-slate-400">No jobs</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
