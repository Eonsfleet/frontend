'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Mail, Phone, MapPin } from 'lucide-react'
import { format } from 'date-fns'

interface TripDriverInfoProps {
    driver?: {
        id?: string | number
        name?: string
        full_name?: string
        email?: string
        phone?: string
        phone_number?: string
        avatar?: string
        location?: string
        created_at?: string
        assigned_at?: string
        end_date?: string
    }
}

export function TripDriverInfo({ driver }: TripDriverInfoProps) {
    if (!driver) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <p className="text-slate-500">No driver assigned to this trip</p>
            </div>
        )
    }

    const driverName = driver.full_name || driver.name || 'Unknown Driver'
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    const formatDate = (date?: string) => {
        if (!date) return 'N/A'
        try {
            return format(new Date(date), 'M/dd/yyyy, HH:mm')
        } catch {
            return 'N/A'
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Driver Header */}
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={driver.avatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-lg">
                        {getInitials(driverName)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm text-slate-500 mb-1">Full Name</p>
                    <p className="text-lg font-semibold text-slate-900">{driverName}</p>
                </div>
            </div>

            {/* Driver Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Created On */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Created on</span>
                    </div>
                    <p className="text-slate-900 font-medium">{formatDate(driver.created_at)}</p>
                </div>

                {/* Assigned Date */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Assigned Date</span>
                    </div>
                    <p className="text-slate-900 font-medium">{formatDate(driver.assigned_at)}</p>
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Email Address</span>
                    </div>
                    <p className="text-slate-900 font-medium break-all">{driver.email || 'N/A'}</p>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">Phone Number</span>
                    </div>
                    <p className="text-slate-900 font-medium">{driver.phone || driver.phone_number || 'N/A'}</p>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">End Date</span>
                    </div>
                    <p className="text-slate-900 font-medium">{formatDate(driver.end_date)}</p>
                </div>

                {/* Location */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-500">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">Location</span>
                    </div>
                    <p className="text-slate-900 font-medium">{driver.location || 'N/A'}</p>
                </div>
            </div>
        </div>
    )
}
