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
import { setOdometerCapacity } from '@/lib/api/odometer'
import { extractApiError } from '@/lib/utils'
import type { Vehicle } from '@/types'

type Mode = 'assumed_default' | 'set' | 'none'

interface Props {
    vehicle: Vehicle
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Per-vehicle odometer capacity: the value at which the dashboard rolls over to 0.
 * "Assumed default" is the platform's guess (999,999) and only ever suggests a rollover.
 */
export function OdometerCapacityDialog({ vehicle, open, onOpenChange }: Props) {
    const queryClient = useQueryClient()
    const cap = vehicle.attributes.odometer?.capacity
    const [mode, setMode] = React.useState<Mode>(cap?.state ?? 'assumed_default')
    const [km, setKm] = React.useState(cap?.state === 'set' && cap.km != null ? String(cap.km) : '')
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (open) {
            setMode(cap?.state ?? 'assumed_default')
            setKm(cap?.state === 'set' && cap.km != null ? String(cap.km) : '')
            setError(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const mutation = useMutation({
        mutationFn: () => {
            if (mode === 'none') return setOdometerCapacity(vehicle.attributes.uuid, { capacity_km: null, state: 'none' })
            const n = Number(km)
            return setOdometerCapacity(vehicle.attributes.uuid, { capacity_km: n, state: 'set' })
        },
        onSuccess: () => {
            toast.success('Odometer capacity updated')
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle.attributes.uuid] })
            onOpenChange(false)
        },
        onError: e => toast.error(extractApiError(e, 'Could not update the capacity')),
    })

    const save = () => {
        if (mode === 'assumed_default') {
            // The contract has no way to put a vehicle back to the assumed default.
            onOpenChange(false)
            return
        }
        if (mode === 'set') {
            const n = Number(km)
            if (!km.trim() || !Number.isFinite(n) || n <= 0) {
                setError('Enter the largest value the odometer shows (for example 99999 or 999999).')
                return
            }
        }
        setError(null)
        mutation.mutate()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Odometer capacity</DialogTitle>
                    <DialogDescription>
                        {vehicle.attributes.registration_number}. Used to recognise when a dashboard has rolled over.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="cap-mode">Capacity</Label>
                        <Select value={mode} onValueChange={v => setMode(v as Mode)}>
                            <SelectTrigger id="cap-mode" aria-label="Capacity"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="assumed_default" disabled={cap?.state !== 'assumed_default'}>
                                    Assumed default (999,999 km)
                                </SelectItem>
                                <SelectItem value="set">Set a value</SelectItem>
                                <SelectItem value="none">None (digital dashboard, no rollover)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {mode === 'set' && (
                        <div className="space-y-1.5">
                            <Label htmlFor="cap-km">Capacity (km)</Label>
                            <Input id="cap-km" type="number" min={1} value={km} onChange={e => setKm(e.target.value)} />
                        </div>
                    )}
                    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
                    <Button onClick={save} disabled={mutation.isPending}>
                        {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
