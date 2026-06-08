'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import {
    AlertTriangle, Car, Calendar, User, Send,
    MessageSquare, Loader2, ShieldAlert, CheckCircle2,
    Clock, MapPin, Eye, ArrowUpRight, Users,
} from 'lucide-react'
import {
    getIncidentById,
    getIncidentHistory,
    getIncidentConversation,
    postIncidentMessage,
    updateIncident,
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
import { Input } from '@/components/ui/input'
import { WorkflowTimeline } from '@/components/shared/WorkflowTimeline'
import type { ConversationMessage, IncidentStatus, IncidentPerson, IncidentVehicle, UserProfile, WorkflowHistoryEntry } from '@/types'
import { getUsers } from '@/lib/api/settings'

// ── Colour maps ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<IncidentStatus, { badge: string; accent: string; label: string }> = {
    reported:            { badge: 'text-slate-600 bg-slate-100',    accent: 'border-l-slate-400',    label: 'Reported'             },
    under_investigation: { badge: 'text-blue-600 bg-blue-50',       accent: 'border-l-blue-500',     label: 'Under Investigation'  },
    action_required:     { badge: 'text-amber-600 bg-amber-50',     accent: 'border-l-amber-500',    label: 'Action Required'      },
    action_taken:        { badge: 'text-cyan-700 bg-cyan-50',       accent: 'border-l-cyan-500',     label: 'Action Taken'         },
    pending_resolution:  { badge: 'text-purple-600 bg-purple-50',   accent: 'border-l-purple-500',   label: 'Pending Resolution'   },
    resolved:            { badge: 'text-emerald-600 bg-emerald-50', accent: 'border-l-emerald-500',  label: 'Resolved'             },
    closed:              { badge: 'text-white bg-slate-800',        accent: 'border-l-slate-800',    label: 'Closed'               },
    escalated:           { badge: 'text-rose-700 bg-rose-50',       accent: 'border-l-rose-500',     label: 'Escalated'            },
    dismissed:           { badge: 'text-slate-400 bg-slate-100',    accent: 'border-l-slate-200',    label: 'Dismissed'            },
    cancelled:           { badge: 'text-slate-400 bg-slate-100',    accent: 'border-l-slate-200',    label: 'Cancelled'            },
}

const PRIORITY_STYLES: Record<string, { badge: string; label: string }> = {
    critical: { badge: 'text-rose-700 bg-rose-50',     label: 'Critical' },
    high:     { badge: 'text-orange-600 bg-orange-50', label: 'High'     },
    medium:   { badge: 'text-amber-600 bg-amber-50',   label: 'Medium'   },
    low:      { badge: 'text-slate-500 bg-slate-100',  label: 'Low'      },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function personName(p: IncidentPerson | undefined | null): string {
    if (!p) return 'Unknown'
    return p.name ?? ([p.f_name, p.l_name].filter(Boolean).join(' ') || 'Unknown')
}

type IncidentLocationAttrs = {
    location?: string | { address?: string } | null
}

type IncidentAddress = {
    street?: string
    city?: string
    state?: string
    country?: string
}

type IncidentRelationships = {
    address?: IncidentAddress | RelationshipStub
}

type IncidentConversationCache = {
    data?: {
        conversation?: {
            id: number | string
            attributes?: Record<string, unknown>
            relationships?: {
                messages?: ConversationMessage[]
            }
        }
    }
}

function userName(user: UserProfile): string {
    return user.attributes.full_name || `User #${user.id}`
}

function parseCoords(coords?: string | null): { lat: number; lng: number } | null {
    if (!coords) return null
    const [lat, lng] = coords.split(',').map((value) => Number(value.trim()))
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
}

function getLocationName(attrs: IncidentLocationAttrs | null | undefined, rels: IncidentRelationships | null | undefined): string {
    const address = rels?.address
    const addressLine = address && isExpandedRelation(address)
        ? [address.street, address.city, address.state, address.country].filter(Boolean).join(', ')
        : null
    if (addressLine) return addressLine
    if (typeof attrs?.location === 'string' && attrs.location.trim()) return attrs.location
    if (typeof attrs?.location === 'object' && attrs.location?.address) return attrs.location.address
    return 'Incident location'
}

function normalizeMessage(msg: ConversationMessage) {
    const attrs = msg.attributes
    return {
        id: msg.id,
        body: attrs?.body ?? msg.body ?? '',
        senderId: attrs?.sender_id ?? msg.sender_id,
        senderRole: attrs?.sender_role ?? msg.sender_role,
        senderName: msg.sender_name ?? attrs?.sender_name ?? attrs?.sender_role ?? msg.sender_role ?? 'Unknown',
        isInternal: Boolean(attrs?.is_internal ?? msg.is_internal),
        messageType: attrs?.message_type,
        createdAt: attrs?.created_at ?? msg.created_at,
    }
}

function normalizeHistory(entry: WorkflowHistoryEntry) {
    const attrs = entry.attributes
    return {
        id: entry.id,
        fromStatus: attrs?.from_status ?? entry.from_status ?? '',
        toStatus: attrs?.to_status ?? entry.to_status ?? '',
        actor: entry.actor_name ?? attrs?.actor_name ?? attrs?.triggered_by_role ?? entry.actor_role ?? 'System',
        reason: attrs?.reason ?? attrs?.notes ?? entry.reason ?? (entry as any).notes ?? null,
        createdAt: attrs?.created_at ?? entry.created_at ?? null,
    }
}

function safeDate(d: string | null | undefined, fmt = 'dd MMM yyyy, HH:mm'): string {
    if (!d) return '—'
    const parsed = new Date(d)
    return isNaN(parsed.getTime()) ? d : format(parsed, fmt)
}

function MetaLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p className={cn('text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5', className)}>
            {children}
        </p>
    )
}


