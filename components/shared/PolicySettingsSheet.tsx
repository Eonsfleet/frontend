'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPolicies, updatePolicies, type OrgPolicies } from '@/lib/api/settings'
import { toast } from 'sonner'
import { Loader2, Gauge, Timer, Moon, Wrench, CalendarClock, AlarmClock, Settings } from 'lucide-react'

// ── Schemas ──────────────────────────────────────────────────────────────────

const fleetSchema = z.object({
    speed_limit_kmh: z.number().int().min(10, 'Min 10').max(250, 'Max 250'),
    idle_threshold_minutes: z.number().int().min(1, 'Min 1').max(120, 'Max 120'),
    after_hours_enabled: z.boolean(),
    after_hours_start: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
    after_hours_end: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
})

const maintenanceSchema = z.object({
    maintenance_approaching_km: z.number().int().min(10, 'Min 10').max(5000, 'Max 5000'),
    maintenance_approaching_days: z.number().int().min(1, 'Min 1').max(365, 'Max 365'),
    maintenance_escalation_hours: z.number().int().min(1, 'Min 1').max(720, 'Max 720'),
})

type FleetValues = z.infer<typeof fleetSchema>
type MaintenanceValues = z.infer<typeof maintenanceSchema>

// ── Sub-forms ─────────────────────────────────────────────────────────────────

