'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getDriverById } from '@/lib/api/drivers'
import { DriverDetails } from '@/components/drivers/DriverDetails'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Edit, Mail, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DriverDialog } from '@/components/drivers/DriverDialog'
import { AssignVehicleDialog } from '@/components/drivers/AssignVehicleDialog'
import { PermissionGate } from '@/components/shared/PermissionGate'

export default function DriverDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
    const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false)

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['driver', id],
        queryFn: () => getDriverById(id),
        enabled: !!id,
    })

    if (isLoading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Fetching driver profile...</p>
            </div>
        )
    }

    if (error || !response) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="bg-rose-50 text-rose-600 p-4 rounded-lg inline-block font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Failed to load driver profile.
                </div>
                <br />
                <Button onClick={() => router.back()} variant="outline">Go Back</Button>
            </div>
        )
    }

    const driver = response.data

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
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl border-4 border-white shadow-sm">
                            {driver.attributes.first_name[0]}{driver.attributes.last_name[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{driver.attributes.full_name}</h1>
                                <Badge variant={driver.attributes.status === 'active' ? 'default' : 'outline'} className="capitalize px-3">
                                    {driver.attributes.status}
                                </Badge>
                            </div>
                            <p className="text-slate-500 mt-0.5 flex items-center gap-2">
                                <Mail className="w-3 h-3" /> {driver.attributes.email}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <PermissionGate permission="drivers:write">
                        <Button
                            variant="outline"
                            className="border-slate-200 text-slate-600 hover:bg-white"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => setIsAssignModalOpen(true)}
                        >
                            Assign Vehicle
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            <DriverDetails driver={driver} />

            <DriverDialog
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                mode="edit"
                initialData={driver}
            />

            <AssignVehicleDialog
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                driverId={driver.id}
                driverName={driver.attributes.full_name}
            />
        </div>
    )
}