// ── Workflow action config ────────────────────────────────────────────────────

type ActionVariant = 'default' | 'destructive' | 'outline' | 'secondary'

interface ActionDef {
    key: string
    label: string
    variant: ActionVariant
    needsAssignee?: boolean
    needsSeverity?: boolean
    noteLabel?: string
    execute: (id: string, inputs: { note: string; assignedTo: string; severity: string }) => Promise<unknown>
}

type ApiError = {
    response?: {
        data?: {
            message?: string
        }
    }
}

type RelationshipStub = {
    data: {
        id: string
        type: string
    }
}

function isExpandedRelation<T extends object>(
    value: T | RelationshipStub | null | undefined,
): value is T {
    return !!value && typeof value === 'object' && !('data' in value)
}

const WORKFLOW_ACTIONS: Partial<Record<IncidentStatus, ActionDef[]>> = {
    reported: [
        {
            key: 'investigate',
            label: 'Start Investigation',
            variant: 'default',
            needsAssignee: true,
            execute: (id, { assignedTo }) => startInvestigation(id, assignedTo || id),
        },
        {
            key: 'dismiss',
            label: 'Dismiss',
            variant: 'destructive',
            noteLabel: 'Reason for dismissal (required)',
            execute: (id, { note }) => dismissIncident(id, note),
        },
        {
            key: 'cancel',
            label: 'Cancel',
            variant: 'outline',
            noteLabel: 'Reason for cancellation (required)',
            execute: (id, { note }) => cancelIncident(id, note),
        },
    ],
    under_investigation: [
        {
            key: 'action-required',
            label: 'Action Required',
            variant: 'secondary',
            noteLabel: 'Describe the action plan (required)',
            execute: (id, { note }) => requireAction(id, note),
        },
        {
            key: 'escalate',
            label: 'Escalate',
            variant: 'destructive',
            needsSeverity: true,
            noteLabel: 'Escalation reason (required)',
            execute: (id, { note, severity }) => escalateIncident(id, note, severity || 'high'),
        },
        {
            key: 'cancel',
            label: 'Cancel',
            variant: 'outline',
            noteLabel: 'Reason for cancellation (required)',
            execute: (id, { note }) => cancelIncident(id, note),
        },
    ],
    action_required: [
        {
            key: 'action-taken',
            label: 'Log Action Taken',
            variant: 'default',
            noteLabel: 'Describe the action taken (required)',
            execute: (id, { note }) => logActionTaken(id, note),
        },
        {
            key: 'cancel',
            label: 'Cancel',
            variant: 'outline',
            noteLabel: 'Reason for cancellation (required)',
            execute: (id, { note }) => cancelIncident(id, note),
        },
    ],
    action_taken: [
        {
            key: 'pending-resolution',
            label: 'Submit for Resolution',
            variant: 'default',
            noteLabel: 'Resolution notes',
            execute: (id, { note }) => submitForResolution(id, note),
        },
    ],
    pending_resolution: [
        {
            key: 'resolve',
            label: 'Resolve Incident',
            variant: 'default',
            noteLabel: 'Resolution notes (required)',
            execute: (id, { note }) => resolveIncident(id, note),
        },
    ],
    resolved: [
        {
            key: 'close',
            label: 'Close Incident',
            variant: 'secondary',
            execute: (id) => closeIncident(id),
        },
    ],
    escalated: [
        {
            key: 'investigate',
            label: 'Resume Investigation',
            variant: 'default',
            needsAssignee: true,
            execute: (id, { assignedTo }) => startInvestigation(id, assignedTo || id),
        },
    ],
    closed:    [],
    cancelled: [],
    dismissed: [],
}

// ── WorkflowActions inline sub-component ─────────────────────────────────────

