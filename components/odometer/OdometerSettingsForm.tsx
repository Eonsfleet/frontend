'use client'

import React from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QueryError } from '@/components/shared/QueryError'
import { getOdometerSettings, updateOdometerSettings } from '@/lib/api/odometer'
import { extractApiError } from '@/lib/utils'
import type { DistanceUnit, OdometerSettings } from '@/types/odometer'

type Field = Exclude<keyof OdometerSettings, 'distance_unit'>

const FIELDS: { key: Field; label: string; help: string; unit: string; integer?: boolean; max?: number }[] = [
    { key: 'small_fix_km', label: 'Small-fix limit', unit: 'km', help: 'Organisation admins may approve a decrease up to this size. Larger decreases go to EonsFleet support with a dashboard photo.' },
    { key: 'tolerance_km', label: 'Tolerance (distance)', unit: 'km', help: 'A reading is flagged when it differs from the expected total by more than the greater of this and the percentage below.' },
    { key: 'tolerance_percent', label: 'Tolerance (percentage)', unit: '%', max: 100, help: 'Percentage of the distance travelled since the last accepted reading.' },
    { key: 'plausibility_km_per_day', label: 'Plausibility limit', unit: 'km per day', help: 'When the tracked distance is inconclusive, a reading implying more than this per day is flagged.' },
    { key: 'review_reminder_days', label: 'Review reminder', unit: 'days', integer: true, max: 365, help: 'Reviews still pending after this many days are reminded and shown as overdue.' },
]

type Draft = { distance_unit: DistanceUnit } & Record<Field, string>

const toDraft = (s: OdometerSettings): Draft => ({
    distance_unit: s.distance_unit,
    small_fix_km: String(s.small_fix_km),
    tolerance_km: String(s.tolerance_km),
    tolerance_percent: String(s.tolerance_percent),
    plausibility_km_per_day: String(s.plausibility_km_per_day),
    review_reminder_days: String(s.review_reminder_days),
})

/** Returns per-field errors and, when valid, the body to PUT. */
export function validateSettings(d: Draft): { errors: Partial<Record<Field, string>>; payload?: OdometerSettings } {
    const errors: Partial<Record<Field, string>> = {}
    const out: Record<string, number> = {}
    for (const f of FIELDS) {
        const raw = d[f.key].trim()
        const n = Number(raw)
        if (raw === '' || !Number.isFinite(n) || n < 0) errors[f.key] = 'Enter a number that is 0 or more.'
        else if (f.integer && !Number.isInteger(n)) errors[f.key] = 'Enter a whole number.'
        else if (f.max !== undefined && n > f.max) errors[f.key] = `Must be ${f.max} or less.`
        else out[f.key] = n
    }
    if (Object.keys(errors).length) return { errors }
    return { errors, payload: { distance_unit: d.distance_unit, ...out } as unknown as OdometerSettings }
}

export function OdometerSettingsForm() {
    const queryClient = useQueryClient()
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['odometer-settings'],
        queryFn: getOdometerSettings,
        retry: false,
    })
    const [draft, setDraft] = React.useState<Draft | null>(null)
    const [errors, setErrors] = React.useState<Partial<Record<Field, string>>>({})

    React.useEffect(() => {
        if (data) setDraft(toDraft(data))
    }, [data])

    const save = useMutation({
        mutationFn: (payload: OdometerSettings) => updateOdometerSettings(payload),
        onSuccess: s => {
            queryClient.setQueryData(['odometer-settings'], s)
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            toast.success('Odometer settings saved')
        },
        onError: e => toast.error(extractApiError(e, 'Could not save the settings')),
    })

    if (isLoading) return <Skeleton className="h-72 w-full" />
    if (isError) {
        if (axios.isAxiosError(error) && error.response?.status === 403) {
            return <p role="alert" className="text-sm text-slate-600">You do not have permission to configure odometer settings.</p>
        }
        return <QueryError message="Failed to load odometer settings." onRetry={refetch} />
    }
    if (!draft) return null

    return (
        <form
            noValidate
            className="space-y-4"
            onSubmit={e => {
                e.preventDefault()
                const r = validateSettings(draft)
                setErrors(r.errors)
                if (r.payload) save.mutate(r.payload)
            }}
        >
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Distance unit</CardTitle>
                    <CardDescription>Changes how distances are shown and the default for new readings. Stored values are not changed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Label htmlFor="odo-unit">Unit</Label>
                    <Select value={draft.distance_unit} onValueChange={v => setDraft({ ...draft, distance_unit: v as DistanceUnit })}>
                        <SelectTrigger id="odo-unit" aria-label="Distance unit" className="mt-1.5 w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="km">Kilometres</SelectItem>
                            <SelectItem value="mi">Miles</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Checks on submitted readings</CardTitle>
                    <CardDescription>All limits are entered in kilometres.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {FIELDS.map(f => (
                        <div key={f.key} className="space-y-1">
                            <Label htmlFor={`odo-${f.key}`}>{f.label} ({f.unit})</Label>
                            <Input
                                id={`odo-${f.key}`}
                                type="number"
                                min={0}
                                step={f.integer ? 1 : 'any'}
                                value={draft[f.key]}
                                onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                                className="w-48"
                            />
                            <p className="text-xs text-slate-500">{f.help}</p>
                            {errors[f.key] && <p role="alert" className="text-xs text-red-600">{errors[f.key]}</p>}
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save settings
            </Button>
        </form>
    )
}
