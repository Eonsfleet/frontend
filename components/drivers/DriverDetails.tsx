'use client'

import React from 'react'
import { UserProfile } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    User,
    Mail,
    Phone,
    Calendar,
    ShieldCheck,
    Truck,
    TrendingUp,
    History,
    Briefcase
} from 'lucide-react'
import { UpgradeGate } from '@/components/shared/UpgradeGate'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { getDriverCurrentVehicle, getDriverPerformance, getDriverTrips } from '@/lib/api/drivers'
import { Loader2 } from 'lucide-react'

interface DriverDetailsProps {
    driver: UserProfile
}

export function DriverDetails({ driver }: DriverDetailsProps) {
    const { data: vehicleResponse, isLoading: isLoadingVehicle } = useQuery({
        queryKey: ['driver-current-vehicle', driver.id],
        queryFn: () => getDriverCurrentVehicle(driver.id)
    })

    const { data: performanceResponse, isLoading: isLoadingPerformance } = useQuery({
        queryKey: ['driver-performance', driver.id],
        queryFn: () => getDriverPerformance(driver.id)
    })

    const { data: tripsResponse, isLoading: isLoadingTrips } = useQuery({
        queryKey: ['driver-trips', driver.id],
        queryFn: () => getDriverTrips(driver.id)
    })

    const currentVehicle = vehicleResponse?.data
    const performance = performanceResponse?.data
    const trips = tripsResponse?.data || []

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> Driver Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <InfoField icon={Briefcase} label="Employee ID" value={driver.attributes.employee_id || 'Not Set'} />
                            <InfoField icon={Mail} label="Email Address" value={driver.attributes.email} />
                            <InfoField icon={Phone} label="Phone Number" value={driver.attributes.phone_number || 'N/A'} />
                            <InfoField icon={Calendar} label="Joined Date" value={driver.attributes.joined_date ? format(new Date(driver.attributes.joined_date), 'MMMM d, yyyy') : 'N/A'} />
                            <InfoField icon={Calendar} label="Date of Birth" value={driver.attributes.date_of_birth || 'N/A'} />
                            <InfoField icon={ShieldCheck} label="Role" value={String(Array.isArray(driver.attributes.role) ? driver.attributes.role[0] : driver.attributes.role).replace('_', ' ')} />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Current Assignment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingVehicle ? (
                                <div className="flex justify-center py-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                                </div>
                            ) : currentVehicle ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <Truck className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{currentVehicle.registration_number || currentVehicle.attributes?.registration_number}</span>
                                        <span className="text-xs text-slate-500 capitalize">{currentVehicle.make || currentVehicle.attributes?.make} {currentVehicle.model || currentVehicle.attributes?.model}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-2 text-slate-400 text-xs italic">
                                    No vehicle assigned
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 bg-blue-50/30 border-blue-100">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-600 uppercase tracking-wider flex items-center justify-between">
                                Performance Score
                                <TrendingUp className="w-4 h-4" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <UpgradeGate
                                module="reporting"
                                featureName="Performance Scoring"
                                description="Monitor driver safety scores and performance trends based on telematics data."
                            >
                                {isLoadingPerformance ? (
                                    <div className="flex justify-center py-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl font-black text-slate-900">{performance?.score || performance?.attributes?.score || 'N/A'}</span>
                                        <div className="flex-1 space-y-1">
                                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 transition-all duration-500"
                                                    style={{ width: `${performance?.score || performance?.attributes?.score || 0}%` }}
                                                ></div>
                                            </div>
                                            {performance?.trend && (
                                                <span className="text-xs text-emerald-600 font-medium">
                                                    {performance.trend > 0 ? '+' : ''}{performance.trend}% from last month
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </UpgradeGate>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-600" /> Recent Trip History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingTrips ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
                        </div>
                    ) : trips.length > 0 ? (
                        <div className="space-y-4">
                            {trips.map((trip: any) => (
                                <div key={trip.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                                            <Truck className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{trip.attributes?.origin || trip.origin} → {trip.attributes?.destination || trip.destination}</p>
                                            <p className="text-xs text-slate-500">
                                                {trip.attributes?.start_time ? format(new Date(trip.attributes.start_time), 'MMM d, HH:mm') : 'N/A'} • {trip.attributes?.distance || trip.distance} km
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 uppercase text-[10px]">
                                        {trip.attributes?.status || trip.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500 italic font-medium">
                            No trip records found for this driver.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function InfoField({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex gap-3">
            <div className="mt-0.5">
                <Icon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-slate-900 capitalize">{value}</p>
            </div>
        </div>
    )
}
