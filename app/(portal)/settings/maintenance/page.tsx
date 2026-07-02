'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'
import { toast } from 'sonner'
import { Loader2, Wrench, CalendarClock, AlarmClock, Info } from 'lucide-react'
import { QueryError } from '@/components/shared/QueryError'
import { extractApiError } from '@/lib/utils'

const maintenanceSchema = z.object({
    maintenance_approaching_km: z.number().int().min(10, 'Minimum 10 km').max(5000, 'Maximum 5000 km'),
    maintenance_approaching_days: z.number().int().min(1, 'Minimum 1 day').max(365, 'Maximum 365 days'),
    maintenance_escalation_hours: z.number().int().min(1, 'Minimum 1 hour').max(720, 'Maximum 720 hours'),
})

type MaintenanceValues = z.infer<typeof maintenanceSchema>

function PolicyCard({
    icon: Icon,
    iconBg,
    iconColor,
    title,
    description,
    children,
}: {
    icon: React.ElementType
    iconBg: string
    iconColor: string
    title: string
    description: string
    children: React.ReactNode
}) {
    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-white border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6">{children}</CardContent>
        </Card>
    )
}

export default function MaintenanceSettingsPage() {
    const queryClient = useQueryClient()

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['org-policies'],
        queryFn: api.getPolicies,
    })

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<MaintenanceValues>({
        resolver: zodResolver(maintenanceSchema),
        defaultValues: {
            maintenance_approaching_km: 200,
            maintenance_approaching_days: 14,
            maintenance_escalation_hours: 48,
        },
    })

    useEffect(() => {
        if (data?.data) {
            reset({
                maintenance_approaching_km: data.data.maintenance_approaching_km,
                maintenance_approaching_days: data.data.maintenance_approaching_days,
                maintenance_escalation_hours: data.data.maintenance_escalation_hours,
            })
        }
    }, [data, reset])

    const { mutate, isPending } = useMutation({
        mutationFn: (values: MaintenanceValues) => api.updatePolicies(values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-policies'] })
            toast.success('Maintenance settings saved')
        },
        onError: (err: unknown) => {
            toast.error(extractApiError(err, 'Failed to save maintenance settings'))
        },
    })

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
                <QueryError message="Failed to load maintenance settings." onRetry={refetch} />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Maintenance Settings</h1>
                <p className="text-slate-500 mt-1">
                    Control when maintenance alerts are triggered and how quickly unacknowledged alerts escalate.
                </p>
            </div>

            <form onSubmit={handleSubmit((v) => mutate(v))} className="space-y-6">
                {/* Mileage threshold */}
                <PolicyCard
                    icon={Wrench}
                    iconBg="bg-blue-50 border border-blue-100"
                    iconColor="text-blue-500"
                    title="Mileage Warning Threshold"
                    description="Trigger an approaching alert when a vehicle is within this many km of its scheduled service odometer."
                >
                    <div className="max-w-xs space-y-2">
                        <Label htmlFor="maintenance_approaching_km" className="text-sm font-semibold text-slate-700">
                            Warn when within
                        </Label>
                        <div className="flex shadow-sm rounded-md">
                            <Input
                                id="maintenance_approaching_km"
                                type="number"
                                min={10}
                                max={5000}
                                {...register('maintenance_approaching_km', { valueAsNumber: true })}
                                className="rounded-r-none border-r-0 focus-visible:ring-0"
                            />
                            <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md whitespace-nowrap">
                                km
                            </div>
                        </div>
                        {errors.maintenance_approaching_km && (
                            <p className="text-xs text-red-500">{errors.maintenance_approaching_km.message}</p>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                        <Info className="h-3 w-3" /> Default: 200 km. Allowed range: 10–5,000 km.
                    </p>
                </PolicyCard>

                {/* Time threshold */}
                <PolicyCard
                    icon={CalendarClock}
                    iconBg="bg-violet-50 border border-violet-100"
                    iconColor="text-violet-500"
                    title="Time Warning Threshold"
                    description="Trigger an approaching alert when a scheduled service due date is within this many days."
                >
                    <div className="max-w-xs space-y-2">
                        <Label htmlFor="maintenance_approaching_days" className="text-sm font-semibold text-slate-700">
                            Warn when within
                        </Label>
                        <div className="flex shadow-sm rounded-md">
                            <Input
                                id="maintenance_approaching_days"
                                type="number"
                                min={1}
                                max={365}
                                {...register('maintenance_approaching_days', { valueAsNumber: true })}
                                className="rounded-r-none border-r-0 focus-visible:ring-0"
                            />
                            <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md whitespace-nowrap">
                                days
                            </div>
                        </div>
                        {errors.maintenance_approaching_days && (
                            <p className="text-xs text-red-500">{errors.maintenance_approaching_days.message}</p>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                        <Info className="h-3 w-3" /> Default: 14 days. Allowed range: 1–365 days.
                    </p>
                </PolicyCard>

                {/* Escalation window */}
                <PolicyCard
                    icon={AlarmClock}
                    iconBg="bg-orange-50 border border-orange-100"
                    iconColor="text-orange-500"
                    title="Escalation Window"
                    description="Automatically escalate a triggered alert to overdue if it remains unacknowledged for this long."
                >
                    <div className="max-w-xs space-y-2">
                        <Label htmlFor="maintenance_escalation_hours" className="text-sm font-semibold text-slate-700">
                            Escalate after
                        </Label>
                        <div className="flex shadow-sm rounded-md">
                            <Input
                                id="maintenance_escalation_hours"
                                type="number"
                                min={1}
                                max={720}
                                {...register('maintenance_escalation_hours', { valueAsNumber: true })}
                                className="rounded-r-none border-r-0 focus-visible:ring-0"
                            />
                            <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md whitespace-nowrap">
                                hours
                            </div>
                        </div>
                        {errors.maintenance_escalation_hours && (
                            <p className="text-xs text-red-500">{errors.maintenance_escalation_hours.message}</p>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                        <Info className="h-3 w-3" /> Default: 48 hours. Allowed range: 1–720 hours (30 days).
                    </p>
                </PolicyCard>

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
                        Save Settings
                    </Button>
                </div>
            </form>
        </div>
    )
}
