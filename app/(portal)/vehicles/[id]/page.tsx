'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getVehicleById, deleteVehicle } from '@/lib/api/vehicles'
import { VehicleDetails } from '@/components/vehicles/VehicleDetails'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Edit, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { VehicleModal } from '@/components/vehicles/VehicleModal'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/utils'

export default function VehicleDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const queryClient = useQueryClient()
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false)

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['vehicle', id],
        queryFn: () => getVehicleById(id),
        enabled: !!id,
    })

    const { mutate: doDelete, isPending: isDeleting } = useMutation({
        mutationFn: () => deleteVehicle(id),
        onSuccess: () => {
            toast.success('Vehicle deleted successfully.')
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            router.push('/vehicles')
        },
        onError: (error: any) => {
            toast.error(extractApiError(error, 'Failed to delete vehicle.'))
            setIsDeleteConfirmOpen(false)
        },
    })

    if (isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Fetching vehicle details...</p>
            </div>
        )
    }

    if (error || !response) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="bg-rose-50 text-rose-600 p-4 rounded-lg inline-block font-medium">
                    Failed to load vehicle data. It may have been deleted or moved.
                </div>
                <br />
                <Button onClick={() => router.back()} variant="outline">Go Back</Button>
            </div>
        )
    }

    const vehicle = response.data

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full hover:bg-white shadow-sm border border-transparent hover:border-slate-200"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{vehicle.attributes.registration_number}</h1>
                            <Badge variant={vehicle.attributes.status === 'active' ? 'default' : 'outline'} className="capitalize px-3">
                                {vehicle.attributes.status}
                            </Badge>
                        </div>
                        <p className="text-slate-500 mt-1">{vehicle.attributes.make} {vehicle.attributes.model} • {vehicle.attributes.year}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="border-slate-200 text-slate-600 hover:bg-white"
                        onClick={() => setIsEditModalOpen(true)}
                    >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                        variant="outline"
                        className="text-rose-600 border-rose-100 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </div>
            </div>

            <VehicleDetails vehicle={vehicle} />

            <VehicleModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                initialData={vehicle}
            />
            
            {/* Delete confirmation dialog */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-6 w-6 text-rose-500" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Delete Vehicle</h3>
                            <p className="text-sm text-slate-500">
                                Are you sure you want to delete{' '}
                                <span className="font-semibold text-slate-700">
                                    {vehicle.attributes.registration_number}
                                </span>
                                ? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                disabled={isDeleting}
                            >
                                No, Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                                onClick={() => doDelete()}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
