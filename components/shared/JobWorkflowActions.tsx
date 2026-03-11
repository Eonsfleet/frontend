'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transitionMaintenanceJob, approveMaintenanceJob, getWorkflowSettings } from '@/lib/api/maintenance'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Search, Wrench, Send, ClipboardCheck } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface JobWorkflowActionsProps {
    jobId: string | number
    currentStatus: string
    estimatedCost: number // in kobo
}

export function JobWorkflowActions({ jobId, currentStatus, estimatedCost }: JobWorkflowActionsProps) {
    const queryClient = useQueryClient()
    const { role } = usePermission()
    const { data: settingsData } = useQuery({
        queryKey: ['workflow-settings', 'maintenance'],
        queryFn: () => getWorkflowSettings('maintenance'),
        staleTime: 1000 * 60 * 5, // 5 mins
    })

    const costThreshold = settingsData?.data?.settings?.cost_threshold 
        ? settingsData.data.settings.cost_threshold * 100 // convert naira to kobo
        : 10000000 // default 100k
    const [open, setOpen] = React.useState(false)
    const [action, setAction] = React.useState<string | null>(null)
    const [notes, setNotes] = React.useState('')
    const [actualCost, setActualCost] = React.useState('')

    const { mutate: transition, isPending } = useMutation({
        mutationFn: (data: { to_status: string; notes?: string }) => 
            transitionMaintenanceJob(jobId, data),
        onSuccess: () => {
            toast.success('Workflow advanced successfully')
            queryClient.invalidateQueries({ queryKey: ['maintenance-job', jobId.toString()] })
            setOpen(false)
            setNotes('')
            setAction(null)
        },
        onError: () => toast.error('Failed to update status'),
    })

    const { mutate: approve, isPending: isApproving } = useMutation({
        mutationFn: (data: { decision: 'approved' | 'rejected'; reason?: string }) => 
            approveMaintenanceJob(jobId, data),
        onSuccess: () => {
            toast.success('Decision recorded')
            queryClient.invalidateQueries({ queryKey: ['maintenance-job', jobId.toString()] })
            setOpen(false)
            setAction(null)
        },
    })

    const { mutate: completeJobMutate, isPending: isCompleting } = useMutation({
        mutationFn: (data: { actual_cost_kobo: number }) => 
            transitionMaintenanceJob(jobId, { to_status: 'pending_verification', notes: 'Repair completed by workshop', ...data } as any),
        onSuccess: () => {
            toast.success('Repair marked as complete')
            queryClient.invalidateQueries({ queryKey: ['maintenance-job', jobId.toString()] })
            setOpen(false)
            setAction(null)
        }
    })

    const renderActions = () => {
        const isManager = role === 'fleet_manager' || role === 'administrator'
        const isFinance = role === 'finance'
        const isWorkshop = role === 'vendor' || role === 'mechanic'

        switch (currentStatus) {
            case 'submitted':
                if (isManager) {
                    return (
                        <Button className="bg-[#0055FF] hover:bg-blue-700" onClick={() => transition({ to_status: 'pending_inspection' })}>
                            <Search className="mr-2 h-4 w-4" /> Begin Inspection
                        </Button>
                    )
                }
                break
            
            case 'pending_inspection':
                if (isManager) {
                    return (
                        <Button className="bg-[#0055FF] hover:bg-blue-700 font-bold" onClick={() => {
                            setAction('inspection_done')
                            setOpen(true)
                        }}>
                            <ClipboardCheck className="mr-2 h-4 w-4" /> Mark Inspection Done
                        </Button>
                    )
                }
                break

            case 'pending_approval':
                if (isManager) {
                    if (estimatedCost <= costThreshold) {
                        return (
                            <div className="flex gap-2">
                                <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={() => approve({ decision: 'approved' })}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Direct Approve
                                </Button>
                                <Button variant="outline" className="text-rose-600 border-rose-100 hover:bg-rose-50 font-bold" onClick={() => approve({ decision: 'rejected' })}>
                                    <XCircle className="mr-2 h-4 w-4" /> Reject
                                </Button>
                            </div>
                        )
                    } else {
                        return (
                            <Button className="bg-amber-600 hover:bg-amber-700 font-bold" onClick={() => transition({ to_status: 'pending_finance_approval' })}>
                                Route to Finance (High Cost)
                            </Button>
                        )
                    }
                }
                break

            case 'pending_finance_approval':
                if (isFinance) {
                    return (
                        <div className="flex gap-2">
                            <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={() => approve({ decision: 'approved' })}>Approve Cost</Button>
                            <Button variant="outline" className="text-rose-600 font-bold" onClick={() => approve({ decision: 'rejected' })}>Reject</Button>
                        </div>
                    )
                }
                break

            case 'approved':
                if (isManager) {
                    return (
                        <Button className="bg-[#0055FF] hover:bg-blue-700 font-bold" onClick={() => toast.info('Please select a workshop in the "Assign" tab')}>
                            <Send className="mr-2 h-4 w-4" /> Assign Workshop
                        </Button>
                    )
                }
                break

            case 'assigned':
                if (isWorkshop || isManager) {
                    return (
                        <Button className="bg-blue-600 font-bold" onClick={() => transition({ to_status: 'in_progress' })}>
                            <Wrench className="mr-2 h-4 w-4" /> Start Repair
                        </Button>
                    )
                }
                break

            case 'in_progress':
                if (isWorkshop) {
                    return (
                        <Button className="bg-emerald-600 font-bold shadow-lg shadow-emerald-100" onClick={() => {
                            setAction('mark_complete')
                            setOpen(true)
                        }}>
                            Mark Complete
                        </Button>
                    )
                }
                break

            case 'pending_verification':
                if (isManager) {
                    return (
                        <div className="flex gap-2">
                            <Button className="bg-emerald-600 font-bold" onClick={() => transition({ to_status: 'closed' })}>Verify & Close</Button>
                            <Button variant="outline" className="text-rose-600 font-bold border-rose-100" onClick={() => {
                                setAction('reopen')
                                setOpen(true)
                            }}>Reopen (Failed)</Button>
                        </div>
                    )
                }
                break

            default:
                return null
        }
    }

    const handleConfirm = () => {
        if (action === 'inspection_done') {
            transition({ to_status: 'pending_approval', notes })
        } else if (action === 'mark_complete') {
            const cost = actualCost ? Math.round(parseFloat(actualCost) * 100) : 0
            completeJobMutate({ actual_cost_kobo: cost })
        } else if (action === 'reopen') {
            transition({ to_status: 'reopened', notes })
        }
    }

    return (
        <>
            <div className="flex gap-2">
                {renderActions()}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="rounded-[32px] p-8 max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight italic">
                            {action === 'inspection_done' && 'Inspection Results'}
                            {action === 'mark_complete' && 'Repair Completion'}
                            {action === 'reopen' && 'Reopening Reason'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {action === 'mark_complete' && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actual Cost (₦)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={actualCost}
                                    onChange={(e) => setActualCost(e.target.value)}
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {action === 'inspection_done' ? 'Inspection Notes' : 'Description / Reason'}
                            </Label>
                            <Textarea 
                                placeholder="Details..." 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="rounded-[20px] border-slate-100 bg-slate-50 min-h-[120px] font-medium text-sm p-4 focus:ring-[#0055FF]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-400 px-6">Cancel</Button>
                        <Button 
                            disabled={isPending || isCompleting || isApproving} 
                            onClick={handleConfirm}
                            className="bg-slate-900 text-white rounded-[18px] px-8 font-black uppercase text-[10px] tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
                        >
                            {(isPending || isCompleting || isApproving) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
