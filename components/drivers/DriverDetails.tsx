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

interface DriverDetailsProps {
    driver: UserProfile
}

export function DriverDetails({ driver }: DriverDetailsProps) {
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
                            <InfoField icon={ShieldCheck} label="Role" value={driver.attributes.role.replace('_', ' ')} />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Current Assignment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <Truck className="w-6 h-6 text-slate-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900">TRK-402</span>
                                    <span className="text-xs text-slate-500 capitalize">Toyota Hilux • 2022</span>
                                </div>
                            </div>
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
                                <div className="flex items-center gap-4">
                                    <span className="text-4xl font-black text-slate-900">92</span>
                                    <div className="flex-1 space-y-1">
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[92%]"></div>
                                        </div>
                                        <span className="text-xs text-emerald-600 font-medium">+4.2% from last month</span>
                                    </div>
                                </div>
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
                    <div className="text-center py-12 text-slate-500 italic">No trip records found for this driver.</div>
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
