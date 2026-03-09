'use client'

import React, { useState } from 'react'
import { Search, Users, CheckCircle2, ChevronRight, X, Filter, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOCK_VEHICLES = [
    { id: '1', plate: 'LND-123-XY', group: 'LAGOS SOUTH', status: 'active' },
    { id: '2', plate: 'ABJ-456-ZZ', group: 'ABUJA CENTRAL', status: 'active' },
    { id: '3', plate: 'PH-789-BC', group: 'PORT HARCOURT', status: 'idle' },
    { id: '4', plate: 'KNC-101-KD', group: 'KANO NORTH', status: 'maintenance' },
    { id: '5', plate: 'LND-202-AB', group: 'LAGOS NORTH', status: 'active' },
    { id: '6', plate: 'ABJ-303-CD', group: 'ABUJA NORTH', status: 'active' },
]

export function BulkAssignmentModal({
    isOpen,
    onClose,
    geofenceName = 'WAREHOUSE ALPHA'
}: {
    isOpen: boolean
    onClose: () => void
    geofenceName?: string
}) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    if (!isOpen) return null

    const toggleVehicle = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const filteredVehicles = MOCK_VEHICLES.filter(v =>
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.group.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                            Bulk <span className="text-blue-600">Assignment</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Geofence: {geofenceName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full hover:bg-white flex items-center justify-center text-slate-400 transition-colors shadow-sm"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="SEARCH BY PLATE OR REGION..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-colors">
                        <Filter className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredVehicles.map((vehicle) => (
                        <div
                            key={vehicle.id}
                            onClick={() => toggleVehicle(vehicle.id)}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group",
                                selectedIds.includes(vehicle.id)
                                    ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-100"
                                    : "bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                                    selectedIds.includes(vehicle.id) ? "bg-white/20" : "bg-slate-100"
                                )}>
                                    <Truck className={cn("h-5 w-5", selectedIds.includes(vehicle.id) ? "text-white" : "text-slate-400")} />
                                </div>
                                <div>
                                    <h4 className={cn("text-sm font-black italic uppercase tracking-tight", selectedIds.includes(vehicle.id) ? "text-white" : "text-slate-900")}>
                                        {vehicle.plate}
                                    </h4>
                                    <p className={cn("text-[9px] font-bold uppercase tracking-widest", selectedIds.includes(vehicle.id) ? "text-blue-100" : "text-slate-400")}>
                                        {vehicle.group}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                                selectedIds.includes(vehicle.id) ? "bg-white border-white text-blue-600" : "border-slate-200 text-transparent"
                            )}>
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Selected Assets</p>
                        <h4 className="text-xl font-black text-slate-900">{selectedIds.length}</h4>
                    </div>
                    <button
                        disabled={selectedIds.length === 0}
                        onClick={() => {
                            console.log('Assigning vehicles:', selectedIds)
                            onClose()
                        }}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        COMPLETE ASSIGNMENT
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
