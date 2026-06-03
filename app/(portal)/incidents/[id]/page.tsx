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
    Send, Image as ImageIcon, Play, User,
    CheckCircle2, Clock, Eye, ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
    execute: (id: string, inputs: { note: string; assignee: string; severity: string }) => Promise<any>
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
        { key: 'resolve',         label: 'Resolve Incident',     variant: 'default', needsNote: true, noteLabel: 'Resolution notes', noteRequired: true, execute: (id, { note }) => resolveIncident(id, note) },
        { key: 'more_action',     label: 'More Action Required', variant: 'outline', execute: (id) => requireAction(id) },
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { role } = usePermission()
    const userRole = Array.isArray(role) ? role[0] : role

    const canAct = ['administrator', 'fleet_manager', 'owner', 'dispatcher', 'compliance'].includes(userRole ?? '')

    const [copiedRef,    setCopiedRef]    = useState(false)
    const [activeAction, setActiveAction] = useState<ActionDef | null>(null)
    const [noteInput,    setNoteInput]    = useState('')
    const [assigneeInput,setAssigneeInput]= useState('')
    const [severityInput,setSeverityInput]= useState('high')
    const [lightboxSrc,  setLightboxSrc] = useState<string | null>(null)

    // ── Queries ───────────────────────────────────────────────────────────────

    const incidentQ = useQuery({ queryKey: ['incident', id], queryFn: () => getIncidentById(id), enabled: !!id })
    const historyQ  = useQuery({ queryKey: ['incident-history', id], queryFn: () => getIncidentHistory(id), enabled: !!id })
    const convQ     = useQuery({ queryKey: ['incident-conversation', id], queryFn: () => getIncidentConversation(id), enabled: !!id })

    const workflowMut = useMutation({
        mutationFn: (action: ActionDef) => action.execute(id, { note: noteInput, assignee: assigneeInput, severity: severityInput }),
        onSuccess: () => {
            toast.success('Incident updated')
            setActiveAction(null); setNoteInput(''); setAssigneeInput('')
            queryClient.invalidateQueries({ queryKey: ['incident', id] })
            queryClient.invalidateQueries({ queryKey: ['incident-history', id] })
        },
        onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Action failed'),
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

    const incident   = incidentQ.data.data
    const attrs      = incident.attributes
    const rels       = incident.relationships
    const status     = attrs.status
    const statusCfg  = STATUS_CFG[status] ?? STATUS_CFG.reported
    const priorityCfg = PRIORITY_CFG[attrs.priority] ?? PRIORITY_CFG.low
    const TypeIcon   = TYPE_ICON[attrs.type] ?? AlertTriangle
    const reference  = attrs.reference_number ?? `INC-${incident.id}`

    const vehicle    = flatVehicle(rels?.vehicle)
    const driver     = flatPerson(rels?.driver)
    const reportedBy = flatPerson(rels?.reported_by)
    const assignee   = flatPerson(rels?.assignee)
    const address    = rels?.address

    const isTerminal  = ['closed', 'cancelled', 'dismissed'].includes(status)
    const isEscalated = status === 'escalated'

    const history:  WorkflowHistoryEntry[]  = historyQ.data?.data?.history ?? []
    const messages: ConversationMessage[]   = convQ.data?.data?.conversation?.messages ?? []
    const actions:  ActionDef[]             = MACHINE[status] ?? []

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

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

                {/* ── Hero card ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className={cn('h-1 w-full', statusCfg.bar)} />
                    <div className="p-6 lg:p-8">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center shrink-0', isEscalated ? 'bg-rose-100' : isTerminal ? 'bg-slate-100' : 'bg-red-50')}>
                                    <TypeIcon className={cn('h-6 w-6', isEscalated ? 'text-rose-600' : isTerminal ? 'text-slate-400' : 'text-red-600')} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-2xl font-bold text-slate-900 capitalize">
                                            {attrs.type.replace(/_/g, ' ')}
                                        </h1>
                                        {vehicle && (
                                            <Link
                                                href={`/vehicles/${vehicle.id}`}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group text-xs font-semibold text-slate-600 group-hover:text-blue-700"
                                            >
                                                <Car className="h-3 w-3 group-hover:text-blue-500" />
                                                {vehicle.registration_number ?? `Vehicle #${vehicle.id}`}
                                                <ExternalLink className="h-2.5 w-2.5 text-slate-300 group-hover:text-blue-400" />
                                            </Link>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1 line-clamp-2 max-w-2xl">{attrs.description}</p>
                                    {(address?.city || address?.state) && (
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 font-medium">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {[address.street, address.city, address.state].filter(Boolean).join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Date block */}
                            <div className="shrink-0 bg-slate-50 rounded-xl border border-slate-100 px-5 py-4 text-right">
                                {attrs.occured_date && (
                                    <>
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Occurred</p>
                                        <p className="text-lg font-black text-slate-900 leading-tight">
                                            {format(new Date(attrs.occured_date), 'dd MMM yyyy')}
                                        </p>
                                        {attrs.occured_time && (
                                            <p className="text-xs text-slate-400 mt-0.5">{attrs.occured_time}</p>
                                        )}
                                    </>
                                )}
                                <p className="text-[11px] text-slate-400 mt-2">
                                    Reported {attrs.reported_at ? formatDistanceToNow(new Date(attrs.reported_at), { addSuffix: true }) : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stats bar ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                        { label: 'Time Since Reported', value: attrs.reported_at ? formatDistanceToNow(new Date(attrs.reported_at)) : '—', icon: Clock, color: 'text-slate-600' },
                        { label: 'Current Status', value: statusCfg.label, icon: Activity, color: statusCfg.dot.replace('bg-', 'text-') },
                        { label: 'Messages', value: messages.length, icon: MessageSquare, color: 'text-blue-600' },
                        { label: 'Transitions', value: history.length, icon: ArrowRight, color: 'text-violet-600' },
                    ] as const).map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
                            <Icon className={cn('h-5 w-5 shrink-0', color)} />
                            <div>
                                <p className="text-sm font-black text-slate-900 leading-none truncate">{value}</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Tabs ── */}
                <Tabs defaultValue="overview">
                    <TabsList className="border-b border-slate-200 w-full justify-start rounded-none bg-transparent h-auto pb-0 gap-0">
                        {([
                            { value: 'overview',     label: 'Overview',     count: null },
                            { value: 'conversation', label: 'Conversation', count: messages.length },
                            { value: 'history',      label: 'History',      count: history.length },
                        ] as { value: string; label: string; count: number | null }[]).map(({ value, label, count }) => (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="data-[state=active]:border-b-2 data-[state=active]:border-rose-600 data-[state=active]:text-rose-600 rounded-none px-5 pb-3 pt-1 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors border-b-2 border-transparent"
                            >
                                {label}
                                {count !== null && count > 0 && (
                                    <span className="ml-2 text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{count}</span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* ── Overview tab ── */}
                    <TabsContent value="overview" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Left (2/3) */}
                            <div className="lg:col-span-2 space-y-5">

                                {/* Description + location + victim + witnesses */}
                                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                    <CardContent className="p-6 space-y-5">
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Incident Description</p>
                                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{attrs.description}</p>
                                        </div>

                                        {/* Location map */}
                                        {attrs.location?.lat && attrs.location?.lng && (
                                            <>
                                                <Separator />
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5" />Location
                                                    </p>
                                                    <div className="h-44 w-full bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative flex items-center justify-center">
                                                        <div className="absolute inset-0 bg-[url('https://maps.wikimedia.org/osm-intl/12/697/1594.png')] opacity-50 mix-blend-multiply bg-center bg-cover pointer-events-none" />
                                                        <div className="absolute h-5 w-5 bg-rose-600 rounded-full border-3 border-white shadow-lg animate-pulse z-10" />
                                                        <p className="absolute bottom-2 left-2 bg-white/90 backdrop-blur text-xs px-2.5 py-1.5 rounded-lg shadow-sm text-slate-700 font-mono z-10">
                                                            {attrs.location.lat.toFixed(5)}, {attrs.location.lng.toFixed(5)}
                                                        </p>
                                                    </div>
                                                    {attrs.location.address && (
                                                        <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />{attrs.location.address}
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* Victim + witnesses */}
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

                                        {/* Media gallery */}
                                        {attrs.media && attrs.media.length > 0 && (
                                            <>
                                                <Separator />
                                                <div>
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
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Involved parties */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Vehicle */}
                                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                        <CardContent className="p-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vehicle</p>
                                            {vehicle ? (
                                                <Link href={`/vehicles/${vehicle.id}`} className="flex items-start gap-2.5 group">
                                                    <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                                                        <Car className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{vehicle.registration_number ?? `#${vehicle.id}`}</p>
                                                        {(vehicle.make || vehicle.model) && (
                                                            <p className="text-[11px] text-slate-400">{vehicle.make} {vehicle.model}</p>
                                                        )}
                                                    </div>
                                                </Link>
                                            ) : <p className="text-xs text-slate-400 italic">Not linked</p>}
                                        </CardContent>
                                    </Card>

                                    {/* Driver */}
                                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                        <CardContent className="p-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Driver</p>
                                            {driver ? (
                                                <div className="flex items-start gap-2.5">
                                                    <Avatar className="h-9 w-9 shrink-0">
                                                        <AvatarImage src={driver.avatar ?? undefined} />
                                                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{initials(personName(driver))}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{personName(driver)}</p>
                                                        <p className="text-[11px] text-slate-400">Driver</p>
                                                    </div>
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Not linked</p>}
                                        </CardContent>
                                    </Card>

                                    {/* Reported by */}
                                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                        <CardContent className="p-4">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Reported By</p>
                                            {reportedBy ? (
                                                <div className="flex items-start gap-2.5">
                                                    <Avatar className="h-9 w-9 shrink-0">
                                                        <AvatarImage src={reportedBy.avatar ?? undefined} />
                                                        <AvatarFallback className="text-xs bg-rose-100 text-rose-700">{initials(personName(reportedBy))}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">{personName(reportedBy)}</p>
                                                        <p className="text-[11px] text-slate-400">Reporter</p>
                                                    </div>
                                                </div>
                                            ) : <p className="text-xs text-slate-400 italic">Unknown</p>}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Workflow actions */}
                                {!isTerminal && actions.length > 0 && canAct && (
                                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                        <CardContent className="p-6">
                                            <div className="flex items-center gap-2.5 mb-5">
                                                <div className="h-7 w-7 bg-slate-900 rounded-lg flex items-center justify-center">
                                                    <Play className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">Workflow Actions</span>
                                            </div>
                                            <div className="flex items-center gap-3 mb-5 px-3 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-xs font-semibold text-slate-500">Current status</span>
                                                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                                                <Badge variant="outline" className={cn('text-[11px] font-semibold px-2 py-0.5', statusCfg.pill)}>
                                                    <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full inline-block', statusCfg.dot)} />
                                                    {statusCfg.label}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {actions.map(action => (
                                                    <Button key={action.key} variant={action.variant} size="sm" onClick={() => openModal(action)} className="text-xs">
                                                        {action.label}
                                                    </Button>
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

                            {/* Right (1/3) */}
                            <div className="space-y-5">

                                {/* Quick info */}
                                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                    <CardContent className="p-5">
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Incident Info</p>
                                        <div className="space-y-0">
                                            {[
                                                { label: 'Reference',  value: reference, mono: true },
                                                { label: 'Type',       value: attrs.type.replace(/_/g, ' ') },
                                                { label: 'Priority',   value: <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-semibold', priorityCfg.pill)}>{priorityCfg.label}</Badge> },
                                                { label: 'Occurred',   value: attrs.occured_date ? format(new Date(attrs.occured_date), 'dd MMM yyyy') : null },
                                                { label: 'Reported',   value: attrs.reported_at ? format(new Date(attrs.reported_at), 'dd MMM yyyy, HH:mm') : null },
                                                { label: 'Resolved',   value: attrs.resolved_at ? format(new Date(attrs.resolved_at), 'dd MMM yyyy') : null },
                                            ].map(({ label, value, mono }) => value != null && (
                                                <div key={label} className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
                                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">{label}</span>
                                                    <span className={cn('text-[13px] font-semibold text-slate-800 text-right', mono && 'font-mono text-xs')}>{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Assignee */}
                                {assignee && (
                                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                                        <CardContent className="p-5">
                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Assigned Investigator</p>
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                                                <Avatar className="h-9 w-9 shrink-0">
                                                    <AvatarImage src={assignee.avatar ?? undefined} />
                                                    <AvatarFallback className="text-xs bg-blue-200 text-blue-800">{initials(personName(assignee))}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{personName(assignee)}</p>
                                                    <p className="text-[11px] text-blue-500 font-medium">Investigator</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Terminal state notice */}
                                {isTerminal && (
                                    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden opacity-80">
                                        <CardContent className="p-5 flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-slate-400 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-600">Workflow Complete</p>
                                                <p className="text-xs text-slate-400">No further actions available.</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── Conversation tab ── */}
                    <TabsContent value="conversation" className="mt-6">
                        <ConversationPanel
                            incidentId={id}
                            messages={messages}
                            isLoading={convQ.isLoading}
                            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['incident-conversation', id] })}
                        />
                    </TabsContent>

                    {/* ── History tab ── */}
                    <TabsContent value="history" className="mt-6">
                        <HistoryTimeline history={history} isLoading={historyQ.isLoading} />
                    </TabsContent>
                </Tabs>
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
                                <Input placeholder="Enter user ID or name…" value={assigneeInput} onChange={e => setAssigneeInput(e.target.value)} />
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

    const { mutate: send, isPending } = useMutation({
        mutationFn: () => postIncidentMessage(incidentId, { body, is_internal: isInternal }),
        onSuccess: () => { setBody(''); onRefresh() },
        onError: () => toast.error('Failed to send message'),
    })

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    return (
        <div className="max-w-3xl space-y-4">
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
                            const isSystem = !msg.sender_name && !msg.sender_id
                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex items-center gap-2 py-1">
                                        <div className="flex-1 h-px bg-slate-100" />
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                                            <Info className="h-3 w-3 text-slate-400" />
                                            <span className="text-[11px] text-slate-400 font-medium">{msg.body}</span>
                                            <span className="text-[10px] text-slate-300">{msg.created_at ? format(new Date(msg.created_at), 'MMM d, HH:mm') : ''}</span>
                                        </div>
                                        <div className="flex-1 h-px bg-slate-100" />
                                    </div>
                                )
                            }

                            return (
                                <div key={msg.id} className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                            {(msg.sender_name ?? 'U').slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className={cn('rounded-2xl rounded-tl-none px-4 py-3', msg.is_internal ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100')}>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="text-xs font-bold text-slate-800">{msg.sender_name ?? 'User'}</span>
                                                {msg.sender_role && <span className="text-[10px] text-slate-400 font-medium capitalize">{msg.sender_role.replace(/_/g, ' ')}</span>}
                                                {msg.is_internal && (
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full ml-auto">
                                                        <Lock className="h-2.5 w-2.5" />Internal
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-700 leading-relaxed">{msg.body}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                            {msg.created_at ? format(new Date(msg.created_at), 'MMM d, HH:mm') : ''}
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
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) send() }}
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
                        <Button size="sm" onClick={() => send()} disabled={isPending || !body.trim()} className="text-xs">
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
    const sorted = [...history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return (
        <div className="max-w-2xl">
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
                                const toCfg = STATUS_CFG[entry.to_status] ?? STATUS_CFG.reported
                                const fromCfg = STATUS_CFG[entry.from_status] ?? STATUS_CFG.reported
                                const isLast = i === sorted.length - 1
                                return (
                                    <li key={entry.id} className="relative pl-8">
                                        {/* Vertical line */}
                                        {!isLast && (
                                            <div className="absolute left-[11px] top-5 bottom-0 w-px bg-slate-100" />
                                        )}
                                        {/* Dot */}
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
                                                {entry.actor_name && (
                                                    <span className="text-xs font-semibold text-slate-700">{entry.actor_name}</span>
                                                )}
                                                {entry.actor_role && (
                                                    <span className="text-[11px] text-slate-400 capitalize">{entry.actor_role.replace(/_/g, ' ')}</span>
                                                )}
                                                <span className="text-[11px] text-slate-400 ml-auto">
                                                    {entry.created_at ? format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm') : ''}
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
