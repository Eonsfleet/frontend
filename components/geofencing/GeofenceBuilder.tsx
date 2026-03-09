'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { Save, X, Bell, Navigation, Info } from 'lucide-react'

// Import MapEditor dynamically to avoid SSR issues with Leaflet
const GeofenceMapEditor = dynamic(() => import('./GeofenceMapEditor'), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Initializing Spatial Engine...</div>
})

export function GeofenceBuilder({
    isOpen,
    onClose
}: {
    isOpen: boolean
    onClose: () => void
}) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        name: '',
        category: 'general',
        notifyEntry: true,
        notifyExit: true,
        shape: null as any
    })

    if (!isOpen) return null

    const handleSave = () => {
        console.log('Saving Geofence:', formData)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">

                {/* Left Side: Form & Settings */}
                <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
                    <div className="p-8 border-b border-slate-100">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                            Zone <span className="text-blue-600">Builder</span>
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Spatial Configuration Utility
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        {/* Identity Section */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Info className="h-3 w-3" />
                                Zone Identity
                            </label>
                            <input
                                type="text"
                                placeholder="E.G. MAIN WAREHOUSE"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <select
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="general">GENERAL ZONE</option>
                                <option value="restricted">RESTRICTED AREA</option>
                                <option value="loading">LOADING BAY</option>
                                <option value="customer">CUSTOMER SITE</option>
                            </select>
                        </div>

                        {/* Alert Logic */}
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Bell className="h-3 w-3" />
                                Alert Logic
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl cursor-pointer group">
                                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">ENTRY NOTIFICATION</span>
                                    <input
                                        type="checkbox"
                                        checked={formData.notifyEntry}
                                        onChange={(e) => setFormData({ ...formData, notifyEntry: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl cursor-pointer group">
                                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">EXIT NOTIFICATION</span>
                                    <input
                                        type="checkbox"
                                        checked={formData.notifyExit}
                                        onChange={(e) => setFormData({ ...formData, notifyExit: e.target.checked })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Spatial Data Summary */}
                        <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-600/10 space-y-2">
                            <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Spatial Summary</label>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                <span>TYPE:</span>
                                <span className="text-blue-600 uppercase">{formData.shape?.type || 'UNSET'}</span>
                            </div>
                            {formData.shape?.radius && (
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                    <span>RADIUS:</span>
                                    <span className="text-blue-600">{(formData.shape.radius / 1000).toFixed(2)} KM</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-8 space-y-3">
                        <button
                            onClick={handleSave}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all"
                        >
                            <Save className="h-4 w-4" />
                            ACTIVATE ZONE
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            DISCARD
                        </button>
                    </div>
                </div>

                {/* Right Side: Interactive Map */}
                <div className="flex-1 relative bg-slate-100">
                    <div className="absolute top-8 left-8 z-10">
                        <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                            <Navigation className="h-3 w-3 text-blue-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">MAP DRAWING ACTIVE</span>
                        </div>
                    </div>

                    <div className="h-full w-full">
                        <GeofenceMapEditor
                            onChange={(shape) => setFormData({ ...formData, shape })}
                        />
                    </div>

                    {/* Instructions Overlay */}
                    {!formData.shape && (
                        <div className="absolute bottom-8 left-8 right-8 z-10 pointer-events-none">
                            <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-2xl max-w-sm ml-auto">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight italic">Drawing Instructions</h4>
                                <ul className="mt-3 space-y-2">
                                    <li className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px]">1</div>
                                        SELECT CIRCLE OR POLYGON TOOL
                                    </li>
                                    <li className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px]">2</div>
                                        DRAW YOUR BOUNDARY ON THE MAP
                                    </li>
                                    <li className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px]">3</div>
                                        SAVE TO ACTIVATE MONITORING
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
