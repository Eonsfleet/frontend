'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
    ChevronLeft, RefreshCw, Copy, Check, Loader2, AlertTriangle,
    Car, Wrench, ShieldAlert, Fuel, UserX, MapPin,
    MessageSquare, Activity, ArrowRight, Lock, Info,
    Send, Image as ImageIcon, User,
    CheckCircle2, Clock, Eye, Navigation,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'
import {
    getIncidentById, getIncidentHistory, getIncidentConversation, postIncidentMessage,
    startInvestigation, requireAction, logActionTaken, submitForResolution,
    resolveIncident, closeIncident, cancelIncident, dismissIncident, escalateIncident,
} from '@/lib/api/incidents'
import { getUsers } from '@/lib/api/settings'
import type { IncidentStatus, IncidentPerson, IncidentVehicle, ConversationMessage, WorkflowHistoryEntry } from '@/types'

// ─── Status / priority configs ────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; pill: string; dot: string; bar: string }> = {
    reported:           { label: 'Reported',            pill: 'bg-slate-100 text-slate-700 border-slate-200',      dot: 'bg-slate-400',    bar: 'bg-slate-400' },
    under_investigation:{ label: 'Under Investigation', pill: 'bg-blue-50 text-blue-700 border-blue-100',          dot: 'bg-blue-500',     bar: 'bg-blue-500' },
    action_required:    { label: 'Action Required',     pill: 'bg-orange-50 text-orange-700 border-orange-100',    dot: 'bg-orange-500',   bar: 'bg-orange-500' },
    action_taken:       { label: 'Action Taken',        pill: 'bg-teal-50 text-teal-700 border-teal-100',          dot: 'bg-teal-500',     bar: 'bg-teal-500' },
    pending_resolution: { label: 'Pending Resolution',  pill: 'bg-yellow-50 text-yellow-700 border-yellow-100',    dot: 'bg-yellow-500',   bar: 'bg-yellow-500' },
    resolved:           { label: 'Resolved',            pill: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500',  bar: 'bg-emerald-500' },
    closed:             { label: 'Closed',              pill: 'bg-slate-800 text-slate-100 border-slate-700',      dot: 'bg-slate-500',    bar: 'bg-slate-600' },
    escalated:          { label: 'Escalated',           pill: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500',     bar: 'bg-rose-500' },
    dismissed:          { label: 'Dismissed',           pill: 'bg-slate-100 text-slate-400 border-slate-200',      dot: 'bg-slate-300',    bar: 'bg-slate-300' },
    cancelled:          { label: 'Cancelled',           pill: 'bg-slate-100 text-slate-400 border-slate-200',      dot: 'bg-slate-300',    bar: 'bg-slate-300' },
}

const PRIORITY_CFG: Record<string, { label: string; pill: string }> = {
    low:      { label: 'Low',      pill: 'bg-slate-50 text-slate-600 border-slate-200' },
    medium:   { label: 'Medium',   pill: 'bg-amber-50 text-amber-700 border-amber-100' },
    high:     { label: 'High',     pill: 'bg-orange-50 text-orange-700 border-orange-100' },
    critical: { label: 'Critical', pill: 'bg-rose-50 text-rose-700 border-rose-100' },
}

const TYPE_ICON: Record<string, React.ElementType> = {
    accident:          Car,
    breakdown:         Wrench,
    theft:             ShieldAlert,
    fuel_theft:        Fuel,
    unauthorized_use:  UserX,
    vandalism:         AlertTriangle,
    traffic_violation: AlertTriangle,
    near_miss:         AlertTriangle,
    other:             AlertTriangle,
}

// ─── Workflow state machine ────────────────────────────────────────────────────

interface ActionDef {
    key: string
    label: string
    variant: 'default' | 'outline' | 'destructive' | 'secondary'
    needsNote?: boolean; noteLabel?: string; noteRequired?: boolean
    needsAssignee?: boolean
    needsSeverity?: boolean
    execute: (id: string, inputs: { note: string; assignee: string; severity: string }) => Promise<unknown>
}

type ApiError = {
    response?: {
        data?: {
            message?: string
        }
    }
}

type IncidentAddress = {
    street?: string
    city?: string
    state?: string
    country?: string
}

type IncidentLocationAttrs = {
    location?: string | { address?: string } | null
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

const MACHINE: Partial<Record<IncidentStatus, ActionDef[]>> = {
    reported: [
        { key: 'investigate', label: 'Investigate', variant: 'default', needsAssignee: true, execute: (id, { assignee }) => startInvestigation(id, assignee || id) },
        { key: 'dismiss',     label: 'Dismiss',     variant: 'destructive', needsNote: true, noteLabel: 'Reason for dismissal', noteRequired: true, execute: (id, { note }) => dismissIncident(id, note) },
        { key: 'cancel',      label: 'Cancel',      variant: 'outline', needsNote: true, noteLabel: 'Reason for cancellation', noteRequired: true, execute: (id, { note }) => cancelIncident(id, note) },
    ],
    under_investigation: [
        { key: 'action_required', label: 'Action Required', variant: 'default', execute: (id) => requireAction(id) },
        { key: 'escalate',        label: 'Escalate',        variant: 'destructive', needsNote: true, noteLabel: 'Escalation reason', noteRequired: true, needsSeverity: true, execute: (id, { note, severity }) => escalateIncident(id, note, severity) },
        { key: 'cancel',          label: 'Cancel',          variant: 'outline', needsNote: true, noteLabel: 'Reason for cancellation', noteRequired: true, execute: (id, { note }) => cancelIncident(id, note) },
    ],
    action_required: [
        { key: 'action_taken', label: 'Log Action Taken', variant: 'default', needsNote: true, noteLabel: 'Describe the action taken', noteRequired: true, execute: (id, { note }) => logActionTaken(id, note) },
        { key: 'escalate',     label: 'Escalate',         variant: 'destructive', needsNote: true, noteLabel: 'Escalation reason', noteRequired: true, needsSeverity: true, execute: (id, { note, severity }) => escalateIncident(id, note, severity) },
    ],
    action_taken: [
        { key: 'pending_resolution', label: 'Mark Pending Resolution', variant: 'default', needsNote: true, noteLabel: 'Resolution notes', execute: (id, { note }) => submitForResolution(id, note) },
    ],
    pending_resolution: [
        { key: 'resolve',     label: 'Resolve Incident',     variant: 'default', needsNote: true, noteLabel: 'Resolution notes', noteRequired: true, execute: (id, { note }) => resolveIncident(id, note) },
        { key: 'more_action', label: 'More Action Required', variant: 'outline', execute: (id) => requireAction(id) },
    ],
    resolved: [
        { key: 'close', label: 'Close Record', variant: 'secondary', needsNote: true, noteLabel: 'Closing notes (optional)', execute: (id, { note }) => closeIncident(id, note || undefined) },
    ],
    escalated: [
        { key: 'investigate', label: 'Resume Investigation', variant: 'default', needsAssignee: true, execute: (id, { assignee }) => startInvestigation(id, assignee || id) },
        { key: 'close',       label: 'Close as Unresolved', variant: 'destructive', needsNote: true, noteLabel: 'Closing notes', execute: (id, { note }) => closeIncident(id, note || undefined) },
    ],
    closed: [], cancelled: [], dismissed: [],
}

// ─── Relationship helpers ─────────────────────────────────────────────────────

function flatPerson(rel?: IncidentPerson | { data: { id: string } }): IncidentPerson | null {
    if (!rel) return null
    if ('f_name' in rel || 'name' in rel || 'id' in rel) return rel as IncidentPerson
    return null
}

function flatVehicle(rel?: IncidentVehicle | { data: { id: string } }): IncidentVehicle | null {
    if (!rel) return null
    if ('make' in rel || 'registration_number' in rel || 'id' in rel) return rel as IncidentVehicle
    return null
}

function personName(p: IncidentPerson): string {
    return (p.name ?? `${p.f_name ?? ''} ${p.l_name ?? ''}`.trim()) || `User #${p.id}`
}

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function parseCoords(coords?: string | null): { lat: number; lng: number } | null {
    if (!coords) return null
    const [lat, lng] = coords.split(',').map(value => Number(value.trim()))
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
}

function locationName(attrs: IncidentLocationAttrs, address?: IncidentAddress): string {
    const addressLine = [address?.street, address?.city, address?.state, address?.country].filter(Boolean).join(', ')
    if (addressLine) return addressLine
    if (typeof attrs.location === 'string' && attrs.location.trim()) return attrs.location
    if (typeof attrs.location === 'object' && attrs.location?.address) return attrs.location.address
    return 'Incident location'
}

function normalizeMessage(msg: ConversationMessage) {
    const attrs = msg.attributes
    return {
        id: msg.id,
        body: attrs?.body ?? msg.body ?? '',
        senderId: attrs?.sender_id ?? msg.sender_id,
        senderRole: attrs?.sender_role ?? msg.sender_role,
        senderName: msg.sender_name ?? attrs?.sender_role,
        isInternal: Boolean(attrs?.is_internal ?? msg.is_internal),
        createdAt: attrs?.created_at ?? msg.created_at,
        messageType: attrs?.message_type,
    }
}

function normalizeHistory(entry: WorkflowHistoryEntry) {
    const attrs = entry.attributes
    return {
        id: entry.id,
        fromStatus: attrs?.from_status ?? entry.from_status ?? 'reported',
        toStatus: attrs?.to_status ?? entry.to_status ?? 'reported',
        actorRole: attrs?.triggered_by_role ?? entry.actor_role,
        actorName: entry.actor_name,
        reason: attrs?.reason ?? attrs?.notes ?? entry.reason,
        createdAt: attrs?.created_at ?? entry.created_at,
    }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { role } = usePermission()
    const userRole = Array.isArray(role) ? role[0] : role

    const canAct = ['administrator', 'fleet_manager', 'owner', 'dispatcher', 'compliance'].includes(userRole ?? '')

    const [copiedRef,     setCopiedRef]     = useState(false)
    const [activeAction,  setActiveAction]  = useState<ActionDef | null>(null)
    const [noteInput,     setNoteInput]     = useState('')
    const [assigneeInput, setAssigneeInput] = useState('')
    const [severityInput, setSeverityInput] = useState('high')
    const [lightboxSrc,   setLightboxSrc]  = useState<string | null>(null)

    // ── Queries ───────────────────────────────────────────────────────────────

    const incidentQ = useQuery({ queryKey: ['incident', id], queryFn: () => getIncidentById(id), enabled: !!id })
    const historyQ  = useQuery({ queryKey: ['incident-history', id], queryFn: () => getIncidentHistory(id), enabled: !!id })
    const convQ     = useQuery({ queryKey: ['incident-conversation', id], queryFn: () => getIncidentConversation(id), enabled: !!id })
    const usersQ = useQuery({
        queryKey: ['users-list-simple'],
        queryFn: () => getUsers({ per_page: 100 }),
        enabled: !!activeAction?.needsAssignee,
    })

    const workflowMut = useMutation({
        mutationFn: (action: ActionDef) => action.execute(id, { note: noteInput, assignee: assigneeInput, severity: severityInput }),
        onSuccess: () => {
            toast.success('Incident updated')
            setActiveAction(null); setNoteInput(''); setAssigneeInput('')
            queryClient.invalidateQueries({ queryKey: ['incident', id] })
            queryClient.invalidateQueries({ queryKey: ['incident-history', id] })
        },
        onError: (e: ApiError) => toast.error(e?.response?.data?.message ?? 'Action failed'),
    })

    // ── Loading / error ───────────────────────────────────────────────────────

    if (incidentQ.isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
        )
    }

    if (!incidentQ.data?.data) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <div className="h-14 w-14 bg-rose-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-7 w-7 text-rose-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Incident not found</p>
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Go Back
                </Button>
            </div>
        )
    }

    // ── Derived data ──────────────────────────────────────────────────────────

    const incident    = incidentQ.data.data
    const attrs       = incident.attributes
    const rels        = incident.relationships
    const status      = attrs.status
    const statusCfg   = STATUS_CFG[status] ?? STATUS_CFG.reported
    const priorityCfg = PRIORITY_CFG[attrs.priority] ?? PRIORITY_CFG.low
    const TypeIcon    = TYPE_ICON[attrs.type] ?? AlertTriangle
    const reference   = attrs.reference_number ?? `INC-${incident.id}`

    const vehicle    = flatVehicle(rels?.vehicle)
    const driver     = flatPerson(rels?.driver)
    const reportedBy = flatPerson(rels?.reported_by)
    const assignee   = flatPerson(rels?.assignee)
    const address    = rels?.address
    const coords = parseCoords(attrs.coords)
    const placeName = locationName(attrs, address)
    const directionsUrl = coords ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}` : null

    const isTerminal  = ['closed', 'cancelled', 'dismissed'].includes(status)
    const isEscalated = status === 'escalated'

    const history:  WorkflowHistoryEntry[] = historyQ.data?.data?.history ?? []
    const messages: ConversationMessage[]  = (convQ.data?.data?.conversation as any)?.relationships?.messages ?? convQ.data?.data?.conversation?.relationships?.messages ?? []
    const actions:  ActionDef[]            = MACHINE[status] ?? []

    const copyRef = () => {
        navigator.clipboard.writeText(reference)
        setCopiedRef(true)
        setTimeout(() => setCopiedRef(false), 2000)
    }

    const openModal = (action: ActionDef) => {
        setNoteInput(''); setAssigneeInput(''); setSeverityInput('high')
        setActiveAction(action)
    }

    const confirmAction = () => {
        if (!activeAction) return
        if (activeAction.noteRequired && !noteInput.trim()) {
            toast.error('Please provide a reason')
            return
        }
        workflowMut.mutate(activeAction)
    }

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-full bg-slate-50">

            {/* ── Escalated banner ── */}
            {isEscalated && (
                <div className="bg-rose-600 text-white px-6 py-3 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-semibold">
                        This incident has been <strong>escalated</strong> and requires immediate management attention.
                    </p>
                </div>
            )}

            {/* ── Terminal banner ── */}
            {isTerminal && (
                <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center gap-2 text-slate-500">
                    <Info className="h-4 w-4 shrink-0" />
                    <p className="text-xs font-medium">
                        This incident is <span className="font-bold capitalize">{statusCfg.label}</span> — read only, no further actions are available.
                    </p>
                </div>
            )}

            {/* ── Sticky top bar ── */}
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => router.back()}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <button onClick={copyRef} className="flex items-center gap-1.5 font-mono text-sm font-bold text-slate-800 hover:text-rose-600 transition-colors shrink-0">
                        {reference}
                        {copiedRef ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-300" />}
                    </button>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', statusCfg.pill)}>
                            <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full inline-block', statusCfg.dot)} />
                            {statusCfg.label}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', priorityCfg.pill)}>
                            {priorityCfg.label}
                        </Badge>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => incidentQ.refetch()} className="text-xs shrink-0">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh
                </Button>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* ── Page header row ── */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                            'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0',
                            isEscalated ? 'bg-rose-100' : isTerminal ? 'bg-slate-100' : 'bg-red-50',
                        )}>
                            <TypeIcon className={cn('h-5 w-5', isEscalated ? 'text-rose-600' : isTerminal ? 'text-slate-400' : 'text-red-600')} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold text-slate-900 capitalize leading-tight">
                                    {attrs.type.replace(/_/g, ' ')}
                                </h1>
                                {vehicle && (
                                    <Link
                                        href={`/vehicles/${vehicle.id}`}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-xs font-semibold text-slate-600 hover:text-blue-700"
                                    >
                                        <Car className="h-3 w-3" />
                                        {vehicle.registration_number ?? `Vehicle #${vehicle.id}`}
                                    </Link>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{attrs.description}</p>
                            {(placeName || attrs.coords) && (
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {placeName}
                                </p>
                            )}
                        </div>
                    </div>
                    {attrs.occured_date && (
                        <div className="shrink-0 text-right">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Occurred</p>
                            <p className="text-base font-bold text-slate-800 leading-tight mt-0.5">
                                {format(new Date(attrs.occured_date), 'dd MMM yyyy')}
                            </p>
                            {attrs.occured_time && (
                                <p className="text-xs text-slate-400">{attrs.occured_time}</p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1">
                                Reported {attrs.reported_at ? formatDistanceToNow(new Date(attrs.reported_at), { addSuffix: true }) : '—'}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Two-column Jira layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    {/* Left — main content (2/3) */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Description + location + victim + witnesses */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <div className={cn('h-0.5 w-full', statusCfg.bar)} />
                            <CardContent className="p-6 space-y-5">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{attrs.description}</p>
                                </div>

                                {(placeName || coords) && (
                                    <>
                                        <Separator />
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5" />Location
                                            </p>
                                            <div className="h-44 w-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative flex items-center justify-center">
                                                <div className="absolute inset-0 bg-slate-200 opacity-50 mix-blend-multiply pointer-events-none" />
                                                <div className="absolute h-5 w-5 bg-rose-600 rounded-full border-2 border-white shadow-lg animate-pulse z-10" />
                                                <p className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur text-xs px-2.5 py-1.5 rounded-lg shadow-sm text-slate-700 z-10">
                                                    <span className="font-bold">{placeName}</span>
                                                    {coords && <span className="ml-2 font-mono text-slate-400">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>}
                                                </p>
                                            </div>
                                            {directionsUrl && (
                                                <Button asChild variant="outline" size="sm" className="mt-3 h-8 rounded-xl text-xs font-black">
                                                    <a href={directionsUrl} target="_blank" rel="noreferrer">
                                                        <Navigation className="mr-1.5 h-3.5 w-3.5" />
                                                        Navigate
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                )}

                                {(attrs.victim_name || (attrs.witness && attrs.witness.length > 0)) && (
                                    <>
                                        <Separator />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {attrs.victim_name && (
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Victim</p>
                                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-100">
                                                        <User className="h-4 w-4 text-rose-400 shrink-0" />
                                                        <span className="text-sm font-semibold text-slate-800">{attrs.victim_name}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {attrs.witness && attrs.witness.length > 0 && (
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                                        Witnesses ({attrs.witness.length})
                                                    </p>
                                                    <ul className="space-y-1.5">
                                                        {attrs.witness.map((w, i) => (
                                                            <li key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                                                                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                <span className="text-sm font-medium text-slate-700">{w.name}</span>
                                                                {w.phone && <span className="text-[11px] text-slate-400 ml-auto">{w.phone}</span>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Media gallery */}
                        {attrs.media && attrs.media.length > 0 && (
                            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                <CardContent className="p-6">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <ImageIcon className="h-3.5 w-3.5" />Media ({attrs.media.length})
                                    </p>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {attrs.media.map((url, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setLightboxSrc(url)}
                                                className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 hover:opacity-90 transition-opacity relative group"
                                            >
                                                <img src={url} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action taken / resolved notes */}
                        {(attrs.action_taken || attrs.resolved_notes) && (
                            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                <CardContent className="p-6 space-y-4">
                                    {attrs.action_taken && (
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Action Taken</p>
                                            <p className="text-sm text-slate-700 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 leading-relaxed">{attrs.action_taken}</p>
                                        </div>
                                    )}
                                    {attrs.resolved_notes && (
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Resolution Notes</p>
                                            <p className="text-sm text-slate-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 leading-relaxed">{attrs.resolved_notes}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right — Jira-style sticky sidebar (1/3) */}
                    <div className="space-y-4 lg:sticky lg:top-[72px] lg:self-start">

                        {/* Workflow actions */}
                        {!isTerminal && actions.length > 0 && canAct ? (
                            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                <CardContent className="p-4">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Actions</p>
                                    <div className="flex items-center gap-2 mb-3 px-2.5 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[11px] text-slate-500 font-medium">Current</span>
                                        <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', statusCfg.pill)}>
                                            <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full inline-block', statusCfg.dot)} />
                                            {statusCfg.label}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {actions.map(action => (
                                            <Button
                                                key={action.key}
                                                variant={action.variant}
                                                size="sm"
                                                onClick={() => openModal(action)}
                                                className="w-full text-xs justify-start"
                                            >
                                                {action.label}
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : isTerminal ? (
                            <Card className="border-slate-100 bg-slate-50 shadow-sm rounded-2xl overflow-hidden">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-slate-400 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-600">Workflow Complete</p>
                                        <p className="text-xs text-slate-400">No further actions available.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}

                        {/* Details */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-4">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Details</p>
                                <div className="space-y-0">
                                    {([
                                        {
                                            label: 'Status',
                                            value: (
                                                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-semibold', statusCfg.pill)}>
                                                    <span className={cn('mr-1 h-1.5 w-1.5 rounded-full inline-block', statusCfg.dot)} />
                                                    {statusCfg.label}
                                                </Badge>
                                            ),
                                        },
                                        {
                                            label: 'Priority',
                                            value: (
                                                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-semibold', priorityCfg.pill)}>
                                                    {priorityCfg.label}
                                                </Badge>
                                            ),
                                        },
                                        { label: 'Type',      value: attrs.type.replace(/_/g, ' ') },
                                        { label: 'Reference', value: reference, mono: true },
                                        { label: 'Occurred',  value: attrs.occured_date ? format(new Date(attrs.occured_date), 'dd MMM yyyy') : null },
                                        { label: 'Reported',  value: attrs.reported_at  ? format(new Date(attrs.reported_at),  'dd MMM yyyy') : null },
                                        { label: 'Resolved',  value: attrs.resolved_at  ? format(new Date(attrs.resolved_at),  'dd MMM yyyy') : null },
                                    ] as { label: string; value: React.ReactNode; mono?: boolean }[]).map(({ label, value, mono }) => value != null && (
                                        <div key={label} className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
                                            <span className="text-xs text-slate-400 font-medium shrink-0">{label}</span>
                                            <span className={cn('text-xs font-semibold text-slate-800 text-right', mono && 'font-mono text-[11px]')}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* People */}
                        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                            <CardContent className="p-4">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">People</p>
                                <div className="space-y-3">
                                    {assignee && (
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-medium mb-1.5">Investigator</p>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarImage src={assignee.avatar ?? undefined} />
                                                    <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">{initials(personName(assignee))}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-semibold text-slate-800">{personName(assignee)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {driver && (
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-medium mb-1.5">Driver</p>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarImage src={driver.avatar ?? undefined} />
                                                    <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">{initials(personName(driver))}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-semibold text-slate-800">{personName(driver)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {reportedBy && (
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-medium mb-1.5">Reported By</p>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarImage src={reportedBy.avatar ?? undefined} />
                                                    <AvatarFallback className="text-[10px] bg-rose-100 text-rose-700">{initials(personName(reportedBy))}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-semibold text-slate-800">{personName(reportedBy)}</span>
                                            </div>
                                        </div>
                                    )}
                                    {vehicle && (
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-medium mb-1.5">Vehicle</p>
                                            <Link href={`/vehicles/${vehicle.id}`} className="flex items-center gap-2 group">
                                                <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                                    <Car className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                                        {vehicle.registration_number ?? `#${vehicle.id}`}
                                                    </p>
                                                    {(vehicle.make || vehicle.model) && (
                                                        <p className="text-[10px] text-slate-400">{vehicle.make} {vehicle.model}</p>
                                                    )}
                                                </div>
                                            </Link>
                                        </div>
                                    )}
                                    {!assignee && !driver && !reportedBy && !vehicle && (
                                        <p className="text-xs text-slate-400 italic">No parties linked</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Time Since',   value: attrs.reported_at ? formatDistanceToNow(new Date(attrs.reported_at)) : '—', icon: Clock,         color: 'text-slate-500' },
                                { label: 'Status',       value: statusCfg.label,                                                              icon: Activity,      color: 'text-slate-500' },
                                { label: 'Messages',     value: String(messages.length),                                                      icon: MessageSquare, color: 'text-blue-500' },
                                { label: 'Transitions',  value: String(history.length),                                                       icon: ArrowRight,    color: 'text-violet-500' },
                            ].map(({ label, value, icon: Icon, color }) => (
                                <div key={label} className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2 shadow-sm">
                                    <Icon className={cn('h-4 w-4 shrink-0', color)} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-900 leading-none truncate">{value}</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Full-width: Conversation + History ── */}
                <div className="mt-8">
                    <Tabs defaultValue="conversation">
                        <TabsList className="border-b border-slate-200 w-full justify-start rounded-none bg-transparent h-auto pb-0 gap-0">
                            {([
                                { value: 'conversation', label: 'Conversation', count: messages.length },
                                { value: 'history',      label: 'History',      count: history.length },
                            ] as { value: string; label: string; count: number }[]).map(({ value, label, count }) => (
                                <TabsTrigger
                                    key={value}
                                    value={value}
                                    className="data-[state=active]:border-b-2 data-[state=active]:border-rose-600 data-[state=active]:text-rose-600 rounded-none px-5 pb-3 pt-1 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors border-b-2 border-transparent"
                                >
                                    {label}
                                    {count > 0 && (
                                        <span className="ml-2 text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{count}</span>
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        <TabsContent value="conversation" className="mt-6">
                            <ConversationPanel
                                incidentId={id}
                                messages={messages}
                                isLoading={convQ.isLoading}
                                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['incident-conversation', id] })}
                            />
                        </TabsContent>
                        <TabsContent value="history" className="mt-6">
                            <HistoryTimeline history={history} isLoading={historyQ.isLoading} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* ── Workflow action modal ── */}
            <Dialog open={!!activeAction} onOpenChange={(o: boolean) => !o && setActiveAction(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{activeAction?.label}</DialogTitle>
                        <DialogDescription>
                            Confirm this transition for incident <strong>{reference}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {activeAction?.needsAssignee && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Assign Investigator</Label>
                                <Select value={assigneeInput} onValueChange={setAssigneeInput}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={usersQ.isLoading ? 'Loading users...' : 'Select investigator'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {usersQ.data?.data?.users?.map(user => (
                                            <SelectItem key={user.id} value={String(user.id)}>
                                                {user.attributes.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {activeAction?.needsSeverity && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Escalation Severity</Label>
                                <Select value={severityInput} onValueChange={setSeverityInput}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {activeAction?.needsNote && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">
                                    {activeAction.noteLabel}
                                    {activeAction.noteRequired && <span className="text-rose-500 ml-1">*</span>}
                                </Label>
                                <Textarea
                                    placeholder="Add details…"
                                    value={noteInput}
                                    onChange={e => setNoteInput(e.target.value)}
                                    className="resize-none h-24"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActiveAction(null)} disabled={workflowMut.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant={activeAction?.variant === 'destructive' ? 'destructive' : 'default'}
                            onClick={confirmAction}
                            disabled={workflowMut.isPending || (activeAction?.noteRequired && !noteInput.trim())}
                        >
                            {workflowMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Media lightbox ── */}
            <Dialog open={!!lightboxSrc} onOpenChange={(o: boolean) => !o && setLightboxSrc(null)}>
                <DialogContent className="max-w-3xl p-2 bg-black/90 border-none">
                    {lightboxSrc && (
                        <img src={lightboxSrc} alt="Media preview" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── Conversation panel ────────────────────────────────────────────────────────

function ConversationPanel({
    incidentId, messages, isLoading, onRefresh,
}: {
    incidentId: string; messages: ConversationMessage[]; isLoading: boolean; onRefresh: () => void
}) {
    const [body,       setBody]       = useState('')
    const [isInternal, setIsInternal] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    const queryClient = useQueryClient()

    const { mutate: send, isPending } = useMutation({
        mutationFn: () => postIncidentMessage(incidentId, { body, is_internal: isInternal }),
        onMutate: async () => {
            const optimisticBody = body
            const optimisticInternal = isInternal
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
                                            body: optimisticBody,
                                            is_internal: optimisticInternal,
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
            setBody('')
            return { previous }
        },
        onSuccess: () => onRefresh(),
        onError: (_err: unknown, _vars: unknown, context?: { previous: unknown }) => {
            if (context?.previous) queryClient.setQueryData(['incident-conversation', incidentId], context.previous)
            toast.error('Failed to send message')
        },
    })

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    return (
        <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 bg-blue-50 rounded-lg flex items-center justify-center">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Conversation</span>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{messages.length}</span>
                    </div>
                </div>

                {/* Messages */}
                <div className="px-6 py-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center py-12 gap-3">
                            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-slate-200" />
                            </div>
                            <p className="text-sm text-slate-400">No messages yet. Start the conversation.</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const normalized = normalizeMessage(msg)
                            const isSystem = normalized.messageType === 'system' || (!normalized.senderName && !normalized.senderId)
                            if (isSystem) {
                                return (
                                    <div key={normalized.id} className="flex items-center gap-2 py-1">
                                        <div className="flex-1 h-px bg-slate-100" />
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                                            <Info className="h-3 w-3 text-slate-400" />
                                            <span className="text-[11px] text-slate-400 font-medium">{normalized.body}</span>
                                            <span className="text-[10px] text-slate-300">{normalized.createdAt ? format(new Date(normalized.createdAt), 'MMM d, HH:mm') : ''}</span>
                                        </div>
                                        <div className="flex-1 h-px bg-slate-100" />
                                    </div>
                                )
                            }

                            return (
                                <div key={normalized.id} className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                            {(normalized.senderName ?? normalized.senderRole ?? 'U').slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className={cn('rounded-2xl rounded-tl-none px-4 py-3', normalized.isInternal ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100')}>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-xs font-bold text-slate-800">{normalized.senderName ?? 'User'}</span>
                                                {normalized.senderRole && <span className="text-[10px] text-slate-400 font-medium capitalize">{normalized.senderRole.replace(/_/g, ' ')}</span>}
                                                {normalized.isInternal && (
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full ml-auto">
                                                        <Lock className="h-2.5 w-2.5" />Internal
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed">{normalized.body}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                            {normalized.createdAt ? format(new Date(normalized.createdAt), 'MMM d, HH:mm') : ''}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Compose */}
                <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-3">
                    <Textarea
                        placeholder="Write a message…"
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) send(undefined) }}
                        className="resize-none min-h-[72px] bg-white"
                    />
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isInternal}
                                onChange={e => setIsInternal(e.target.checked)}
                                className="rounded accent-amber-500"
                            />
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                <Lock className="h-3 w-3" />Internal note (staff only)
                            </span>
                        </label>
                        <Button size="sm" onClick={() => send(undefined)} disabled={isPending || !body.trim()} className="text-xs">
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                            Send
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

// ─── History timeline ─────────────────────────────────────────────────────────

function HistoryTimeline({ history, isLoading }: { history: WorkflowHistoryEntry[]; isLoading: boolean }) {
    const sorted = [...history]
        .map(normalizeHistory)
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())

    return (
        <div>
            <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
                    <div className="h-7 w-7 bg-violet-50 rounded-lg flex items-center justify-center">
                        <Activity className="h-3.5 w-3.5 text-violet-600" />
                    </div>
                    <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Audit Trail</span>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{sorted.length}</span>
                </div>
                <CardContent className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
                    ) : sorted.length === 0 ? (
                        <div className="flex flex-col items-center py-10 gap-2">
                            <Activity className="h-8 w-8 text-slate-200" />
                            <p className="text-sm text-slate-400">No transitions recorded yet.</p>
                        </div>
                    ) : (
                        <ol className="relative space-y-0">
                            {sorted.map((entry, i) => {
                                const toCfg   = STATUS_CFG[entry.toStatus]   ?? STATUS_CFG.reported
                                const fromCfg = STATUS_CFG[entry.fromStatus] ?? STATUS_CFG.reported
                                const isLast  = i === sorted.length - 1
                                return (
                                    <li key={entry.id} className="relative pl-8">
                                        {!isLast && (
                                            <div className="absolute left-[11px] top-5 bottom-0 w-px bg-slate-100" />
                                        )}
                                        <div className={cn('absolute left-0 top-1 h-5 w-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center', toCfg.dot)}>
                                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                        </div>

                                        <div className="pb-6 last:pb-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', fromCfg.pill)}>
                                                    {fromCfg.label}
                                                </span>
                                                <ArrowRight className="h-3 w-3 text-slate-300 shrink-0" />
                                                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', toCfg.pill)}>
                                                    {toCfg.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                {entry.actorName && (
                                                    <span className="text-xs font-semibold text-slate-700">{entry.actorName}</span>
                                                )}
                                                {entry.actorRole && (
                                                    <span className="text-[11px] text-slate-400 capitalize">{entry.actorRole.replace(/_/g, ' ')}</span>
                                                )}
                                                <span className="text-[11px] text-slate-400 ml-auto">
                                                    {entry.createdAt ? format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm') : ''}
                                                </span>
                                            </div>
                                            {entry.reason && (
                                                <blockquote className="mt-2 border-l-2 border-slate-200 pl-3 text-xs text-slate-500 italic">
                                                    {entry.reason}
                                                </blockquote>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ol>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
