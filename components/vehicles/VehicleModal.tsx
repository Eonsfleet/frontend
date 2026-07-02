'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { VehicleForm } from './VehicleForm'
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

    const { mutate: handleMutation, isPending } = useMutation({
        mutationFn: (data: any) => {
            if (initialData) {
                return updateVehicle(initialData.id, data)
            }
            return createVehicle(data)
        },
        onSuccess: (response) => {
            toast.success(initialData ? 'Vehicle updated successfully' : 'Vehicle created successfully')
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            if (initialData) {
                queryClient.invalidateQueries({ queryKey: ['vehicle', initialData.id] })
            }
            onClose()
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
                    <VehicleForm
                        initialData={initialData}
                        onSubmit={handleMutation}
                        isLoading={isPending}
                        onCancel={onClose}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
