'use client'

import React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { useReadingSubmit } from '@/hooks/useReadingSubmit'
import { ReadingConfirmPrompt } from './ReadingConfirmPrompt'
import { buildReading, emptyDraft, type DraftErrors, type ReadingDraft } from '@/lib/odometerDraft'
import { useDefaultDistanceUnit } from '@/hooks/useOdometerSettings'
import { formatLifetime } from '@/lib/odometer'
import { OdometerReadingFields } from './OdometerReadingFields'
import { OdometerOutcome } from './OdometerOutcome'
import type { Vehicle } from '@/types'

interface Props {
    vehicle: Vehicle | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

/** Enter a dashboard reading for one vehicle: the action behind "Odometer reading required". */
export function OdometerReadingDialog({ vehicle, open, onOpenChange }: Props) {
    const queryClient = useQueryClient()
    const odo = vehicle?.attributes.odometer
    const defaultUnit = useDefaultDistanceUnit(odo?.unit)
    const [draft, setDraft] = React.useState<ReadingDraft>(() => emptyDraft(defaultUnit))
    const [errors, setErrors] = React.useState<DraftErrors>({})
    const submit = useReadingSubmit()
    const { reset } = submit

    // Start each opening from a blank draft in the vehicle's unit (no prefill from any old figure).
    React.useEffect(() => {
        if (open) {
            setDraft(emptyDraft(defaultUnit))
            setErrors({})
            reset()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, vehicle?.attributes.uuid])

    React.useEffect(() => {
        if (!submit.result) return
        queryClient.invalidateQueries({ queryKey: ['vehicles'] })
        queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle?.attributes.uuid] })
        queryClient.invalidateQueries({ queryKey: ['odometer-reviews'] })
        queryClient.invalidateQueries({ queryKey: ['odometer-readings', vehicle?.attributes.uuid] })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submit.result])

    if (!vehicle) return null
    const current = formatLifetime(odo)

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const built = buildReading(draft, odo?.lifetime_km ?? null)
        if (!built.ok) return setErrors(built.errors)
        if (!built.reading) return setErrors({ value: 'Enter the reading shown on the dashboard.' })
        setErrors({})
        void submit.run(vehicle.attributes.uuid, built.reading)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Enter dashboard reading</DialogTitle>
                    <DialogDescription>
                        {vehicle.attributes.registration_number}
                        {current ? ` — current odometer ${current}` : ' — no accepted odometer yet'}
                    </DialogDescription>
                </DialogHeader>
                {submit.result ? (
                    <>
                        <OdometerOutcome result={submit.result} />
                        <DialogFooter>
                            <Button onClick={() => onOpenChange(false)}>Done</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <form onSubmit={onSubmit} className="space-y-4">
                        <OdometerReadingFields draft={draft} onChange={setDraft} errors={errors} idPrefix="dlg" />
                        {submit.prompt && (
                            <ReadingConfirmPrompt prompt={submit.prompt} onConfirm={submit.confirm} onCancel={submit.dismiss} busy={submit.isPending} />
                        )}
                        {submit.error && (
                            <p role="alert" className="text-sm text-red-700">
                                {submit.error.message}{submit.error.code ? ` (${submit.error.code})` : ''}
                            </p>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submit.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submit.isPending}>
                                {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit reading
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
