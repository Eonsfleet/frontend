'use client'

import { useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getPolicies, updatePolicies, type OrgPolicies } from '@/lib/api/settings'
import { getWorkflowSettings, updateWorkflowSettings, type WorkflowSettings } from '@/lib/api/maintenance'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/utils'
import {
    Loader2, Gauge, Timer, Moon, Wrench,
    CalendarClock, AlarmClock, SlidersHorizontal, DollarSign, Users, ShieldCheck,
} from 'lucide-react'

// ── Schemas ───────────────────────────────────────────────────────────────────

const fleetSchema = z.object({
    speed_limit_kmh: z.number().int().min(10, 'Min 10 km/h').max(250, 'Max 250 km/h'),
    idle_threshold_minutes: z.number().int().min(1, 'Min 1 min').max(120, 'Max 120 min'),
    after_hours_enabled: z.boolean(),
    after_hours_start: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    after_hours_end: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
})

const maintenanceSchema = z.object({
    maintenance_approaching_km: z.number().int().min(10, 'Min 10 km').max(5000, 'Max 5,000 km'),
    maintenance_approaching_days: z.number().int().min(1, 'Min 1 day').max(365, 'Max 365 days'),
    maintenance_escalation_hours: z.number().int().min(1, 'Min 1 hr').max(720, 'Max 720 hrs'),
})

type FleetValues = z.infer<typeof fleetSchema>
type MaintenanceValues = z.infer<typeof maintenanceSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionRow({
    icon: Icon,
    iconClass,
    label,
    hint,
    children,
    error,
}: {
    icon: React.ElementType
    iconClass: string
    label: string
    hint: string
    children: React.ReactNode
    error?: string
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-5 border-b border-slate-100 last:border-0">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />
                    <span className="text-sm font-semibold text-slate-800">{label}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

function UnitInput({
    unit,
    inputProps,
}: {
    unit: string
    inputProps: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }
}) {
    return (
        <div className="flex rounded-lg overflow-hidden border border-slate-200 shadow-sm w-[130px]">
            <input
                type="number"
                className="w-full min-w-0 px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                {...inputProps}
            />
            <div className="flex items-center px-2.5 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-500 whitespace-nowrap">
                {unit}
            </div>
        </div>
    )
}

// ── Fleet Rules Form ──────────────────────────────────────────────────────────

function FleetRulesForm({ policies, onClose }: { policies: OrgPolicies; onClose: () => void }) {
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
            onClose()
        },
        onError: (err: any) => toast.error(extractApiError(err, 'Failed to save')),
    })

    const afterHoursOn = watch('after_hours_enabled')

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6">
                <SectionRow
                    icon={Gauge} iconClass="text-red-500"
                    label="Speed Limit"
                    hint="Vehicles exceeding this speed will trigger a speeding alert."
                    error={errors.speed_limit_kmh?.message}
                >
                    <UnitInput unit="km/h" inputProps={{ min: 10, max: 250, ...register('speed_limit_kmh', { valueAsNumber: true }) }} />
                </SectionRow>

                <SectionRow
                    icon={Timer} iconClass="text-amber-500"
                    label="Idle Detection"
                    hint="Engine-on with zero speed for this duration fires an idle alert."
                    error={errors.idle_threshold_minutes?.message}
                >
                    <UnitInput unit="min" inputProps={{ min: 1, max: 120, ...register('idle_threshold_minutes', { valueAsNumber: true }) }} />
                </SectionRow>

                <div className="py-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <Moon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                                <span className="text-sm font-semibold text-slate-800">After-Hours Detection</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">Alert when vehicles move outside your business hours.</p>
                        </div>
                        <Controller name="after_hours_enabled" control={control}
                            render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )} />
                    </div>

                    <div className={`mt-4 grid grid-cols-2 gap-3 transition-all duration-200 ${afterHoursOn ? 'opacity-100' : 'opacity-35 pointer-events-none'}`}>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Starts</Label>
                            <Input type="time" {...register('after_hours_start')}
                                className="h-9 text-sm font-medium" />
                            {errors.after_hours_start && <p className="text-xs text-red-500">{errors.after_hours_start.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ends</Label>
                            <Input type="time" {...register('after_hours_end')}
                                className="h-9 text-sm font-medium" />
                            {errors.after_hours_end && <p className="text-xs text-red-500">{errors.after_hours_end.message}</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">Changes apply org-wide immediately.</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" type="button" onClick={() => reset()} disabled={!isDirty || isPending}>
                        Reset
                    </Button>
                    <Button size="sm" type="submit" disabled={!isDirty || isPending}>
                        {isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        Save Rules
                    </Button>
                </div>
            </div>
        </form>
    )
}

// ── Maintenance Form ──────────────────────────────────────────────────────────

function MaintenanceForm({ policies, onClose }: { policies: OrgPolicies; onClose: () => void }) {
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
            onClose()
        },
        onError: (err: any) => toast.error(extractApiError(err, 'Failed to save')),
    })

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6">
                <SectionRow
                    icon={Wrench} iconClass="text-blue-500"
                    label="Mileage Warning"
                    hint="Trigger an approaching alert when a vehicle is within this many km of its scheduled service odometer."
                    error={errors.maintenance_approaching_km?.message}
                >
                    <UnitInput unit="km" inputProps={{ min: 10, max: 5000, ...register('maintenance_approaching_km', { valueAsNumber: true }) }} />
                </SectionRow>

                <SectionRow
                    icon={CalendarClock} iconClass="text-violet-500"
                    label="Time Warning"
                    hint="Trigger an approaching alert when a service due date is within this many days."
                    error={errors.maintenance_approaching_days?.message}
                >
                    <UnitInput unit="days" inputProps={{ min: 1, max: 365, ...register('maintenance_approaching_days', { valueAsNumber: true }) }} />
                </SectionRow>

                <SectionRow
                    icon={AlarmClock} iconClass="text-orange-500"
                    label="Escalation Window"
                    hint="Automatically escalate a triggered alert to overdue if it remains unacknowledged for this long."
                    error={errors.maintenance_escalation_hours?.message}
                >
                    <UnitInput unit="hrs" inputProps={{ min: 1, max: 720, ...register('maintenance_escalation_hours', { valueAsNumber: true }) }} />
                </SectionRow>
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">Changes apply org-wide immediately.</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" type="button" onClick={() => reset()} disabled={!isDirty || isPending}>
                        Reset
                    </Button>
                    <Button size="sm" type="submit" disabled={!isDirty || isPending}>
                        {isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        Save Settings
                    </Button>
                </div>
            </div>
        </form>
    )
}

