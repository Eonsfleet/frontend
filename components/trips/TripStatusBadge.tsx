import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

interface TripStatusBadgeProps {
    status: TripStatus
    className?: string
}

export function TripStatusBadge({ status, className }: TripStatusBadgeProps) {
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline'
    let label = status.replace('_', ' ')

    switch (status) {
        case 'scheduled':
            variant = 'secondary'
            break
        case 'in_progress':
            variant = 'default'
            break
        case 'completed':
            variant = 'outline' // maybe a custom greenish one later
            break
        case 'cancelled':
            variant = 'destructive'
            break
    }

    const statusColors = {
        scheduled: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50',
        in_progress: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
        completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
        cancelled: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50',
    }

    return (
        <Badge
            variant="outline"
            className={cn(
                "capitalize py-0.5 px-2 font-medium",
                statusColors[status],
                className
            )}
        >
            {label}
        </Badge>
    )
}
