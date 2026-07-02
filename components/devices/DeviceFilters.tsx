'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

export interface DeviceFiltersState {
    status?: string
}

interface DeviceFiltersProps {
    filters: DeviceFiltersState
    onFiltersChange: (filters: DeviceFiltersState) => void
}

export function DeviceFilters({ filters, onFiltersChange }: DeviceFiltersProps) {
    return (
        <Select
            value={filters.status || 'all'}
            onValueChange={(val) => onFiltersChange({ ...filters, status: val === 'all' ? undefined : val })}
        >
            <SelectTrigger className="w-full sm:w-[180px] h-10 border-slate-200 text-slate-600">
                <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
        </Select>
    )
}
