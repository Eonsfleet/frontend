'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, extractApiError } from '@/lib/utils'
import * as reports from '@/lib/api/telemetryReports'
import { ACCURACY, TrackerSettingsDialog } from './TrackerSettingsDialog'
import { dash, formatDuration, formatNumber } from './format'

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** The vehicle's own working hours for shift work, or the organization's. */
function WorkingHoursDialog({ setup, onClose }: { setup: reports.VehicleSetup; onClose: () => void }) {
    const current = setup.working_hours
    const [start, setStart] = useState(current?.start ?? '06:00')
    const [end, setEnd] = useState(current?.end ?? '22:00')
    const [days, setDays] = useState<number[]>(current?.days ?? [1, 2, 3, 4, 5, 6, 7])
    const client = useQueryClient()
    const save = useMutation({
        mutationFn: (hours: reports.WorkingHoursValue | null) => reports.updateWorkingHours(setup.vehicle_id, hours),
        onSuccess: () => {
            toast.success('Working hours saved')
            client.invalidateQueries({ queryKey: ['vehicle-setup', setup.vehicle_id] })
            onClose()
        },
        onError: (e: unknown) => toast.error(extractApiError(e)),
    })

    return (
        <Dialog open onOpenChange={o => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Working hours</DialogTitle>
                    <DialogDescription>
                        For a vehicle on shifts. Utilization and after-hours driving are measured against these hours; an end before the start runs past midnight.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 max-w-xs">
                        <div className="space-y-1">
                            <Label htmlFor="wh-start">From</Label>
                            <Input id="wh-start" type="time" value={start} onChange={e => setStart(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="wh-end">To</Label>
                            <Input id="wh-end" type="time" value={end} onChange={e => setEnd(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map(d => {
                            const on = days.includes(d)
                            return (
                                <button key={d} type="button" onClick={() => setDays(on ? days.filter(x => x !== d) : [...days, d].sort())}
                                    className={cn('h-9 w-12 rounded-md border text-sm', on ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500')}>
                                    {DAYS[d]}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    {current
                        ? <Button variant="ghost" onClick={() => save.mutate(null)} disabled={save.isPending}>Use the organization&apos;s hours</Button>
                        : <span />}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={() => save.mutate({ start, end, days })} disabled={save.isPending || days.length === 0}>Save</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

/**
 * On the vehicle page: how trustworthy its fuel figures are, its tracker's
 * inputs and settings, its working hours, and what is left to set up.
 */
export function VehicleTelemetrySetupCard({ vehicleId }: { vehicleId: string | number }) {
    const [editing, setEditing] = useState(false)
    const [editingHours, setEditingHours] = useState(false)
    const { data: setup, isLoading, isError } = useQuery({
        queryKey: ['vehicle-setup', Number(vehicleId)],
        queryFn: () => reports.getVehicleSetup(vehicleId),
        retry: false,
    })
    if (isLoading || isError || !setup) return null
    const accuracy = ACCURACY[setup.fuel_accuracy]
    const tracker = setup.tracker
    const editable = tracker && (tracker.protocol === 'teltonika' || tracker.protocol === 'gt06')

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4 text-slate-400" /> Telemetry setup</CardTitle>
                {editable && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Tracker settings</Button>}
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-slate-500">Fuel accuracy</p>
                        <Badge className={cn('mt-1', accuracy.style)}>{accuracy.label}</Badge>
                        <p className="text-[11px] text-slate-400 mt-1">{accuracy.note}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Consumption rate</p>
                        <p className="font-medium mt-1">{setup.consumption_l_per_100km !== null ? `${formatNumber(setup.consumption_l_per_100km, 1)} L/100 km` : dash}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Tracker</p>
                        <p className="font-medium mt-1">{tracker ? `${tracker.protocol ?? '?'} · ${tracker.model ?? 'model unknown'}` : 'None'}</p>
                        {tracker?.inputs.fuel_level && <p className="text-[11px] text-slate-400">Fuel input IO {tracker.inputs.fuel_level.io_id} ({tracker.inputs.fuel_level.unit})</p>}
                        {tracker?.reporting_interval_s && <p className="text-[11px] text-slate-400">Reports every {formatDuration(tracker.reporting_interval_s)} when parked</p>}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">
                            Working hours <button type="button" onClick={() => setEditingHours(true)} className="ml-1 text-blue-600 hover:underline">Edit</button>
                        </p>
                        <p className="font-medium mt-1">
                            {setup.working_hours
                                ? `${setup.working_hours.start}–${setup.working_hours.end}${setup.working_hours.days ? ` · ${setup.working_hours.days.map(d => DAYS[d]).join(', ')}` : ''}`
                                : "Organization's"}
                        </p>
                    </div>
                </div>
                {setup.missing.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="text-xs font-bold text-amber-900 mb-1">To improve this vehicle&apos;s figures</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-900">
                            {setup.missing.map(m => <li key={m.key}>{m.note}</li>)}
                        </ul>
                    </div>
                )}
            </CardContent>
            {editing && <TrackerSettingsDialog setup={setup} open onOpenChange={o => !o && setEditing(false)} />}
            {editingHours && <WorkingHoursDialog setup={setup} onClose={() => setEditingHours(false)} />}
        </Card>
    )
}