function FleetRulesForm({ policies, onSaved }: { policies: OrgPolicies; onSaved: () => void }) {
    const queryClient = useQueryClient()

    const { register, handleSubmit, reset, watch, control, formState: { errors, isDirty } } =
        useForm<FleetValues>({
            resolver: zodResolver(fleetSchema),
            defaultValues: {
                speed_limit_kmh: policies.speed_limit_kmh,
                idle_threshold_minutes: policies.idle_threshold_minutes,
                after_hours_enabled: policies.after_hours_enabled,
                after_hours_start: policies.after_hours_start,
                after_hours_end: policies.after_hours_end,
            },
        })

    useEffect(() => {
        reset({
            speed_limit_kmh: policies.speed_limit_kmh,
            idle_threshold_minutes: policies.idle_threshold_minutes,
            after_hours_enabled: policies.after_hours_enabled,
            after_hours_start: policies.after_hours_start,
            after_hours_end: policies.after_hours_end,
        })
    }, [policies, reset])

    const { mutate, isPending } = useMutation({
        mutationFn: (v: FleetValues) => updatePolicies(v),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-policies'] })
            toast.success('Fleet rules saved')
            onSaved()
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to save'),
    })

    const afterHoursOn = watch('after_hours_enabled')

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-6 pt-2">
            {/* Speed limit */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <Gauge className="h-4 w-4 text-red-500" />
                    <Label className="text-sm font-semibold text-slate-700">Speed Limit</Label>
                </div>
                <p className="text-xs text-slate-400">Vehicles exceeding this trigger a speeding alert.</p>
                <div className="flex shadow-sm rounded-md max-w-[180px]">
                    <Input type="number" min={10} max={250}
                        {...register('speed_limit_kmh', { valueAsNumber: true })}
                        className="rounded-r-none border-r-0 focus-visible:ring-0" />
                    <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md">
                        km/h
                    </div>
                </div>
                {errors.speed_limit_kmh && <p className="text-xs text-red-500">{errors.speed_limit_kmh.message}</p>}
            </div>

            {/* Idle threshold */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <Timer className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm font-semibold text-slate-700">Idle Detection</Label>
                </div>
                <p className="text-xs text-slate-400">Engine-on + zero speed for this long triggers an idle alert.</p>
                <div className="flex shadow-sm rounded-md max-w-[180px]">
                    <Input type="number" min={1} max={120}
                        {...register('idle_threshold_minutes', { valueAsNumber: true })}
                        className="rounded-r-none border-r-0 focus-visible:ring-0" />
                    <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md">
                        min
                    </div>
                </div>
                {errors.idle_threshold_minutes && <p className="text-xs text-red-500">{errors.idle_threshold_minutes.message}</p>}
            </div>

            {/* After-hours */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-indigo-500" />
                        <Label className="text-sm font-semibold text-slate-700">After-Hours Detection</Label>
                    </div>
                    <Controller name="after_hours_enabled" control={control}
                        render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                        )} />
                </div>
                <p className="text-xs text-slate-400">Alert when vehicles move outside business hours.</p>
                <div className={`grid grid-cols-2 gap-3 transition-opacity ${afterHoursOn ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Starts</Label>
                        <Input type="time" {...register('after_hours_start')} />
                        {errors.after_hours_start && <p className="text-xs text-red-500">{errors.after_hours_start.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Ends</Label>
                        <Input type="time" {...register('after_hours_end')} />
                        {errors.after_hours_end && <p className="text-xs text-red-500">{errors.after_hours_end.message}</p>}
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => reset()} disabled={!isDirty || isPending}>
                    Reset
                </Button>
                <Button type="submit" disabled={!isDirty || isPending}>
                    {isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                    Save Rules
                </Button>
            </div>
        </form>
    )
}

function MaintenanceForm({ policies, onSaved }: { policies: OrgPolicies; onSaved: () => void }) {
    const queryClient = useQueryClient()

    const { register, handleSubmit, reset, formState: { errors, isDirty } } =
        useForm<MaintenanceValues>({
            resolver: zodResolver(maintenanceSchema),
            defaultValues: {
                maintenance_approaching_km: policies.maintenance_approaching_km,
                maintenance_approaching_days: policies.maintenance_approaching_days,
                maintenance_escalation_hours: policies.maintenance_escalation_hours,
            },
        })

    useEffect(() => {
        reset({
            maintenance_approaching_km: policies.maintenance_approaching_km,
            maintenance_approaching_days: policies.maintenance_approaching_days,
            maintenance_escalation_hours: policies.maintenance_escalation_hours,
        })
    }, [policies, reset])

    const { mutate, isPending } = useMutation({
        mutationFn: (v: MaintenanceValues) => updatePolicies(v),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-policies'] })
            toast.success('Maintenance settings saved')
            onSaved()
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to save'),
    })

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-6 pt-2">
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <Wrench className="h-4 w-4 text-blue-500" />
                    <Label className="text-sm font-semibold text-slate-700">Mileage Warning</Label>
                </div>
                <p className="text-xs text-slate-400">Alert when vehicle is within this many km of service odometer.</p>
                <div className="flex shadow-sm rounded-md max-w-[180px]">
                    <Input type="number" min={10} max={5000}
                        {...register('maintenance_approaching_km', { valueAsNumber: true })}
                        className="rounded-r-none border-r-0 focus-visible:ring-0" />
                    <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md">
                        km
                    </div>
                </div>
                {errors.maintenance_approaching_km && <p className="text-xs text-red-500">{errors.maintenance_approaching_km.message}</p>}
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <CalendarClock className="h-4 w-4 text-violet-500" />
                    <Label className="text-sm font-semibold text-slate-700">Time Warning</Label>
                </div>
                <p className="text-xs text-slate-400">Alert when service due date is within this many days.</p>
                <div className="flex shadow-sm rounded-md max-w-[180px]">
                    <Input type="number" min={1} max={365}
                        {...register('maintenance_approaching_days', { valueAsNumber: true })}
                        className="rounded-r-none border-r-0 focus-visible:ring-0" />
                    <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md">
                        days
                    </div>
                </div>
                {errors.maintenance_approaching_days && <p className="text-xs text-red-500">{errors.maintenance_approaching_days.message}</p>}
            </div>

            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                    <AlarmClock className="h-4 w-4 text-orange-500" />
                    <Label className="text-sm font-semibold text-slate-700">Escalation Window</Label>
                </div>
                <p className="text-xs text-slate-400">Auto-escalate triggered alerts to overdue after this many hours.</p>
                <div className="flex shadow-sm rounded-md max-w-[180px]">
                    <Input type="number" min={1} max={720}
                        {...register('maintenance_escalation_hours', { valueAsNumber: true })}
                        className="rounded-r-none border-r-0 focus-visible:ring-0" />
                    <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md">
                        hrs
                    </div>
                </div>
                {errors.maintenance_escalation_hours && <p className="text-xs text-red-500">{errors.maintenance_escalation_hours.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => reset()} disabled={!isDirty || isPending}>
                    Reset
                </Button>
                <Button type="submit" disabled={!isDirty || isPending}>
                    {isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                    Save Settings
                </Button>
            </div>
        </form>
    )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface PolicySettingsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultTab?: 'fleet-rules' | 'maintenance'
}

export function PolicySettingsSheet({ open, onOpenChange, defaultTab = 'fleet-rules' }: PolicySettingsSheetProps) {
    const { data, isLoading } = useQuery({
        queryKey: ['org-policies'],
        queryFn: getPolicies,
        enabled: open,
    })

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Settings className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold">Fleet Policies</SheetTitle>
                            <SheetDescription className="text-xs">Configure thresholds for your organization.</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                ) : data?.data ? (
                    <Tabs defaultValue={defaultTab}>
                        <TabsList className="w-full mb-4">
                            <TabsTrigger value="fleet-rules" className="flex-1 text-xs">Fleet Rules</TabsTrigger>
                            <TabsTrigger value="maintenance" className="flex-1 text-xs">Maintenance</TabsTrigger>
                        </TabsList>
                        <TabsContent value="fleet-rules">
                            <FleetRulesForm policies={data.data} onSaved={() => onOpenChange(false)} />
                        </TabsContent>
                        <TabsContent value="maintenance">
                            <MaintenanceForm policies={data.data} onSaved={() => onOpenChange(false)} />
                        </TabsContent>
                    </Tabs>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-8">Failed to load policies.</p>
                )}
            </SheetContent>
        </Sheet>
    )
}
