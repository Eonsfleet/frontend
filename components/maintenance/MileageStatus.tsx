'use client'

import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiErrorCode, saveMileageConfig } from '@/lib/api/odometer'
import { extractApiError } from '@/lib/utils'
import { formatDistance, kmToUnit, mileageStateLabel, unitToKm } from '@/lib/odometer'
import type { DistanceUnit, ScheduleMileage } from '@/types/odometer'

const STATE_CLASS: Record<string, string> = {
    inactive_no_baseline: 'bg-orange-50 text-orange-700',
    target_required: 'bg-amber-50 text-amber-700',
    suspended: 'bg-red-50 text-red-700',
}

/** "Odometer reading required", "Mileage target required" or "suspended"; nothing when the mileage trigger is active. */
export function MileageStateBadge({ mileage, className }: { mileage: ScheduleMileage | null | undefined; className?: string }) {
    const label = mileageStateLabel(mileage?.state)
    if (!mileage || !label) return null
    return (
        <span
            data-testid="mileage-state"
            className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${STATE_CLASS[mileage.state] ?? ''} ${className ?? ''}`}
        >
            {label}
        </span>
    )
}

/** The interval in the organisation's unit, or the reason there is none. Never "0 km" for an unset interval. */
export function mileageIntervalText(mileage: ScheduleMileage | null | undefined): string | null {
    if (!mileage) return null
    if (mileage.interval_display && Number.isFinite(Number(mileage.interval_display.value))) {
        return formatDistance(mileage.interval_display.value, mileage.interval_display.unit)
    }
    return formatDistance(mileage.interval_km, 'km')
}

interface DialogProps {
    scheduleId: string | number
    mileage: ScheduleMileage
    open: boolean
    onOpenChange: (open: boolean) => void
}

/** What the server's stable mileage-config error codes mean for the person. */
export const MILEAGE_ERROR_TEXT: Record<string, string> = {
    no_baseline: 'This vehicle has no accepted odometer reading yet. Enter a dashboard reading first.',
    baseline_in_question: 'A reading for this vehicle is waiting for review, so the mileage target cannot change yet.',
    invalid_interval: 'The interval is not valid.',
    invalid_unit: 'The unit is not valid.',
    above_maximum: 'The interval or first-due value is higher than the maximum allowed.',
}

type Confirmation = 'overdue' | 'postpone'

/**
 * Mileage interval and an optional first-due override. The server decides when a confirmation is needed
 * (422 overdue_confirmation_required or postpone_confirmation_required); only the one it names is asked for.
 */
export function MileageConfigDialog({ scheduleId, mileage, open, onOpenChange }: DialogProps) {
    const queryClient = useQueryClient()
    const startUnit: DistanceUnit = mileage.interval_display?.unit ?? 'km'
    const [interval, setIntervalValue] = React.useState('')
    const [unit, setUnit] = React.useState<DistanceUnit>(startUnit)
    const [firstDue, setFirstDue] = React.useState('')
    const [confirm, setConfirm] = React.useState<{ overdue: boolean; postpone: boolean }>({ overdue: false, postpone: false })
    const [needed, setNeeded] = React.useState<Confirmation | null>(null)
    const [serverError, setServerError] = React.useState<string | null>(null)
    const [errors, setErrors] = React.useState<{ interval?: string; firstDue?: string }>({})

    React.useEffect(() => {
        if (open) {
            setIntervalValue(mileage.interval_display ? String(mileage.interval_display.value) : '')
            setUnit(startUnit)
            setFirstDue('')
            setConfirm({ overdue: false, postpone: false })
            setNeeded(null)
            setServerError(null)
            setErrors({})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const noBaseline = mileage.state === 'inactive_no_baseline'

    const mutation = useMutation({
        mutationFn: () => {
            const firstDueKm = firstDue.trim() ? unitToKm(Number(firstDue), unit) : null
            return saveMileageConfig(scheduleId, {
                interval: Number(interval),
                unit,
                first_due_km: firstDueKm,
                confirm_overdue: firstDueKm !== null && confirm.overdue,
                confirm_postpone: firstDueKm !== null && confirm.postpone,
            })
        },
        onSuccess: () => {
            toast.success('Mileage target saved')
            queryClient.invalidateQueries({ queryKey: ['schedule-detail'] })
            queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] })
            onOpenChange(false)
        },
        onError: e => {
            const code = apiErrorCode(e)
            if (code === 'overdue_confirmation_required') {
                setNeeded('overdue'); setServerError(null)
            } else if (code === 'postpone_confirmation_required') {
                setNeeded('postpone'); setServerError(null)
            } else {
                setNeeded(null)
                setServerError((code && MILEAGE_ERROR_TEXT[code]) || extractApiError(e, 'Could not save the mileage target'))
            }
        },
    })

    const save = () => {
        const next: typeof errors = {}
        const n = Number(interval)
        if (!interval.trim() || !Number.isFinite(n) || n <= 0) next.interval = 'Enter an interval above 0.'
        if (firstDue.trim()) {
            const f = Number(firstDue)
            if (!Number.isFinite(f) || f <= 0) next.firstDue = 'Enter a distance above 0, or leave blank.'
        }
        setErrors(next)
        if (Object.keys(next).length === 0) mutation.mutate()
    }

    const unitLabel = unit === 'mi' ? 'miles' : 'km'
    const showHint = mileage.next_due_km !== null && mileage.next_due_km !== undefined
    const confirmed = needed ? confirm[needed] : false

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>Mileage target</DialogTitle>
                    <DialogDescription>
                        {noBaseline
                            ? 'This vehicle has no accepted odometer reading yet. Enter a dashboard reading first.'
                            : 'The first service is due at the current odometer plus the interval, unless you set it below.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1.5">
                            <Label htmlFor="mc-interval">Service every</Label>
                            <Input id="mc-interval" type="number" min={0} step="any" value={interval} onChange={e => setIntervalValue(e.target.value)} disabled={noBaseline} />
                            {errors.interval && <p role="alert" className="text-xs text-red-600">{errors.interval}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="mc-unit">Unit</Label>
                            <Select value={unit} onValueChange={v => setUnit(v as DistanceUnit)} disabled={noBaseline}>
                                <SelectTrigger id="mc-unit" aria-label="Unit"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="km">km</SelectItem>
                                    <SelectItem value="mi">miles</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="mc-first">First due at ({unitLabel}, optional)</Label>
                        <Input id="mc-first" type="number" min={0} step="any" value={firstDue} onChange={e => { setFirstDue(e.target.value); setNeeded(null) }} disabled={noBaseline} />
                        {errors.firstDue && <p role="alert" className="text-xs text-red-600">{errors.firstDue}</p>}
                        {showHint && (
                            <p className="text-xs text-slate-500">
                                Currently due at {formatDistance(kmToUnit(mileage.next_due_km as number, unit), unit)}.
                            </p>
                        )}
                    </div>
                    {needed && (
                        <div data-testid="mileage-confirm" className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                            <label className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={e => setConfirm({ ...confirm, [needed]: e.target.checked })}
                                />
                                <span>
                                    {needed === 'overdue'
                                        ? 'That first due is at or below the current odometer, so the service is already overdue. Save it anyway.'
                                        : 'That first due is more than one interval beyond the default, which postpones the service. Save it anyway.'}
                                </span>
                            </label>
                        </div>
                    )}
                    {serverError && <p role="alert" data-testid="mileage-error" className="text-xs text-red-600">{serverError}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
                    <Button onClick={save} disabled={mutation.isPending || noBaseline || (needed !== null && !confirmed)}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
