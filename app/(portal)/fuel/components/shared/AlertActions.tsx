'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Loader2, MessageSquare, Phone, Search, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { acknowledgeFuelAlert, markFuelAlertFalsePositive, resolveFuelAlert } from '@/lib/api/fuel'
import {
    assignFuelAlert,
    contactAlertDriver,
    getFuelAlertAssignees,
    openFuelAlertInvestigation,
    type ContactDriverResult,
} from '@/lib/api/fuelPage'

export interface ActionableAlert {
    id: number
    status: string
    assigned_to: number | null
    investigating: boolean
    /** For dialog titles only. */
    label?: string | null
}

const OPEN = ['new', 'active', 'acknowledged']

/** The server's own sentence when it gave one (a 422 says why), else a plain fallback. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    return typeof message === 'string' && message ? message : fallback
}

type Dialogue = null | 'investigate' | 'resolve' | 'false_positive'

/**
 * What an operations manager does with an alert: acknowledge it, reach the
 * driver, open an investigation with an owner, close it. Each action says
 * what the server answered, including why it refused; none is shown as done
 * until the server confirms it.
 */
export function AlertActions({ alert, onChanged, compact = false }: { alert: ActionableAlert; onChanged: () => void; compact?: boolean }) {
    const [dialogue, setDialogue] = useState<Dialogue>(null)
    const [contact, setContact] = useState<ContactDriverResult | null>(null)
    const open = OPEN.includes(alert.status)

    const ack = useMutation({
        mutationFn: () => acknowledgeFuelAlert(alert.id),
        onSuccess: () => { toast.success('Alert acknowledged'); onChanged() },
        onError: (e) => toast.error(errorMessage(e)),
    })
    const reach = useMutation({
        mutationFn: (channel: 'sms' | 'call') => contactAlertDriver(alert.id, channel),
        onSuccess: (result) => {
            setContact(result)
            toast.success(result.channel === 'sms' ? `Message sent to ${result.driver.name}` : `${result.driver.name}'s number is ready`)
            onChanged()
        },
        onError: (e) => toast.error(errorMessage(e)),
    })

    if (!open) return null
    const size = compact ? 'xs' : 'sm'

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
                {(alert.status === 'new' || alert.status === 'active') && (
                    <Button type="button" size={size} variant="outline" disabled={ack.isPending} onClick={() => ack.mutate()}>
                        {ack.isPending ? <Loader2 className="animate-spin" /> : <Check />} Acknowledge
                    </Button>
                )}
                <Button type="button" size={size} variant="outline" disabled={reach.isPending} onClick={() => reach.mutate('call')}>
                    <Phone /> Call driver
                </Button>
                <Button type="button" size={size} variant="outline" disabled={reach.isPending} onClick={() => reach.mutate('sms')}>
                    <MessageSquare /> SMS driver
                </Button>
                {!alert.investigating && (
                    <Button type="button" size={size} variant="outline" onClick={() => setDialogue('investigate')}>
                        <Search /> Investigate
                    </Button>
                )}
                <Button type="button" size={size} variant="outline" onClick={() => setDialogue('resolve')}>
                    <ShieldCheck /> Resolve
                </Button>
                <Button type="button" size={size} variant="ghost" onClick={() => setDialogue('false_positive')}>
                    <X /> False positive
                </Button>
            </div>

            {alert.investigating && <p className="text-xs font-medium text-indigo-700">Investigation open</p>}

            {contact && contact.channel === 'call' && (
                <p className="text-sm text-slate-700">
                    {contact.driver.name} ·{' '}
                    <a className="font-semibold text-blue-700 underline" href={`tel:${contact.driver.phone}`}>
                        Call {contact.driver.phone}
                    </a>
                </p>
            )}

            <InvestigateDialog open={dialogue === 'investigate'} alert={alert} onClose={() => setDialogue(null)} onDone={() => { setDialogue(null); onChanged() }} />
            <NoteDialog
                open={dialogue === 'resolve'}
                title="Resolve alert"
                confirm="Resolve"
                onClose={() => setDialogue(null)}
                onConfirm={async (notes) => { await resolveFuelAlert(alert.id, notes); toast.success('Alert resolved'); onChanged() }}
            />
            <NoteDialog
                open={dialogue === 'false_positive'}
                title="Mark as false positive"
                confirm="Mark false positive"
                onClose={() => setDialogue(null)}
                onConfirm={async (notes) => { await markFuelAlertFalsePositive(alert.id, notes); toast.success('Marked as false positive'); onChanged() }}
            />
        </div>
    )
}

function NoteDialog({ open, title, confirm, onClose, onConfirm }: {
    open: boolean
    title: string
    confirm: string
    onClose: () => void
    onConfirm: (notes?: string) => Promise<void>
}) {
    const [notes, setNotes] = useState('')
    const [busy, setBusy] = useState(false)
    const submit = async () => {
        setBusy(true)
        try {
            await onConfirm(notes.trim() || undefined)
            setNotes('')
            onClose()
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setBusy(false)
        }
    }
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!busy && !o) onClose() }}>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <label className="block text-[12px] font-semibold text-slate-600" htmlFor="alert-note">Note (optional)</label>
                <textarea id="alert-note" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button type="button" onClick={submit} disabled={busy}>{busy && <Loader2 className="animate-spin" />}{confirm}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

/** An investigation needs an owner: pick one, then open it. The server refuses one without. */
function InvestigateDialog({ open, alert, onClose, onDone }: { open: boolean; alert: ActionableAlert; onClose: () => void; onDone: () => void }) {
    const [owner, setOwner] = useState<string>(alert.assigned_to != null ? String(alert.assigned_to) : '')
    const [notes, setNotes] = useState('')
    const assignees = useQuery({ queryKey: ['fuel', 'assignees'], queryFn: getFuelAlertAssignees, enabled: open, staleTime: 5 * 60_000 })

    const start = useMutation({
        mutationFn: async () => {
            if (String(alert.assigned_to ?? '') !== owner) await assignFuelAlert(alert.id, Number(owner))
            await openFuelAlertInvestigation(alert.id, notes.trim() || undefined)
        },
        onSuccess: () => { toast.success('Investigation opened'); onDone() },
        onError: (e) => toast.error(errorMessage(e)),
    })

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!start.isPending && !o) onClose() }}>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>Open an investigation{alert.label ? ` · ${alert.label}` : ''}</DialogTitle>
                </DialogHeader>
                <label className="block text-[12px] font-semibold text-slate-600" htmlFor="investigation-owner">Owner</label>
                <select id="investigation-owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px]">
                    <option value="">Choose who will look into it</option>
                    {(assignees.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                {assignees.isError && <p className="text-xs text-red-600">Could not load the people who can own an alert.</p>}
                <label className="mt-2 block text-[12px] font-semibold text-slate-600" htmlFor="investigation-notes">What to look into (optional)</label>
                <textarea id="investigation-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={start.isPending}>Cancel</Button>
                    <Button type="button" onClick={() => start.mutate()} disabled={!owner || start.isPending}>
                        {start.isPending && <Loader2 className="animate-spin" />}Open investigation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
