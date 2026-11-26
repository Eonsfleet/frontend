'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { VehicleForm, type VehicleSubmission } from './VehicleForm'
import { Button } from '@/components/ui/button'
import { OdometerOutcome } from '@/components/odometer/OdometerOutcome'
import { submitReadingWithEvidence } from '@/lib/api/odometer'
import { useDefaultDistanceUnit } from '@/hooks/useOdometerSettings'
import type { SubmitReadingResult } from '@/types/odometer'
import { Vehicle } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createVehicle, updateVehicle } from '@/lib/api/vehicles'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/utils'

interface VehicleModalProps {
    isOpen: boolean
    onClose: () => void
    initialData?: Vehicle
}

export function VehicleModal({ isOpen, onClose, initialData }: VehicleModalProps) {
    const queryClient = useQueryClient()
    const defaultUnit = useDefaultDistanceUnit(initialData?.attributes.odometer?.unit)
    // Set once the vehicle is saved and a reading was entered: the modal then reports what happened to it.
    const [readingOutcome, setReadingOutcome] = React.useState<
        { result: SubmitReadingResult } | { error: string } | null
    >(null)

    React.useEffect(() => {
        if (isOpen) setReadingOutcome(null)
    }, [isOpen])

    const { mutate: handleMutation, isPending } = useMutation({
        mutationFn: async (submission: VehicleSubmission) => {
            // The reading is not part of the vehicle body; odometer_when_join is no longer sent at all.
            const { odometer_reading, ...vehicleData } = submission
            const response = initialData
                ? await updateVehicle(initialData.attributes.uuid, vehicleData as never)
                : await createVehicle(vehicleData as never)
            let reading: { result: SubmitReadingResult } | { error: string } | null = null
            if (odometer_reading) {
                const uuid = response?.data?.attributes?.uuid ?? initialData?.attributes.uuid
                try {
                    reading = {
                        result: await submitReadingWithEvidence(uuid, odometer_reading.payload, odometer_reading.photo),
                    }
                } catch (e) {
                    reading = { error: extractApiError(e, 'The reading could not be submitted') }
                }
            }
            return { response, reading }
        },
        onSuccess: ({ reading }) => {
            toast.success(initialData ? 'Vehicle updated successfully' : 'Vehicle created successfully')
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            queryClient.invalidateQueries({ queryKey: ['odometer-reviews'] })
            if (initialData) {
                queryClient.invalidateQueries({ queryKey: ['vehicle', initialData.attributes.uuid] })
            }
            if (reading) setReadingOutcome(reading)
            else onClose()
        },
        onError: (error: any) => {
            toast.error(extractApiError(error, 'Something went wrong'))
        }
    })

    return (
        <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? `Update details for vehicle ${initialData.attributes.registration_number}.`
                            : 'Enter the specifications for the new vehicle to add to your fleet.'
                        }
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {readingOutcome ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-700">The vehicle was saved.</p>
                            {'result' in readingOutcome ? (
                                <OdometerOutcome result={readingOutcome.result} />
                            ) : (
                                <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    The dashboard reading was not recorded: {readingOutcome.error}. You can enter it again from the vehicle list.
                                </div>
                            )}
                            <div className="flex justify-end">
                                <Button onClick={onClose}>Done</Button>
                            </div>
                        </div>
                    ) : (
                        <VehicleForm
                            initialData={initialData}
                            onSubmit={handleMutation}
                            isLoading={isPending}
                            onCancel={onClose}
                            defaultDistanceUnit={defaultUnit}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
