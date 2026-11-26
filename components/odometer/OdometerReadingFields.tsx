'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PHOTO_REQUIRED_KINDS, type DraftErrors, type ReadingDraft } from '@/lib/odometerDraft'
import type { DistanceUnit, ReadingKind } from '@/types/odometer'

const KIND_OPTIONS: { value: ReadingKind; label: string }[] = [
    { value: 'reading', label: 'Ordinary reading' },
    { value: 'correction', label: 'Correction of an earlier reading' },
    { value: 'dashboard_replacement', label: 'Dashboard was replaced' },
    { value: 'reset', label: 'Odometer was reset' },
    { value: 'rollover_confirmation', label: 'Odometer rolled over' },
]

interface Props {
    draft: ReadingDraft
    onChange: (next: ReadingDraft) => void
    errors?: DraftErrors
    /** Hide the kind selector (the vehicle form only takes ordinary readings and corrections via the dialog). */
    showKind?: boolean
    idPrefix?: string
}

/**
 * "Current dashboard reading": the number on the vehicle's dashboard, its unit and when it was read.
 * Leaving the value blank submits nothing.
 */
export function OdometerReadingFields({ draft, onChange, errors = {}, showKind = true, idPrefix = 'odo' }: Props) {
    const set = (patch: Partial<ReadingDraft>) => onChange({ ...draft, ...patch })
    const photoRequired = PHOTO_REQUIRED_KINDS.includes(draft.kind)
    const err = (msg?: string) => (msg ? <p role="alert" className="text-xs text-red-600">{msg}</p> : null)

    return (
        <div className="space-y-3" data-testid="odometer-reading-fields">
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                    <Label htmlFor={`${idPrefix}-value`}>Current dashboard reading</Label>
                    <Input
                        id={`${idPrefix}-value`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        value={draft.value}
                        onChange={e => set({ value: e.target.value })}
                        placeholder="As shown on the dashboard"
                    />
                    {err(errors.value)}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-unit`}>Unit</Label>
                    <Select value={draft.unit} onValueChange={v => set({ unit: v as DistanceUnit })}>
                        <SelectTrigger id={`${idPrefix}-unit`} aria-label="Unit"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="km">km</SelectItem>
                            <SelectItem value="mi">miles</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {draft.value.trim() !== '' && Number(draft.value) === 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                        type="checkbox"
                        checked={draft.confirmZero}
                        onChange={e => set({ confirmZero: e.target.checked })}
                    />
                    The dashboard really shows 0
                </label>
            )}

            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-at`}>Read on</Label>
                <Input
                    id={`${idPrefix}-at`}
                    type="datetime-local"
                    value={draft.effectiveAt}
                    onChange={e => set({ effectiveAt: e.target.value })}
                />
                {err(errors.effectiveAt)}
            </div>

            {showKind && (
                <div className="space-y-1.5">
                    <Label htmlFor={`${idPrefix}-kind`}>Type of reading</Label>
                    <Select value={draft.kind} onValueChange={v => set({ kind: v as ReadingKind })}>
                        <SelectTrigger id={`${idPrefix}-kind`} aria-label="Type of reading"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {KIND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-reason`}>Reason (required if lower than the current odometer or not an ordinary reading)</Label>
                <Input id={`${idPrefix}-reason`} value={draft.reason} onChange={e => set({ reason: e.target.value })} />
                {err(errors.reason)}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-note`}>Note (optional)</Label>
                <Textarea id={`${idPrefix}-note`} rows={2} value={draft.note} onChange={e => set({ note: e.target.value })} />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-photo`}>
                    Dashboard photo {photoRequired ? '(required)' : '(optional, may be required for large decreases)'}
                </Label>
                <Input
                    id={`${idPrefix}-photo`}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => set({ photo: e.target.files?.[0] ?? null })}
                />
                {draft.photo && draft.photo.size > 10 * 1024 * 1024 && err('The photo is larger than 10 MB.')}
                {err(errors.photo)}
            </div>
        </div>
    )
}
