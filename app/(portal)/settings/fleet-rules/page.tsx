'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'
import { toast } from 'sonner'
import { Loader2, Gauge, Timer, Moon, Info, CalendarClock, Siren } from 'lucide-react'
import { QueryError } from '@/components/shared/QueryError'
import { extractApiError } from '@/lib/utils'

const fleetRulesSchema = z.object({
    speed_limit_kmh: z.number().int().min(10, 'Minimum 10 km/h').max(250, 'Maximum 250 km/h'),
    idle_threshold_minutes: z.number().int().min(1, 'Minimum 1 minute').max(120, 'Maximum 120 minutes'),
    after_hours_enabled: z.boolean(),
    after_hours_start: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    after_hours_end: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    working_days: z.array(z.number().int().min(1).max(7)).min(1, 'Choose at least one day'),
    utilization_under_pct: z.number().int().min(0).max(100),
    utilization_over_pct: z.number().int().min(0).max(100),
    telemetry_extended_alerts: z.boolean(),
}).refine(v => v.utilization_over_pct >= v.utilization_under_pct, {
    message: 'Must be at least the under-used threshold',
    path: ['utilization_over_pct'],
})

const DAYS = [
    { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 7, label: 'Sun' },
]

const parseDays = (value?: string): number[] => {
    const days = (value ?? '1,2,3,4,5,6,7').split(',').map(Number).filter(d => d >= 1 && d <= 7)
    return days.length > 0 ? days : [1, 2, 3, 4, 5, 6, 7]
}

type FleetRulesValues = z.infer<typeof fleetRulesSchema>

