'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Mail, Phone, MapPin, User as UserIcon } from 'lucide-react'
import { format } from 'date-fns'

interface TripDriverInfoProps {
    driver?: {
        id?: string | number
        organization_id?: number
        attributes?: {
            first_name?: string
            last_name?: string
            full_name?: string
            employee_number?: string | null
            email?: string
            date_of_birth?: string | null
            age?: number | null
            phone_number?: string
            avatar?: string
            last_login?: string | null
            status?: string
            role?: string
            joined_date?: string
        }
        relationships?: any[]
    } | null | undefined
}

export function TripDriverInfo({ driver }: TripDriverInfoProps) {
    if (!driver || !driver.attributes) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <p className="text-slate-500">No driver assigned to this trip</p>
            </div>
        )
    }

    const driverName = driver.attributes.full_name || `${driver.attributes.first_name} ${driver.attributes.last_name}` || 'Unknown Driver'
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    const formatDate = (date?: string | null) => {
        if (!date) return 'N/A'
        try {
            return format(new Date(date), 'MMM dd, yyyy')
        } catch {
            return 'N/A'
        }
    }

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'active':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200'
            case 'pending_activation':
                return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'inactive':
                return 'bg-slate-50 text-slate-700 border-slate-200'
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200'
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Driver Header */}
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-slate-100">
                    <AvatarImage src={driver.attributes.avatar} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-lg">
                        {getInitials(driverName)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-lg font-bold text-slate-900">{driverName}</p>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${getStatusColor(driver.attributes.status)}`}>
                            {driver.attributes.status?.replace('_', ' ')}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        {driver.attributes.role || 'Driver'} • ID: {driver.id}
                    </p>
                </div>
            </div>

            {/* Driver Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email Address */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Email Address</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium break-all">
                        {driver.attributes.email || 'N/A'}
                    </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Phone Number</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium">
                        {driver.attributes.phone_number || 'N/A'}
                    </p>
                </div>

                {/* Joined Date */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Joined Date</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium">
                        {formatDate(driver.attributes.joined_date)}
                    </p>
                </div>

                {/* Employee Number */}
                {driver.attributes.employee_number && (
                    <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500">
                            <UserIcon className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Employee Number</span>
                        </div>
                        <p className="text-sm text-slate-900 font-medium font-mono">
                            {driver.attributes.employee_number}
                        </p>
                    </div>
                )}

                {/* Last Login */}
                {driver.attributes.last_login && (
                    <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Last Login</span>
                        </div>
                        <p className="text-sm text-slate-900 font-medium">
                            {formatDate(driver.attributes.last_login)}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
