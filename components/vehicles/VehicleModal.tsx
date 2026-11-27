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
import { useReadingSubmit } from '@/hooks/useReadingSubmit'
import { ReadingConfirmPrompt } from '@/components/odometer/ReadingConfirmPrompt'
import { useDefaultDistanceUnit } from '@/hooks/useOdometerSettings'
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
    const reading = useReadingSubmit()
    const { reset } = reading
    // Set once the vehicle is saved with a reading entered: the modal then drives and reports that reading.
    const [savedWithReading, setSavedWithReading] = React.useState(false)

    React.useEffect(() => {
        if (isOpen) {
            setSavedWithReading(false)
            reset()
        }
    }, [isOpen, reset])

    React.useEffect(() => {
        if (reading.result) {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            queryClient.invalidateQueries({ queryKey: ['odometer-reviews'] })
            if (initialData) queryClient.invalidateQueries({ queryKey: ['vehicle', initialData.attributes.uuid] })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reading.result])

    const { mutate: handleMutation, isPending } = useMutation({
        mutationFn: async (submission: VehicleSubmission) => {
            // The reading is not part of the vehicle body; odometer_when_join is no longer sent at all.
            const { odometer_reading, ...vehicleData } = submission
            const response = initialData
                ? await updateVehicle(initialData.attributes.uuid, vehicleData as never)
                : await createVehicle(vehicleData as never)
            return { response, odometer_reading }
        },
        onSuccess: ({ response, odometer_reading }) => {
            toast.success(initialData ? 'Vehicle updated successfully' : 'Vehicle created successfully')
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            if (initialData) {
                queryClient.invalidateQueries({ queryKey: ['vehicle', initialData.attributes.uuid] })
            }
            if (odometer_reading) {
                const uuid = response?.data?.attributes?.uuid ?? initialData?.attributes.uuid
                setSavedWithReading(true)
                void reading.run(uuid as string, odometer_reading)
            } else {
                onClose()
            }
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
                    {savedWithReading ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-700">The vehicle was saved.</p>
                            {reading.isPending && <p className="text-sm text-slate-500">Submitting the dashboard reading...</p>}
                            {reading.result && <OdometerOutcome result={reading.result} />}
                            {reading.prompt && (
                                <ReadingConfirmPrompt prompt={reading.prompt} onConfirm={reading.confirm} onCancel={reading.dismiss} busy={reading.isPending} />
                            )}
                            {reading.error && (
                                <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    The dashboard reading was not recorded: {reading.error.message}
                                    {reading.error.code ? ` (${reading.error.code})` : ''}. You can enter it again from the vehicle list.
                                </div>
                            )}
                            {!reading.isPending && (
                                <div className="flex justify-end">
                                    <Button onClick={onClose}>{reading.prompt ? 'Skip the reading' : 'Done'}</Button>
                                </div>
                            )}
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
