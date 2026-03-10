'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react'
import { IncidentStatus } from '@/types'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
    startInvestigation,
    requireAction,
    logActionTaken,
    submitForResolution,
    resolveIncident,
    closeIncident,
    cancelIncident,
    dismissIncident,
    escalateIncident,
} from '@/lib/api/incidents'

interface ActionConfig {
    label: string
    variant: 'default' | 'destructive' | 'outline' | 'secondary'
    /** Which input fields are required/visible for this action */
    needsAssignee?: boolean
    needsSeverity?: boolean
    /** Human-readable label for the note textarea when shown */
    noteLabel?: string
    execute: (id: string, inputs: ActionInputs) => Promise<any>
}

interface ActionInputs {
    note: string
    assignedTo: string
    severity: string
}

const MACHINE_STATES: Partial<Record<IncidentStatus, ActionConfig[]>> = {
    reported: [
        {
            label: 'Start Investigation',
            variant: 'default',
            needsAssignee: true,
            execute: (id, { assignedTo }) => startInvestigation(id, assignedTo || id),
        },
        {
            label: 'Dismiss Incident',
            variant: 'destructive',
            noteLabel: 'Reason for dismissal (required)',
            execute: (id, { note }) => dismissIncident(id, note),
        },
    ],
    under_investigation: [
        {
            label: 'Action Required',
            variant: 'secondary',
            execute: (id) => requireAction(id),
        },
        {
            label: 'Escalate to Management',
            variant: 'destructive',
            needsSeverity: true,
            noteLabel: 'Escalation reason (required)',
            execute: (id, { note, severity }) => escalateIncident(id, note, severity || 'high'),
        },
        {
            label: 'Cancel Report',
            variant: 'outline',
            noteLabel: 'Reason for cancellation (required)',
            execute: (id, { note }) => cancelIncident(id, note),
        },
    ],
    action_required: [
        {
            label: 'Log Action Taken',
            variant: 'default',
            noteLabel: 'Describe the action taken (required)',
            execute: (id, { note }) => logActionTaken(id, note),
        },
        {
            label: 'Escalate',
            variant: 'destructive',
            needsSeverity: true,
            noteLabel: 'Escalation reason (required)',
            execute: (id, { note, severity }) => escalateIncident(id, note, severity || 'high'),
        },
    ],
    action_taken: [
        {
            label: 'Mark Pending Resolution',
            variant: 'default',
            noteLabel: 'Resolution notes',
            execute: (id, { note }) => submitForResolution(id, note),
        },
    ],
    pending_resolution: [
        {
            label: 'Resolve Incident',
            variant: 'default',
            noteLabel: 'Resolution notes (required)',
            execute: (id, { note }) => resolveIncident(id, note),
        },
        {
            label: 'More Action Required',
            variant: 'outline',
            execute: (id) => requireAction(id),
        },
    ],
    resolved: [
        {
            label: 'Close Record',
            variant: 'secondary',
            noteLabel: 'Closing notes (optional)',
            execute: (id, { note }) => closeIncident(id, note || undefined),
        },
    ],
    escalated: [
        {
            label: 'Resume Investigation',
            variant: 'default',
            needsAssignee: true,
            execute: (id, { assignedTo }) => startInvestigation(id, assignedTo || id),
        },
        {
            label: 'Close as Unresolved',
            variant: 'destructive',
            noteLabel: 'Closing notes (optional)',
            execute: (id, { note }) => closeIncident(id, note || undefined),
        },
    ],
    closed: [],
    cancelled: [],
    dismissed: [],
}

export function IncidentWorkflowActions({ id, currentStatus }: { id: string; currentStatus: IncidentStatus }) {
    const queryClient = useQueryClient()
    const [note, setNote] = useState('')
    const [assignedTo, setAssignedTo] = useState('')
    const [severity, setSeverity] = useState('high')
    const [activeAction, setActiveAction] = useState<ActionConfig | null>(null)

    const availableActions = MACHINE_STATES[currentStatus] ?? []
    const isTerminal = ['closed', 'cancelled', 'dismissed'].includes(currentStatus)

    const { mutate: executeAction, isPending } = useMutation({
        mutationFn: async (action: ActionConfig) => {
            return action.execute(id, { note, assignedTo, severity })
        },
        onSuccess: () => {
            toast.success('Incident status updated')
            setNote('')
            setAssignedTo('')
            setActiveAction(null)
            queryClient.invalidateQueries({ queryKey: ['incident', id] })
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to update incident state')
        },
    })

    if (isTerminal) {
        return (
            <Card className="border-slate-200 shadow-sm opacity-75 bg-slate-50">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-slate-400" />
                    <div>
                        <CardTitle className="text-base text-slate-600">Workflow Completed</CardTitle>
                        <CardDescription>
                            This incident has reached a terminal state ({currentStatus.replace(/_/g, ' ')}) and cannot be transitioned further.
                        </CardDescription>
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
                <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100">
                    <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
                        Current Status <ArrowRight className="h-4 w-4 text-blue-400" />
                        <span className="uppercase tracking-wider px-2 py-0.5 bg-blue-100 rounded text-blue-800">
                            {currentStatus.replace(/_/g, ' ')}
                        </span>
                    </p>
                </div>

                {/* Contextual inputs — only shown when an action requiring them is selected */}
                {activeAction?.needsAssignee && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Assign Investigator</label>
                        <Input
                            placeholder="Enter user ID or name..."
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            className="bg-white"
                        />
                    </div>
                )}

                {activeAction?.needsSeverity && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Severity</label>
                        <Select value={severity} onValueChange={setSeverity}>
                            <SelectTrigger className="bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {activeAction?.noteLabel && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">
                            {activeAction.noteLabel}
                        </label>
                        <Textarea
                            placeholder="Add notes..."
                            value={note}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                            className="bg-white min-h-[90px]"
                        />
                    </div>
                )}

                {!activeAction && (
                    <p className="text-sm text-slate-500">Select an action below to proceed.</p>
                )}
            </CardContent>

            <CardFooter className="bg-slate-50 border-t border-slate-100 p-4 flex flex-wrap gap-3 justify-end rounded-b-lg">
                {activeAction ? (
                    <>
                        <Button variant="ghost" onClick={() => setActiveAction(null)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant={activeAction.variant}
                            onClick={() => executeAction(activeAction)}
                            disabled={isPending}
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Confirm: {activeAction.label}
                        </Button>
                    </>
                ) : (
                    availableActions.map((action, idx) => (
                        <Button
                            key={idx}
                            variant={action.variant}
                            onClick={() => {
                                // Actions with no extra inputs can fire immediately
                                if (!action.needsAssignee && !action.needsSeverity && !action.noteLabel) {
                                    executeAction(action)
                                } else {
                                    setNote('')
                                    setActiveAction(action)
                                }
                            }}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {action.label}
                        </Button>
                    ))
                )}
            </CardFooter>
        </Card>
    )
}