// ── Workflow Settings Form ────────────────────────────────────────────────────

const workflowSchema = z.object({
    finance_threshold_enabled: z.boolean(),
    cost_threshold: z.number().min(0, 'Must be ≥ 0'),
})

type WorkflowValues = z.infer<typeof workflowSchema>

function WorkflowSettingsForm({ onClose }: { onClose: () => void }) {
    const queryClient = useQueryClient()

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['workflow-settings', 'maintenance'],
        queryFn: () => getWorkflowSettings('maintenance'),
    })

    const settings = data?.data?.settings

    const { register, handleSubmit, reset, watch, control, formState: { errors, isDirty } } =
        useForm<WorkflowValues>({
            resolver: zodResolver(workflowSchema),
            defaultValues: {
                finance_threshold_enabled: true,
                cost_threshold: 100000,
            },
        })

    useEffect(() => {
        if (settings) {
            reset({
                finance_threshold_enabled: settings.finance_threshold_enabled,
                cost_threshold: settings.cost_threshold,
            })
        }
    }, [settings, reset])

    const { mutate, isPending } = useMutation({
        mutationFn: (v: WorkflowValues) => updateWorkflowSettings('maintenance', v),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workflow-settings', 'maintenance'] })
            toast.success('Workflow settings saved')
            onClose()
        },
        onError: (err: any) => toast.error(extractApiError(err, 'Failed to save')),
    })

    const financeOn = watch('finance_threshold_enabled')

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-xs">Loading workflow settings…</p>
            </div>
        )
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                <p className="text-sm font-semibold text-slate-700">Failed to load workflow settings</p>
                <p className="text-xs text-slate-400">Check your connection and try again.</p>
                <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-1 text-xs font-bold">
                    Retry
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit((v) => mutate(v))} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-6">
                <div className="py-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <DollarSign className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                <span className="text-sm font-semibold text-slate-800">Finance Routing</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Automatically route high-cost repairs to financial controllers.
                            </p>
                        </div>
                        <Controller name="finance_threshold_enabled" control={control}
                            render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )} />
                    </div>

                    <div className={`mt-4 transition-all duration-200 ${financeOn ? 'opacity-100' : 'opacity-35 pointer-events-none'}`}>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                Cost Threshold (₦)
                            </Label>
                            <div className="flex rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                <span className="flex items-center px-3 bg-slate-50 border-r border-slate-200 text-sm font-bold text-slate-400">₦</span>
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full px-3 py-2 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                                    placeholder="100,000"
                                    {...register('cost_threshold', { valueAsNumber: true })}
                                />
                            </div>
                            {errors.cost_threshold && (
                                <p className="text-xs text-red-500">{errors.cost_threshold.message}</p>
                            )}
                            <p className="text-[10px] italic text-slate-400">Jobs above this amount require Finance approval.</p>
                        </div>
                    </div>
                </div>

                <SectionRow
                    icon={Users} iconClass="text-slate-400"
                    label="Approval Requirements"
                    hint="Current approval configuration for this org."
                >
                    <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{settings?.minimum_approvals ?? 1}×</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{settings?.required_role ?? '—'}</p>
                    </div>
                </SectionRow>

                <SectionRow
                    icon={ShieldCheck} iconClass="text-emerald-500"
                    label="Workflow Guard"
                    hint="Automated compliance gatekeeping is active for this organisation."
                >
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full">
                        Active
                    </span>
                </SectionRow>
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">Changes apply org-wide immediately.</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" type="button" onClick={() => reset()} disabled={!isDirty || isPending}>
                        Reset
                    </Button>
                    <Button size="sm" type="submit" disabled={!isDirty || isPending}>
                        {isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                        Save Settings
                    </Button>
                </div>
            </div>
        </form>
    )
}

