'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react'
import { IncidentStatus } from '@/types'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/incidents'

interface ActionConfig {
    label: string
    variant: 'default' | 'destructive' | 'outline' | 'secondary'
    actionFn: (id: string, note?: string) => Promise<any>
}

const MACHINE_STATES: Record<IncidentStatus, ActionConfig[]> = {
    reported: [
        { label: 'Start Investigation', variant: 'default', actionFn: api.startInvestigation },
        { label: 'Dismiss Incident', variant: 'destructive', actionFn: api.dismissIncident },
    ],
    investigating: [
        { label: 'Action Required', variant: 'secondary', actionFn: api.requireAction },
        { label: 'Escalate to Management', variant: 'destructive', actionFn: api.escalateIncident },
        { label: 'Cancel Report', variant: 'outline', actionFn: api.cancelIncident },
    ],
    action_required: [
        { label: 'Log Action Taken', variant: 'default', actionFn: api.logActionTaken },
        { label: 'Escalate', variant: 'destructive', actionFn: api.escalateIncident },
    ],
    action_taken: [
        { label: 'Mark Pending Resolution', variant: 'default', actionFn: (id, note) => api.transitionIncidentState(id, 'pending-resolution', { note }) },
        { label: 'Revert to Investingating', variant: 'outline', actionFn: api.startInvestigation },
    ],
    pending_resolution: [
        { label: 'Resolve Incident', variant: 'default', actionFn: api.resolveIncident },
        { label: 'More Action Required', variant: 'outline', actionFn: api.requireAction },
    ],
    resolved: [
        { label: 'Close Record', variant: 'secondary', actionFn: api.closeIncident },
        { label: 'Re-open Investigation', variant: 'outline', actionFn: api.startInvestigation },
    ],
    escalated: [
        { label: 'Resume Investigation', variant: 'default', actionFn: api.startInvestigation },
        { label: 'Close as Unresolved', variant: 'destructive', actionFn: api.closeIncident },
    ],
    closed: [], // Terminal
    cancelled: [], // Terminal
    dismissed: [], // Terminal
}

export function IncidentWorkflowActions({ id, currentStatus }: { id: string, currentStatus: IncidentStatus }) {
    const queryClient = useQueryClient()
    const [note, setNote] = useState('')
    const availableActions = MACHINE_STATES[currentStatus] || []

    const isTerminal = ['closed', 'cancelled', 'dismissed'].includes(currentStatus)

    const { mutate: executeAction, isPending } = useMutation({
        mutationFn: async ({ actionConfig }: { actionConfig: ActionConfig }) => {
            return actionConfig.actionFn(id, note)
        },
        onSuccess: () => {
            toast.success('Incident status updated')
            setNote('')
            queryClient.invalidateQueries({ queryKey: ['incident', id] })
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update incident state')
        }
    })

    if (isTerminal) {
        return (
            <Card className="border-slate-200 shadow-sm opacity-75 bg-slate-50">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-slate-400" />
                    <div>
                        <CardTitle className="text-base text-slate-600">Workflow Completed</CardTitle>
                        <CardDescription>This incident has reached a terminal state ({currentStatus}) and cannot be transitioned further.</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 shadow-sm border-l-4 border-l-blue-600">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-blue-600" /> Resolution Workflow
                </CardTitle>
                <CardDescription>Advance this incident to the next state by selecting an action below.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100 mb-2">
                    <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                        Current Status <ArrowRight className="h-4 w-4 text-blue-400" /> <span className="uppercase tracking-wider px-2 py-0.5 bg-blue-100 rounded text-blue-800">{currentStatus.replace(/_/g, ' ')}</span>
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Transition Note <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <Textarea
                        placeholder="Add internal notes to explain this state change..."
                        value={note}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                        className="bg-white min-h-[100px]"
                    />
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex flex-wrap gap-3 justify-end leading-none rounded-b-lg">
                {availableActions.map((action, idx) => (
                    <Button
                        key={idx}
                        variant={action.variant}
                        onClick={() => executeAction({ actionConfig: action })}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        {action.label}
                    </Button>
                ))}
            </CardFooter>
        </Card>
    )
}
