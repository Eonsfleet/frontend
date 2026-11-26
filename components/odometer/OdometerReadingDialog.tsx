'use client'

import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { submitReadingWithEvidence } from '@/lib/api/odometer'
import { buildReading, emptyDraft, type DraftErrors, type ReadingDraft } from '@/lib/odometerDraft'
import { useDefaultDistanceUnit } from '@/hooks/useOdometerSettings'
import { extractApiError } from '@/lib/utils'
import { formatLifetime } from '@/lib/odometer'
import { OdometerReadingFields } from './OdometerReadingFields'
import { OdometerOutcome } from './OdometerOutcome'
import type { SubmitReadingResult } from '@/types/odometer'
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
    const [result, setResult] = React.useState<SubmitReadingResult | null>(null)

    // Start each opening from a blank draft in the organisation's unit (no prefill from any old figure).
    React.useEffect(() => {
        if (open) {
            setDraft(emptyDraft(defaultUnit))
            setErrors({})
            setResult(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, vehicle?.attributes.uuid])

    const mutation = useMutation({
        mutationFn: async () => {
            const built = buildReading(draft, odo?.lifetime_km ?? null)
            if (!built.ok) throw { validation: built.errors }
            if (!built.reading) throw { validation: { value: 'Enter the reading shown on the dashboard.' } satisfies DraftErrors }
            return submitReadingWithEvidence(vehicle!.attributes.uuid, built.reading.payload, built.reading.photo)
        },
        onSuccess: res => {
            setResult(res)
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle?.attributes.uuid] })
            queryClient.invalidateQueries({ queryKey: ['odometer-reviews'] })
        },
        onError: (e: unknown) => {
            const v = (e as { validation?: DraftErrors })?.validation
            if (v) setErrors(v)
            else toast.error(extractApiError(e, 'The reading could not be submitted'))
        },
    })

    if (!vehicle) return null
    const current = formatLifetime(odo)

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
                {result ? (
                    <>
                        <OdometerOutcome result={result} />
                        <DialogFooter>
                            <Button onClick={() => onOpenChange(false)}>Done</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <form
                        onSubmit={e => {
                            e.preventDefault()
                            setErrors({})
                            mutation.mutate()
                        }}
                        className="space-y-4"
                    >
                        <OdometerReadingFields draft={draft} onChange={setDraft} errors={errors} idPrefix="dlg" />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit reading
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