// ── Config per mode ───────────────────────────────────────────────────────────

const MODE_CONFIG = {
    'fleet-rules': {
        icon: Gauge,
        iconBg: 'bg-red-50',
        iconColor: 'text-red-500',
        title: 'Fleet Rules',
        description: 'Speed, idle, and after-hours thresholds for your fleet.',
    },
    maintenance: {
        icon: SlidersHorizontal,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-500',
        title: 'Maintenance Settings',
        description: 'Alert thresholds and escalation rules for service schedules.',
    },
} as const

// ── Main export ───────────────────────────────────────────────────────────────

interface PolicySettingsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    mode: 'fleet-rules' | 'maintenance'
}

export function PolicySettingsSheet({ open, onOpenChange, mode }: PolicySettingsSheetProps) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['org-policies'],
        queryFn: getPolicies,
        enabled: open,
    })

    const cfg = MODE_CONFIG[mode]
    const Icon = cfg.icon

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[420px] p-0 flex flex-col gap-0 overflow-hidden">
                {/* Header */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${cfg.iconBg} flex items-center justify-center ring-4 ring-white shadow-sm`}>
                            <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                        </div>
                        <div>
                            <SheetTitle className="text-base font-bold text-slate-900 leading-tight">{cfg.title}</SheetTitle>
                            <SheetDescription className="text-xs text-slate-400 mt-0.5">{cfg.description}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {/* Body */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {mode === 'fleet-rules' ? (
                        isLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <p className="text-xs">Loading settings…</p>
                            </div>
                        ) : isError || !data?.data ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
                                <p className="text-sm font-semibold text-slate-700">Failed to load settings</p>
                                <p className="text-xs text-slate-400">Check your connection and try again.</p>
                            </div>
                        ) : (
                            <FleetRulesForm policies={data.data} onClose={() => onOpenChange(false)} />
                        )
                    ) : (
                        <Tabs defaultValue="thresholds" className="flex flex-col flex-1 overflow-hidden">
                            <TabsList className="mx-6 mt-3 mb-1 bg-slate-50 border border-slate-100 rounded-xl p-1 h-auto shrink-0 grid grid-cols-2">
                                <TabsTrigger
                                    value="thresholds"
                                    className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow py-2"
                                >
                                    Alert Thresholds
                                </TabsTrigger>
                                <TabsTrigger
                                    value="workflow"
                                    className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow py-2"
                                >
                                    Workflow
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="thresholds" className="flex-1 overflow-hidden flex flex-col mt-0 data-[state=inactive]:hidden">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <p className="text-xs">Loading settings…</p>
                                    </div>
                                ) : isError || !data?.data ? (
                                    <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
                                        <p className="text-sm font-semibold text-slate-700">Failed to load settings</p>
                                        <p className="text-xs text-slate-400">Check your connection and try again.</p>
                                    </div>
                                ) : (
                                    <MaintenanceForm policies={data.data} onClose={() => onOpenChange(false)} />
                                )}
                            </TabsContent>

                            <TabsContent value="workflow" className="flex-1 overflow-hidden flex flex-col mt-0 data-[state=inactive]:hidden">
                                <WorkflowSettingsForm onClose={() => onOpenChange(false)} />
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
