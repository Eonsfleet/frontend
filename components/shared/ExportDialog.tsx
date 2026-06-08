'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Loader2 } from 'lucide-react'
import { exportVehicles, exportDrivers, exportUsers, ExportFormat, EntityType } from '@/lib/api/import-export'
import { toast } from 'sonner'

// -------------------------------------------------------------------------
// Column definitions per entity
// -------------------------------------------------------------------------

const VEHICLE_COLUMNS = [
    'ID', 'Make', 'Model', 'Year', 'Registration No.', 'Display No.', 'Chassis No.',
    'Body Type', 'Type', 'Color', 'Fuel Type', 'Status', 'Device Status', 'Allocated',
    'Total Mileage (km)', 'Created At',
]

const DRIVER_COLUMNS = [
    'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Employee No.', 'Role', 'Status', 'Created At',
]

const USER_COLUMNS = [
    'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Employee No.', 'Role', 'Status', 'Created At',
]

const ENTITY_COLUMNS: Record<EntityType, string[]> = {
    vehicles: VEHICLE_COLUMNS,
    drivers:  DRIVER_COLUMNS,
    users:    USER_COLUMNS,
}

const ENTITY_LABELS: Record<EntityType, string> = {
    vehicles: 'Vehicles',
    drivers:  'Drivers',
    users:    'Users',
}

// -------------------------------------------------------------------------
// Vehicle-specific filters
// -------------------------------------------------------------------------

const VEHICLE_STATUS_OPTIONS = ['active', 'inactive', 'maintenance', 'decommissioned']
const DEVICE_STATUS_OPTIONS  = ['active', 'inactive']

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

interface ExportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entity: EntityType
}

export function ExportDialog({ open, onOpenChange, entity }: ExportDialogProps) {
    const [format, setFormat]           = useState<ExportFormat>('excel')
    const [selectedCols, setSelectedCols] = useState<string[]>(ENTITY_COLUMNS[entity])
    const [isExporting, setIsExporting] = useState(false)

    // Vehicle-specific filters
    const [vehicleStatus, setVehicleStatus]   = useState<string>('')
    const [deviceStatus, setDeviceStatus]     = useState<string>('')
    const [isAllocated, setIsAllocated]       = useState<string>('')

    // User/Driver-specific filters
    const [userStatus, setUserStatus] = useState<string>('')
    const [driverRole, setDriverRole] = useState<string>('')

    const label   = ENTITY_LABELS[entity]
    const columns = ENTITY_COLUMNS[entity]

    const allChecked  = selectedCols.length === columns.length
    const someChecked = selectedCols.length > 0 && !allChecked

    const toggleColumn = (col: string) => {
        setSelectedCols(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        )
    }

    const toggleAll = () => {
        setSelectedCols(allChecked ? [] : [...columns])
    }

    const handleExport = async () => {
        if (selectedCols.length === 0) {
            toast.error('Select at least one column to export.')
            return
        }

        setIsExporting(true)
        try {
            const cols = selectedCols.length < columns.length ? selectedCols : undefined

            if (entity === 'vehicles') {
                await exportVehicles({
                    format,
                    columns: cols,
                    status:       vehicleStatus || undefined,
                    device_status: deviceStatus || undefined,
                    is_allocated:  isAllocated !== '' ? isAllocated === 'true' : undefined,
                })
            } else if (entity === 'drivers') {
                await exportDrivers({
                    format,
                    columns: cols,
                    role:   'driver',
                    status: userStatus || undefined,
                })
            } else {
                await exportUsers({
                    format,
                    columns: cols,
                    status: userStatus || undefined,
                    role:   driverRole || undefined,
                })
            }

            toast.success(`${label} exported successfully.`)
            onOpenChange(false)
        } catch {
            toast.error('Export failed. Please try again.')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] rounded-3xl border-slate-200 shadow-2xl">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base font-black uppercase italic tracking-wide text-slate-900">
                        Export {label}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-slate-400 uppercase tracking-widest">
                        Choose format, filters, and columns
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 pt-1">
                    {/* Format */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Format</Label>
                        <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                            <SelectTrigger className="rounded-xl border-slate-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                                <SelectItem value="csv">CSV (.csv)</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Vehicle-specific filters */}
                    {entity === 'vehicles' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</Label>
                                <Select value={vehicleStatus} onValueChange={setVehicleStatus}>
                                    <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All</SelectItem>
                                        {VEHICLE_STATUS_OPTIONS.map(s => (
                                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Device Status</Label>
                                <Select value={deviceStatus} onValueChange={setDeviceStatus}>
                                    <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All</SelectItem>
                                        {DEVICE_STATUS_OPTIONS.map(s => (
                                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Driver Assignment</Label>
                                <Select value={isAllocated} onValueChange={setIsAllocated}>
                                    <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                                        <SelectValue placeholder="All vehicles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All vehicles</SelectItem>
                                        <SelectItem value="true">Assigned to driver</SelectItem>
                                        <SelectItem value="false">Unassigned</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* User/Driver-specific filters */}
                    {(entity === 'users' || entity === 'drivers') && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</Label>
                                <Select value={userStatus} onValueChange={setUserStatus}>
                                    <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                                        <SelectValue placeholder="All" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {entity === 'users' && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Role</Label>
                                    <Select value={driverRole} onValueChange={setDriverRole}>
                                        <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                                            <SelectValue placeholder="All roles" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All roles</SelectItem>
                                            <SelectItem value="fleet_manager">Fleet Manager</SelectItem>
                                            <SelectItem value="dispatcher">Dispatcher</SelectItem>
                                            <SelectItem value="driver">Driver</SelectItem>
                                            <SelectItem value="mechanic">Mechanic</SelectItem>
                                            <SelectItem value="finance">Finance</SelectItem>
                                            <SelectItem value="compliance">Compliance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Column selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Columns</Label>
                            <button
                                className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700"
                                onClick={toggleAll}
                            >
                                {allChecked ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-3 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                            {columns.map((col) => (
                                <label key={col} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded-lg px-2 py-1 transition-colors">
                                    <Checkbox
                                        checked={selectedCols.includes(col)}
                                        onCheckedChange={() => toggleColumn(col)}
                                        className="rounded"
                                    />
                                    <span className="text-[11px] text-slate-700 font-medium">{col}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400">{selectedCols.length} of {columns.length} columns selected</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
                            onClick={handleExport}
                            disabled={isExporting || selectedCols.length === 0}
                        >
                            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            {isExporting ? 'Exporting...' : `Export ${label}`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
