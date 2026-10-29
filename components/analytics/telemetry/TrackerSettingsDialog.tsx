'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractApiError } from '@/lib/utils'
import * as reports from '@/lib/api/telemetryReports'
import type { VehicleSetup } from '@/lib/api/telemetryReports'

export const ACCURACY = {
    high: { label: 'High', style: 'bg-emerald-100 text-emerald-800', note: 'Measured by a fuel sensor' },
    medium: { label: 'Medium', style: 'bg-blue-100 text-blue-800', note: "Estimated with the vehicle's own consumption rate" },
    low: { label: 'Low', style: 'bg-slate-100 text-slate-600', note: 'No consumption rate: trips are not estimated' },
} as const

/** The tracker's fuel input and reporting settings, sent to the telemetry platform on its next sync. */
export function TrackerSettingsDialog({ setup, open, onOpenChange }: { setup: VehicleSetup; open: boolean; onOpenChange: (open: boolean) => void }) {
    const tracker = setup.tracker
    const current = tracker?.inputs.fuel_level
    const [ioId, setIoId] = useState(current ? String(current.io_id) : '')
    const [scale, setScale] = useState(current ? String(current.scale) : '1')
    const [unit, setUnit] = useState<'litres' | 'percent'>(current?.unit ?? 'litres')
    const [parkedMinutes, setParkedMinutes] = useState(tracker?.reporting_interval_s ? String(Math.round(tracker.reporting_interval_s / 60)) : '')
    const [ignition, setIgnition] = useState(Boolean(tracker?.gt06_heartbeat_ignition))
    const client = useQueryClient()

    const save = useMutation({
        mutationFn: () => {
            if (!tracker) throw new Error('No tracker')
            const minutes = Number(parkedMinutes)
            return reports.updateTrackerSettings(tracker.device_id, {
                ...(tracker.protocol === 'teltonika' ? { fuel_level: ioId ? { io_id: Number(ioId), scale: Number(scale) || 1, unit } : null } : {}),
                ...(tracker.protocol === 'gt06' ? { gt06_heartbeat_ignition: ignition } : {}),
                reporting_interval_s: minutes > 0 ? minutes * 60 : null,
            })
        },
        onSuccess: () => {
            toast.success('Saved. It reaches the telemetry platform with the next sync.')
            client.invalidateQueries({ queryKey: ['fleet-setup'] })
            client.invalidateQueries({ queryKey: ['vehicle-setup', setup.vehicle_id] })
            onOpenChange(false)
        },
        onError: (e: unknown) => toast.error(extractApiError(e)),
    })

    if (!tracker) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tracker settings · {setup.vehicle ?? tracker.imei}</DialogTitle>
                    <DialogDescription>
                        {tracker.protocol === 'teltonika'
                            ? 'Declare the input the fuel sensor is wired to, so fuel is measured and refill, drain and low-fuel alerts can be raised.'
                            : 'GT06 trackers report no ignition in their positions; with the ACC wire connected, the heartbeat can supply it.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {tracker.protocol === 'teltonika' && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="io">Fuel level IO</Label>
                                <Input id="io" inputMode="numeric" placeholder="e.g. 84" value={ioId} onChange={e => setIoId(e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="scale">Scale</Label>
                                <Input id="scale" inputMode="decimal" value={scale} onChange={e => setScale(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="unit">Unit</Label>
                                <select id="unit" value={unit} onChange={e => setUnit(e.target.value as 'litres' | 'percent')} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm">
                                    <option value="litres">Litres</option>
                                    <option value="percent">Percent</option>
                                </select>
                            </div>
                            <p className="col-span-3 text-[11px] text-slate-500">
                                Common inputs: CAN fuel level IO 84 (scale 0.1, litres) or IO 89 (percent); an analog probe is usually IO 9. Leave the IO empty to remove the input.
                            </p>
                        </div>
                    )}
                    {tracker.protocol === 'gt06' && (
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={ignition} onChange={e => setIgnition(e.target.checked)} />
                            Use the heartbeat&apos;s ignition (only with the ACC wire connected and checked)
                        </label>
                    )}
                    <div className="space-y-1">
                        <Label htmlFor="interval">Reporting interval when parked (minutes)</Label>
                        <Input id="interval" inputMode="numeric" placeholder="Learned by the platform" value={parkedMinutes} onChange={e => setParkedMinutes(e.target.value.replace(/\D/g, ''))} />
                        <p className="text-[11px] text-slate-500">Set it for trackers that sleep when parked, so they are not shown offline between reports.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