export default function FleetRulesPage() {
    const queryClient = useQueryClient()

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['org-policies'],
        queryFn: api.getPolicies,
    })

    const {
        register,
        handleSubmit,
        reset,
        watch,
        control,
        formState: { errors, isDirty },
    } = useForm<FleetRulesValues>({
        resolver: zodResolver(fleetRulesSchema),
        defaultValues: {
            speed_limit_kmh: 60,
            idle_threshold_minutes: 5,
            after_hours_enabled: false,
            after_hours_start: '22:00',
            after_hours_end: '06:00',
            working_days: [1, 2, 3, 4, 5, 6, 7],
            utilization_under_pct: 20,
            utilization_over_pct: 90,
            telemetry_extended_alerts: false,
        },
    })

    useEffect(() => {
        if (data?.data) {
            reset({
                speed_limit_kmh: data.data.speed_limit_kmh,
                idle_threshold_minutes: data.data.idle_threshold_minutes,
                after_hours_enabled: data.data.after_hours_enabled,
                after_hours_start: data.data.after_hours_start,
                after_hours_end: data.data.after_hours_end,
                working_days: parseDays(data.data.working_days),
                utilization_under_pct: data.data.utilization_under_pct ?? 20,
                utilization_over_pct: data.data.utilization_over_pct ?? 90,
                telemetry_extended_alerts: Boolean(data.data.telemetry_extended_alerts),
            })
        }
    }, [data, reset])

    const { mutate, isPending } = useMutation({
        mutationFn: (values: FleetRulesValues) => api.updatePolicies({ ...values, working_days: [...values.working_days].sort().join(',') }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-policies'] })
            toast.success('Fleet rules saved')
        },
        onError: (err: unknown) => {
            toast.error(extractApiError(err, 'Failed to save fleet rules'))
        },
    })

    const afterHoursEnabled = watch('after_hours_enabled')
    const afterHoursStart = watch('after_hours_start')
    const afterHoursEnd = watch('after_hours_end')

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="p-12 max-w-4xl">
                <QueryError message="Failed to load fleet rules." onRetry={refetch} />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fleet Rules</h1>
                <p className="text-slate-500 mt-1">
                    Configure safety thresholds and operational alert triggers for your entire fleet.
                </p>
            </div>

            <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-6">
                {/* Speed Limit */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                                <Gauge className="h-4 w-4 text-red-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Speed Limit</CardTitle>
                                <CardDescription>Vehicles exceeding this speed will trigger a speeding alert.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex items-end gap-4 max-w-xs">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="speed_limit_kmh" className="text-sm font-semibold text-slate-700">
                                    Speed threshold
                                </Label>
                                <div className="flex shadow-sm rounded-md">
                                    <Input
                                        id="speed_limit_kmh"
                                        type="number"
                                        min={10}
                                        max={250}
                                        {...register('speed_limit_kmh', { valueAsNumber: true })}
                                        className="rounded-r-none border-r-0 focus-visible:ring-0"
                                    />
                                    <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md whitespace-nowrap">
                                        km/h
                                    </div>
                                </div>
                                {errors.speed_limit_kmh && (
                                    <p className="text-xs text-red-500">{errors.speed_limit_kmh.message}</p>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                            <Info className="h-3 w-3" /> Allowed range: 10–250 km/h
                        </p>
                    </CardContent>
                </Card>

                {/* Idle Threshold */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                                <Timer className="h-4 w-4 text-amber-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Idle Detection</CardTitle>
                                <CardDescription>
                                    Engine-on with zero speed for this duration triggers an idle alert.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="max-w-xs space-y-2">
                            <Label htmlFor="idle_threshold_minutes" className="text-sm font-semibold text-slate-700">
                                Idle duration
                            </Label>
                            <div className="flex shadow-sm rounded-md">
                                <Input
                                    id="idle_threshold_minutes"
                                    type="number"
                                    min={1}
                                    max={120}
                                    {...register('idle_threshold_minutes', { valueAsNumber: true })}
                                    className="rounded-r-none border-r-0 focus-visible:ring-0"
                                />
                                <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md whitespace-nowrap">
                                    minutes
                                </div>
                            </div>
                            {errors.idle_threshold_minutes && (
                                <p className="text-xs text-red-500">{errors.idle_threshold_minutes.message}</p>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                            <Info className="h-3 w-3" /> Allowed range: 1–120 minutes
                        </p>
                    </CardContent>
                </Card>

                {/* After-Hours */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                <Moon className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-900">After-Hours Detection</CardTitle>
                                    <Controller
                                        name="after_hours_enabled"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                                <CardDescription>
                                    Alert when vehicles move outside your business hours window.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div
                            className={`grid grid-cols-2 gap-6 max-w-sm transition-opacity ${
                                afterHoursEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                            }`}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="after_hours_start" className="text-sm font-semibold text-slate-700">
                                    Window starts
                                </Label>
                                <Input
                                    id="after_hours_start"
                                    type="time"
                                    {...register('after_hours_start')}
                                />
                                {errors.after_hours_start && (
                                    <p className="text-xs text-red-500">{errors.after_hours_start.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="after_hours_end" className="text-sm font-semibold text-slate-700">
                                    Window ends
                                </Label>
                                <Input
                                    id="after_hours_end"
                                    type="time"
                                    {...register('after_hours_end')}
                                />
                                {errors.after_hours_end && (
                                    <p className="text-xs text-red-500">{errors.after_hours_end.message}</p>
                                )}
                            </div>
                        </div>
                        {!afterHoursEnabled && (
                            <p className="text-xs text-slate-400 mt-3">
                                Enable the toggle above to configure the after-hours window.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Utilization */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                <CalendarClock className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Working Hours &amp; Utilization</CardTitle>
                                <CardDescription>
                                    Utilization is engine time inside working hours: {afterHoursEnd}–{afterHoursStart}, the time outside the after-hours window
                                    {afterHoursEnabled ? '' : ' (used for utilization even while after-hours alerts are off)'}. Vehicles can have their own hours.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">Working days</Label>
                            <Controller
                                name="working_days"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS.map(d => {
                                            const on = field.value.includes(d.value)
                                            return (
                                                <button
                                                    key={d.value}
                                                    type="button"
                                                    onClick={() => field.onChange(on ? field.value.filter(v => v !== d.value) : [...field.value, d.value])}
                                                    className={`h-9 w-12 rounded-md border text-sm font-medium ${on ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}
                                                >
                                                    {d.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            />
                            {errors.working_days && <p className="text-xs text-red-500">{errors.working_days.message}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-6 max-w-sm">
                            <div className="space-y-2">
                                <Label htmlFor="utilization_under_pct" className="text-sm font-semibold text-slate-700">Under-used below</Label>
                                <div className="flex shadow-sm rounded-md">
                                    <Input id="utilization_under_pct" type="number" min={0} max={100} {...register('utilization_under_pct', { valueAsNumber: true })} className="rounded-r-none border-r-0 focus-visible:ring-0" />
                                    <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md">%</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="utilization_over_pct" className="text-sm font-semibold text-slate-700">Over-used above</Label>
                                <div className="flex shadow-sm rounded-md">
                                    <Input id="utilization_over_pct" type="number" min={0} max={100} {...register('utilization_over_pct', { valueAsNumber: true })} className="rounded-r-none border-r-0 focus-visible:ring-0" />
                                    <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md">%</div>
                                </div>
                                {errors.utilization_over_pct && <p className="text-xs text-red-500">{errors.utilization_over_pct.message}</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* New telemetry alerts */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-white border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                                <Siren className="h-4 w-4 text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-slate-900">Safety &amp; Driving Alerts</CardTitle>
                                    <Controller
                                        name="telemetry_extended_alerts"
                                        control={control}
                                        render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                                    />
                                </div>
                                <CardDescription>
                                    Notify on SOS, crash, harsh braking, acceleration and cornering, power cut, towing and geofence dwell time. Off by default;
                                    these events are recorded in Alarms &amp; Events either way.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => reset()}
                        disabled={!isDirty || isPending}
                    >
                        Discard Changes
                    </Button>
                    <Button type="submit" disabled={!isDirty || isPending}>
                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Rules
                    </Button>
                </div>
            </form>
        </div>
    )
}