function WorkflowActionsPanel({ id, status }: { id: string; status: IncidentStatus }) {
    const queryClient = useQueryClient()
    const [activeAction, setActiveAction] = useState<ActionDef | null>(null)
    const [note, setNote] = useState('')
    const [assignedTo, setAssignedTo] = useState('')
    const [severity, setSeverity] = useState('high')
    const { data: usersData, isLoading: isLoadingUsers } = useQuery({
        queryKey: ['users-list-simple'],
        queryFn: () => getUsers({ per_page: 100 }),
        enabled: !!activeAction?.needsAssignee,
    })

    const isTerminal = ['closed', 'cancelled', 'dismissed'].includes(status)
    const availableActions = WORKFLOW_ACTIONS[status] ?? []

    const { mutate: executeAction, isPending } = useMutation({
        mutationFn: (action: ActionDef) =>
            action.execute(id, { note, assignedTo, severity }),
        onSuccess: () => {
            toast.success('Incident status updated')
            setNote('')
            setAssignedTo('')
            setActiveAction(null)
            queryClient.invalidateQueries({ queryKey: ['incidents'] })
            queryClient.invalidateQueries({ queryKey: ['incident-detail', id] })
        },
        onError: (err: ApiError) => {
            toast.error(err?.response?.data?.message ?? 'Failed to update incident')
        },
    })

    if (isTerminal) {
        return (
            <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Terminal state — no further actions
                </p>
            </div>
        )
    }

    if (availableActions.length === 0) return null

    return (
        <div className="space-y-3">
            {/* Contextual inputs */}
            {activeAction?.needsAssignee && (
                <div className="space-y-1">
                    <MetaLabel>Assign Investigator</MetaLabel>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder={isLoadingUsers ? 'Loading users...' : 'Select investigator'} />
                        </SelectTrigger>
                        <SelectContent>
                            {usersData?.data?.users?.map((user) => (
                                <SelectItem key={user.id} value={String(user.id)}>
                                    {userName(user)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {activeAction?.needsSeverity && (
                <div className="space-y-1">
                    <MetaLabel>Severity</MetaLabel>
                    <Select value={severity} onValueChange={setSeverity}>
                        <SelectTrigger className="h-8 text-sm">
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
                <div className="space-y-1">
                    <MetaLabel>{activeAction.noteLabel}</MetaLabel>
                    <Textarea
                        placeholder="Add notes..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="min-h-[72px] text-sm resize-none"
                    />
                </div>
            )}

            {/* Buttons row */}
            <div className="flex flex-wrap gap-2">
                {activeAction ? (
                    <>
                        <Button
                            size="sm"
                            variant={activeAction.variant}
                            onClick={() => executeAction(activeAction)}
                            disabled={isPending}
                            className="h-7 text-[9px] font-black uppercase tracking-widest px-3"
                        >
                            {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                            Confirm: {activeAction.label}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setActiveAction(null); setNote(''); setAssignedTo('') }}
                            disabled={isPending}
                            className="h-7 text-[9px] font-black uppercase tracking-widest px-3"
                        >
                            Cancel
                        </Button>
                    </>
                ) : (
                    availableActions.map((action) => (
                        <Button
                            key={action.key}
                            size="sm"
                            variant={action.variant}
                            disabled={isPending}
                            onClick={() => {
                                if (!action.noteLabel && !action.needsAssignee && !action.needsSeverity) {
                                    executeAction(action)
                                } else {
                                    setNote('')
                                    setAssignedTo('')
                                    setActiveAction(action)
                                }
                            }}
                            className="h-7 text-[9px] font-black uppercase tracking-widest px-3"
                        >
                            {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                            {action.label}
                        </Button>
                    ))
                )}
            </div>
        </div>
    )
}

// ── Main drawer ───────────────────────────────────────────────────────────────

interface Props {
    incidentId: string | null
    onClose: () => void
}

export function IncidentDrawer({ incidentId, onClose }: Props) {
    const queryClient = useQueryClient()
    const [messageText, setMessageText] = useState('')
    const [isInternal, setIsInternal] = useState(false)
    const [editingField, setEditingField] = useState<'description' | 'priority' | 'victim_name' | null>(null)
    const [editValue, setEditValue] = useState('')

    const startEdit = (field: 'description' | 'priority' | 'victim_name', current: string) => {
        setEditingField(field)
        setEditValue(current)
    }
    const cancelEdit = () => { setEditingField(null); setEditValue('') }

    const { mutate: saveField, isPending: isSavingField } = useMutation({
        mutationFn: (data: Parameters<typeof updateIncident>[1]) => updateIncident(incidentId!, data),
        onSuccess: () => {
            toast.success('Incident updated')
            queryClient.invalidateQueries({ queryKey: ['incident-detail', incidentId] })
            cancelEdit()
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to save changes'),
    })

    // ── Queries ──────────────────────────────────────────────────────────────
    const {
        data: detailData,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['incident-detail', incidentId],
        queryFn: () => getIncidentById(incidentId!),
        enabled: !!incidentId,
    })

    const { data: historyData, isLoading: isHistoryLoading, isError: isHistoryError } = useQuery({
        queryKey: ['incident-history', incidentId],
        queryFn: () => getIncidentHistory(incidentId!),
        enabled: !!incidentId,
        retry: 1,
    })

    const { data: conversationData, isLoading: isConvLoading, isError: isConvError } = useQuery({
        queryKey: ['incident-conversation', incidentId],
        queryFn: () => getIncidentConversation(incidentId!),
        enabled: !!incidentId,
        retry: 1,
    })

    // ── Send message mutation ────────────────────────────────────────────────
    // messageText is passed as the variable so it's captured at call time,
    // not from the closure that may be stale after setMessageText('') runs.
    const { mutate: sendMessage, isPending: isSending } = useMutation<unknown, Error, { body: string; internal: boolean }>({
        mutationFn: ({ body, internal }) =>
            postIncidentMessage(incidentId!, { body, is_internal: internal }),
        onMutate: async ({ body, internal }) => {
            if (!incidentId) return { previous: undefined }
            await queryClient.cancelQueries({ queryKey: ['incident-conversation', incidentId] })
            const previous = queryClient.getQueryData(['incident-conversation', incidentId])
            queryClient.setQueryData(['incident-conversation', incidentId], (current: IncidentConversationCache | undefined) => {
                const conversation: any = current?.data?.conversation ?? { id: `incident-${incidentId}`, relationships: { messages: [] } }
                const existingMessages: ConversationMessage[] = conversation.relationships?.messages ?? []
                return {
                    ...current,
                    data: {
                        ...current?.data,
                        conversation: {
                            ...conversation,
                            relationships: {
                                ...conversation.relationships,
                                messages: [
                                    ...existingMessages,
                                    {
                                        id: `optimistic-${Date.now()}`,
                                        attributes: {
                                            body,
                                            is_internal: internal,
                                            sender_role: 'You',
                                            created_at: new Date().toISOString(),
                                        },
                                    },
                                ],
                            },
                        },
                    },
                }
            })
            setMessageText('')
            setIsInternal(false)
            return { previous }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incident-conversation', incidentId] })
        },
        onError: (_err: unknown, _vars: unknown, context: unknown) => {
            const ctx = context as { previous: unknown } | undefined
            if (ctx?.previous && incidentId) queryClient.setQueryData(['incident-conversation', incidentId], ctx.previous)
            toast.error('Failed to send message')
        },
    })

    const handleSend = () => {
        const body = messageText.trim()
        if (!body) return
        sendMessage({ body, internal: isInternal })
    }

    // ── Derived state ────────────────────────────────────────────────────────
    const rawIncident = detailData?.data
    const incident = rawIncident?.attributes ? rawIncident : null

    const attrs = incident?.attributes
    const rels = incident?.relationships

    const status = attrs?.status
    const statusStyle = status ? (STATUS_STYLES[status] ?? STATUS_STYLES.reported) : STATUS_STYLES.reported
    const priorityStyle = attrs?.priority ? (PRIORITY_STYLES[attrs.priority] ?? PRIORITY_STYLES.low) : PRIORITY_STYLES.low

    // Normalize person relationships — guard against { data: { id, type } } stubs
    const driverRaw = rels?.driver
    const driver: IncidentPerson | null =
        isExpandedRelation<IncidentPerson>(driverRaw)
            ? driverRaw
            : null

    const reportedByRaw = rels?.reported_by
    const reportedBy: IncidentPerson | null =
        isExpandedRelation<IncidentPerson>(reportedByRaw)
            ? reportedByRaw
            : null

    const assigneeRaw = rels?.assignee
    const assignee: IncidentPerson | null =
        isExpandedRelation<IncidentPerson>(assigneeRaw)
            ? assigneeRaw
            : null

    // Normalize vehicle — guard against stub shape
    const vehicleRaw = rels?.vehicle
    const vehicle: IncidentVehicle | null =
        isExpandedRelation<IncidentVehicle>(vehicleRaw)
            ? vehicleRaw
            : null
    const hasVehicleInfo = !!(vehicle?.make || vehicle?.registration_number)

    // Address
    const coords = parseCoords(attrs?.coords)
    const locationName = getLocationName(attrs, rels)
    const directionsUrl = coords ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}` : null

    // History — try multiple shapes: { data: { history: [] } } or { data: { workflows: [] } } or { data: [] }
    const historyRaw: any = historyData
    const history: WorkflowHistoryEntry[] =
        historyRaw?.data?.history ??
        historyRaw?.data?.workflows ??
        historyRaw?.data?.entries ??
        (Array.isArray(historyRaw?.data) ? historyRaw.data : [])

    // Messages live at data.conversation.relationships.messages (actual API shape)
    const convRaw: any = conversationData
    const messages: ConversationMessage[] =
        convRaw?.data?.conversation?.relationships?.messages ??
        convRaw?.data?.conversation?.messages ??
        convRaw?.data?.messages ??
        (Array.isArray(convRaw?.data) ? convRaw.data : [])

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <Sheet open={!!incidentId} onOpenChange={(open) => { if (!open) onClose() }}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-[1180px] xl:max-w-[1280px] p-0 flex flex-col gap-0 overflow-hidden"
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <SheetHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
                    <SheetTitle
                        className={cn(
                            'text-lg font-black uppercase tracking-tight text-slate-900 leading-tight',
                            isLoading && 'sr-only',
                        )}
                    >
                        {isLoading
                            ? 'Incident Detail'
                            : isError
                            ? 'Failed to load incident'
                            : attrs?.type
                            ? attrs.type.replace(/_/g, ' ')
                            : 'Incident Detail'}
                    </SheetTitle>

                    {isLoading ? (
                        <div className="space-y-2 pt-1">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ) : incident ? (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {/* Status badge */}
                            <span
                                className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest',
                                    statusStyle.badge,
                                )}
                            >
                                {statusStyle.label}
                            </span>
                            {/* Priority badge */}
                            <span
                                className={cn(
                                    'inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest',
                                    priorityStyle.badge,
                                )}
                            >
                                {priorityStyle.label}
                            </span>
                            {attrs?.reference && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    #{attrs.reference}
                                </span>
                            )}
                        </div>
                    ) : null}
                </SheetHeader>

                {/* ── Body — scrollable ───────────────────────────────────── */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 rounded-xl" />
                            ))}
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-rose-500">
                            <AlertTriangle className="h-8 w-8" />
                            <p className="text-sm font-bold">Could not load incident details.</p>
                        </div>
                    ) : incident ? (
                        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0 bg-white">
                            {/* ── LEFT PANEL — history and conversation ──── */}
                            <section className="w-full lg:w-[420px] xl:w-[460px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col min-h-[360px] lg:min-h-0 bg-slate-50/40">
                                <Tabs defaultValue="history" className="flex-1 flex flex-col min-h-0">
                                    <TabsList className="shrink-0 w-full justify-start rounded-none border-b border-slate-100 bg-white px-5 h-11 gap-0">
                                        <TabsTrigger
                                            value="history"
                                            className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3"
                                        >
                                            History
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="conversation"
                                            className="text-[10px] font-black uppercase tracking-widest rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full px-3"
                                        >
                                            Conversation
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="history" className="flex-1 overflow-hidden m-0 min-h-0">
                                        <ScrollArea className="h-full">
                                            {isHistoryLoading ? (
                                                <div className="p-5 space-y-2">
                                                    {Array.from({ length: 4 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-10 rounded-xl" />
                                                    ))}
                                                </div>
                                            ) : isHistoryError ? (
                                                <div className="py-14 text-center">
                                                    <AlertTriangle className="h-6 w-6 text-rose-300 mx-auto mb-2" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        Could not load history
                                                    </p>
                                                </div>
                                            ) : history.length === 0 ? (
                                                <div className="py-14 text-center">
                                                    <Clock className="h-6 w-6 text-slate-200 mx-auto mb-2" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        No history yet
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="p-5">
                                                    <WorkflowTimeline
                                                        history={history.map((e) => {
                                                            const n = normalizeHistory(e)
                                                            return {
                                                                status: n.toStatus,
                                                                actor: n.actor,
                                                                timestamp: n.createdAt,
                                                                reason: n.reason,
                                                            }
                                                        })}
                                                    />
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </TabsContent>

                                    <TabsContent value="conversation" className="flex-1 flex flex-col m-0 min-h-0">
                                        {/* Messages list */}
                                        <ScrollArea className="flex-1 min-h-0">
                                            <div className="px-4 py-5 space-y-4">
                                                {isConvLoading ? (
                                                    Array.from({ length: 3 }).map((_, i) => (
                                                        <div key={i} className="flex gap-2.5">
                                                            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                                                            <div className="space-y-1.5 flex-1">
                                                                <Skeleton className="h-3 w-24" />
                                                                <Skeleton className="h-14 rounded-2xl rounded-tl-sm" />
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : isConvError ? (
                                                    <div className="py-12 flex flex-col items-center gap-2">
                                                        <AlertTriangle className="h-6 w-6 text-rose-300" />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            Could not load conversation
                                                        </p>
                                                    </div>
                                                ) : messages.length === 0 ? (
                                                    <div className="py-14 flex flex-col items-center gap-2">
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <MessageSquare className="h-5 w-5 text-slate-300" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            No messages yet
                                                        </p>
                                                        <p className="text-[9px] text-slate-300 font-medium">
                                                            Start the conversation below
                                                        </p>
                                                    </div>
                                                ) : (
                                                    messages.map((msg, i) => {
                                                        const normalized = normalizeMessage(msg)
                                                        const isOptimistic = String(normalized.id ?? '').startsWith('optimistic-')
                                                        const senderLabel = normalized.senderName ?? normalized.senderRole ?? 'System'
                                                        const initials = senderLabel.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                                                        const isInternal = normalized.isInternal

                                                        return (
                                                            <div key={normalized.id ?? i} className="flex gap-2.5 group">
                                                                {/* Avatar */}
                                                                <div className={cn(
                                                                    'h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black mt-5',
                                                                    isInternal
                                                                        ? 'bg-amber-100 text-amber-700'
                                                                        : 'bg-slate-100 text-slate-600',
                                                                )}>
                                                                    {initials || <User className="h-3.5 w-3.5" />}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    {/* Meta row */}
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate">
                                                                            {senderLabel}
                                                                        </span>
                                                                        {isInternal && (
                                                                            <span className="inline-flex items-center gap-0.5 text-[8px] font-black bg-amber-50 border border-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                                                                                <Eye className="h-2 w-2" /> Internal
                                                                            </span>
                                                                        )}
                                                                        {normalized.createdAt && (
                                                                            <span className="text-[9px] text-slate-300 font-medium ml-auto shrink-0">
                                                                                {formatDistanceToNow(new Date(normalized.createdAt), { addSuffix: true })}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Bubble */}
                                                                    <div className={cn(
                                                                        'rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed font-medium transition-opacity',
                                                                        isInternal
                                                                            ? 'bg-amber-50 border border-amber-100 text-amber-900'
                                                                            : 'bg-slate-50 border border-slate-100 text-slate-700',
                                                                        isOptimistic && 'opacity-60',
                                                                    )}>
                                                                        {normalized.body}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </ScrollArea>

                                        {/* Compose area */}
                                        <div className={cn(
                                            'shrink-0 border-t transition-colors',
                                            isInternal ? 'border-amber-100 bg-amber-50/30' : 'border-slate-100 bg-white',
                                        )}>
                                            {/* Internal toggle bar */}
                                            <div className={cn(
                                                'flex items-center gap-2 px-4 pt-3 pb-1',
                                            )}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsInternal((v) => !v)}
                                                    className={cn(
                                                        'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200',
                                                        isInternal
                                                            ? 'bg-amber-400 border-amber-400'
                                                            : 'bg-slate-200 border-slate-200',
                                                    )}
                                                    aria-pressed={isInternal}
                                                >
                                                    <span className={cn(
                                                        'pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform duration-200',
                                                        isInternal ? 'translate-x-3' : 'translate-x-0',
                                                    )} />
                                                </button>
                                                <span className={cn(
                                                    'text-[9px] font-black uppercase tracking-widest transition-colors',
                                                    isInternal ? 'text-amber-600' : 'text-slate-400',
                                                )}>
                                                    {isInternal ? 'Internal note — only visible to team' : 'Team note'}
                                                </span>
                                            </div>

                                            {/* Input + send */}
                                            <div className="flex items-end gap-2 px-4 pb-4 pt-2">
                                                <Textarea
                                                    placeholder={isInternal ? 'Write an internal note…' : 'Write a message… (Ctrl+Enter to send)'}
                                                    value={messageText}
                                                    onChange={(e) => setMessageText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend()
                                                    }}
                                                    className={cn(
                                                        'resize-none text-sm flex-1 min-h-[72px] max-h-36 rounded-xl transition-colors',
                                                        isInternal
                                                            ? 'bg-amber-50 border-amber-200 focus-visible:ring-amber-300'
                                                            : 'bg-slate-50 border-slate-200 focus-visible:ring-slate-300',
                                                    )}
                                                />
                                                <Button
                                                    size="sm"
                                                    disabled={!messageText.trim() || isSending}
                                                    onClick={handleSend}
                                                    className={cn(
                                                        'h-10 w-10 p-0 rounded-xl shrink-0 transition-colors',
                                                        isInternal
                                                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                            : 'bg-slate-900 hover:bg-slate-700 text-white',
                                                    )}
                                                >
                                                    {isSending
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <Send className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </section>

                            {/* ── RIGHT PANEL — incident preview ─────────── */}
                            <div className="flex flex-1 min-h-0 overflow-hidden">
                                {/* LEFT PANE */}
                                <ScrollArea className="flex-1 min-w-0">
                                    <div className="px-6 py-5 space-y-6">
                                        {/* Incident type (big title) */}
                                        <div>
                                            <MetaLabel>Incident Type</MetaLabel>
                                            <p className="text-lg font-black uppercase tracking-tight text-slate-900 leading-tight capitalize">
                                                {attrs!.type.replace(/_/g, ' ')}
                                            </p>

                                            {/* Victim name — inline editable */}
                                            <div className="group mt-1.5">
                                                {editingField === 'victim_name' ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            autoFocus
                                                            value={editValue}
                                                            onChange={e => setEditValue(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') saveField({ victim_name: editValue })
                                                                if (e.key === 'Escape') cancelEdit()
                                                            }}
                                                            placeholder="Victim name"
                                                            className="h-7 text-xs font-bold border-slate-200 focus-visible:ring-blue-400"
                                                        />
                                                        <Button size="sm" disabled={isSavingField} onClick={() => saveField({ victim_name: editValue })}
                                                            className="h-7 text-[9px] font-black uppercase tracking-widest px-2.5 shrink-0">
                                                            {isSavingField ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={cancelEdit}
                                                            className="h-7 text-[9px] font-black uppercase tracking-widest px-2.5 shrink-0">✕</Button>
                                                    </div>
                                                ) : attrs?.victim_name ? (
                                                    <p className="text-xs font-bold text-slate-500 cursor-text hover:text-slate-700 transition-colors"
                                                        onClick={() => startEdit('victim_name', attrs.victim_name ?? '')}>
                                                        Victim: {attrs.victim_name}
                                                        <span className="ml-1.5 opacity-0 group-hover:opacity-100 text-[8px] font-black text-blue-400 uppercase tracking-widest transition-opacity">Edit</span>
                                                    </p>
                                                ) : (
                                                    <button onClick={() => startEdit('victim_name', '')}
                                                        className="text-[9px] font-bold text-slate-300 hover:text-slate-500 uppercase tracking-widest transition-colors">
                                                        + Add victim name
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <Separator className="border-slate-100" />

                                        {/* Description — inline editable */}
                                        <div className="group">
                                            <div className="flex items-center justify-between mb-1">
                                                <MetaLabel className="mb-0">Description</MetaLabel>
                                                {editingField !== 'description' && (
                                                    <button onClick={() => startEdit('description', attrs!.description ?? '')}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                            {editingField === 'description' ? (
                                                <div className="space-y-2">
                                                    <Textarea
                                                        autoFocus
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
                                                        className="resize-none text-sm min-h-[100px] border-slate-200 focus-visible:ring-blue-400"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" disabled={isSavingField}
                                                            onClick={() => saveField({ description: editValue })}
                                                            className="h-7 text-[9px] font-black uppercase tracking-widest px-3">
                                                            {isSavingField ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={cancelEdit}
                                                            className="h-7 text-[9px] font-black uppercase tracking-widest px-3">Cancel</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap cursor-text"
                                                    onClick={() => startEdit('description', attrs!.description ?? '')}>
                                                    {attrs!.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Location */}
                                        {(locationName || attrs?.coords) && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin className="h-2.5 w-2.5" /> Location
                                                        </span>
                                                    </MetaLabel>
                                                    <p className="text-sm font-bold text-slate-900">{locationName}</p>
                                                    {attrs?.coords && <p className="text-xs text-slate-400 font-mono mt-0.5">{attrs.coords}</p>}
                                                    {directionsUrl && (
                                                        <Button asChild size="sm" variant="outline" className="mt-3 h-8 rounded-xl text-xs font-black">
                                                            <a href={directionsUrl} target="_blank" rel="noreferrer">
                                                                Navigate <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* Witnesses */}
                                        {attrs?.witness && attrs.witness.length > 0 && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>
                                                        <span className="inline-flex items-center gap-1">
                                                            <Users className="h-2.5 w-2.5" /> Witnesses
                                                        </span>
                                                    </MetaLabel>
                                                    <div className="space-y-2 mt-1">
                                                        {attrs.witness.map((w, i) => (
                                                            <div
                                                                key={i}
                                                                className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                                                            >
                                                                <p className="text-xs font-bold text-slate-900">{w.name}</p>
                                                                <p className="text-[10px] text-slate-500 font-medium">{w.phone}</p>
                                                                {w.statement && (
                                                                    <p className="text-xs text-slate-600 mt-1 italic border-l-2 border-slate-200 pl-2">
                                                                        &ldquo;{w.statement}&rdquo;
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Action taken */}
                                        {attrs?.action_taken && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>Action Taken</MetaLabel>
                                                    <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                        {attrs.action_taken}
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        {/* Resolved notes */}
                                        {attrs?.resolved_notes && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>Resolution Notes</MetaLabel>
                                                    <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                        {attrs.resolved_notes}
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        {/* Workflow actions */}
                                        {status && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>
                                                        <span className="inline-flex items-center gap-1">
                                                            <ShieldAlert className="h-2.5 w-2.5" /> Workflow Actions
                                                        </span>
                                                    </MetaLabel>
                                                    <div className="mt-2">
                                                        <WorkflowActionsPanel
                                                            id={incident.id}
                                                            status={status}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </ScrollArea>

                                {/* Separator between panes */}
                                <Separator orientation="vertical" className="border-slate-100 shrink-0" />

                                {/* RIGHT PANE — metadata sidebar */}
                                <ScrollArea className="w-56 shrink-0 bg-slate-50/50">
                                    <div className="px-4 py-5 space-y-5">
                                        {/* Status */}
                                        <div>
                                            <MetaLabel>Status</MetaLabel>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-0.5',
                                                    statusStyle.badge,
                                                )}
                                            >
                                                {statusStyle.label}
                                            </span>
                                        </div>

                                        {/* Priority — inline editable */}
                                        <div className="group">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <MetaLabel className="mb-0">Priority</MetaLabel>
                                                {editingField !== 'priority' && (
                                                    <button onClick={() => startEdit('priority', attrs?.priority ?? 'low')}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                            {editingField === 'priority' ? (
                                                <div className="space-y-1.5 mt-1">
                                                    <Select value={editValue} onValueChange={setEditValue}>
                                                        <SelectTrigger className="h-7 text-[10px] font-black uppercase tracking-widest border-slate-200">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {['low', 'medium', 'high', 'critical'].map(p => (
                                                                <SelectItem key={p} value={p} className="text-[10px] font-black uppercase tracking-widest">
                                                                    {p}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <div className="flex gap-1.5">
                                                        <Button size="sm" disabled={isSavingField}
                                                            onClick={() => saveField({ priority: editValue })}
                                                            className="h-6 text-[8px] font-black uppercase tracking-widest px-2.5 flex-1">
                                                            {isSavingField ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={cancelEdit}
                                                            className="h-6 text-[8px] font-black uppercase tracking-widest px-2">✕</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest mt-0.5 cursor-pointer hover:opacity-80 transition-opacity',
                                                        priorityStyle.badge,
                                                    )}
                                                    onClick={() => startEdit('priority', attrs?.priority ?? 'low')}
                                                >
                                                    {priorityStyle.label}
                                                </span>
                                            )}
                                        </div>

                                        <Separator className="border-slate-100" />

                                        {/* Key dates */}
                                        <div className="space-y-3">
                                            <MetaLabel>
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar className="h-2.5 w-2.5" /> Dates
                                                </span>
                                            </MetaLabel>

                                            {attrs?.occured_date && (
                                                <div>
                                                    <MetaLabel>Occurred</MetaLabel>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {safeDate(attrs.occured_date, 'dd MMM yyyy')}
                                                        {attrs.occured_time && (
                                                            <span className="text-slate-400 font-medium ml-1">
                                                                {attrs.occured_time}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            )}

                                            <div>
                                                <MetaLabel>Reported</MetaLabel>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {safeDate(attrs!.reported_at, 'dd MMM yyyy')}
                                                </p>
                                                <p className="text-[9px] text-slate-400 mt-0.5">
                                                    {attrs?.reported_at
                                                        ? formatDistanceToNow(new Date(attrs.reported_at), { addSuffix: true })
                                                        : '—'}
                                                </p>
                                            </div>

                                            {attrs?.resolved_at && (
                                                <div>
                                                    <MetaLabel>Resolved</MetaLabel>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {safeDate(attrs.resolved_at, 'dd MMM yyyy')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <Separator className="border-slate-100" />

                                        {/* People */}
                                        <div className="space-y-3">
                                            <MetaLabel>
                                                <span className="inline-flex items-center gap-1">
                                                    <User className="h-2.5 w-2.5" /> People
                                                </span>
                                            </MetaLabel>

                                            {driver && (
                                                <div>
                                                    <MetaLabel>Driver</MetaLabel>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {personName(driver)}
                                                    </p>
                                                </div>
                                            )}

                                            {reportedBy && (
                                                <div>
                                                    <MetaLabel>Reported By</MetaLabel>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {personName(reportedBy)}
                                                    </p>
                                                </div>
                                            )}

                                            {assignee && (
                                                <div>
                                                    <MetaLabel>Assignee</MetaLabel>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        {personName(assignee)}
                                                    </p>
                                                </div>
                                            )}

                                            {!driver && !reportedBy && !assignee && (
                                                <p className="text-[10px] text-slate-400">No people linked</p>
                                            )}
                                        </div>

                                        {/* Vehicle */}
                                        {hasVehicleInfo && (
                                            <>
                                                <Separator className="border-slate-100" />
                                                <div>
                                                    <MetaLabel>
                                                        <span className="inline-flex items-center gap-1">
                                                            <Car className="h-2.5 w-2.5" /> Vehicle
                                                        </span>
                                                    </MetaLabel>
                                                    {vehicle!.make && (
                                                        <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">
                                                            {vehicle!.make} {vehicle!.model ?? ''}
                                                        </p>
                                                    )}
                                                    {vehicle!.registration_number && (
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {vehicle!.registration_number}
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                        </div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}
