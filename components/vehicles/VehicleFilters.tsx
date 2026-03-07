'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Filter, X, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface VehicleFilters {
    make?: string
    model?: string
    year?: string
    fuel_type?: string
    body_type?: string
    type?: string
    status?: string
}

interface VehicleFiltersProps {
    filters: VehicleFilters
    onFiltersChange: (filters: VehicleFilters) => void
}

export function VehicleFiltersComponent({ filters, onFiltersChange }: VehicleFiltersProps) {
    const [localFilters, setLocalFilters] = React.useState<VehicleFilters>(filters)
    const [isOpen, setIsOpen] = React.useState(false)

    // Update local state when prop changes (e.g. from outside reset)
    React.useEffect(() => {
        setLocalFilters(filters)
    }, [filters])

    const handleApply = () => {
        onFiltersChange(localFilters)
        setIsOpen(false)
    }

    const handleReset = () => {
        const resetFilters = {}
        setLocalFilters(resetFilters)
        onFiltersChange(resetFilters)
        setIsOpen(false)
    }

    const handleClearField = (field: keyof VehicleFilters) => {
        const newFilters = { ...localFilters }
        delete newFilters[field]
        setLocalFilters(newFilters)
    }

    const activeFilterCount = Object.keys(filters).length

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto text-slate-600 border-slate-200 h-10 relative">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <Badge
                            variant="default"
                            className="ml-2 bg-blue-600 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
                        >
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>Advanced Filters</DialogTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="h-8 text-slate-500 hover:text-slate-900"
                        >
                            <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                    </div>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="make">Make</Label>
                            <Input
                                id="make"
                                placeholder="Toyota, Mercedes..."
                                value={localFilters.make || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, make: e.target.value })}
                                className="h-9"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="model">Model</Label>
                            <Input
                                id="model"
                                placeholder="Camry, Actros..."
                                value={localFilters.model || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, model: e.target.value })}
                                className="h-9"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="year">Year</Label>
                            <Input
                                id="year"
                                type="number"
                                placeholder="2024"
                                value={localFilters.year || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, year: e.target.value })}
                                className="h-9"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="fuel_type">Fuel Type</Label>
                            <Select
                                value={localFilters.fuel_type || 'all'}
                                onValueChange={(val) => setLocalFilters({ ...localFilters, fuel_type: val === 'all' ? undefined : val })}
                            >
                                <SelectTrigger id="fuel_type" className="h-9">
                                    <SelectValue placeholder="Select fuel type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fuel Types</SelectItem>
                                    <SelectItem value="Petrol">Petrol</SelectItem>
                                    <SelectItem value="Diesel">Diesel</SelectItem>
                                    <SelectItem value="Electric">Electric</SelectItem>
                                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                                    <SelectItem value="Gas">Gas (CNG/LPG)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="body_type">Body Type</Label>
                            <Select
                                value={localFilters.body_type || 'all'}
                                onValueChange={(val) => setLocalFilters({ ...localFilters, body_type: val === 'all' ? undefined : val })}
                            >
                                <SelectTrigger id="body_type" className="h-9">
                                    <SelectValue placeholder="Select body type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Body Types</SelectItem>
                                    <SelectItem value="Sedan">Sedan</SelectItem>
                                    <SelectItem value="Truck">Truck</SelectItem>
                                    <SelectItem value="Van">Van</SelectItem>
                                    <SelectItem value="SUV">SUV</SelectItem>
                                    <SelectItem value="Coupe">Coupe</SelectItem>
                                    <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="type">Fleet Type</Label>
                            <Input
                                id="type"
                                placeholder="Fleet, Subcontracted..."
                                value={localFilters.type || ''}
                                onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value })}
                                className="h-9"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={localFilters.status || 'all'}
                                onValueChange={(val) => setLocalFilters({ ...localFilters, status: val === 'all' ? undefined : val })}
                            >
                                <SelectTrigger id="status" className="h-9">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="in_transit">In Transit</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="pt-2 border-t flex items-center gap-2 mt-4">
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 h-9" onClick={handleApply}>
                            Apply Filters
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
