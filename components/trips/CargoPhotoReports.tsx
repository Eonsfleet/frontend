'use client'

import React from 'react'
import { Camera, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CargoPhoto {
    id: string | number
    url?: string
    checkpoint: string
    location: string
    timestamp?: string
}

interface CargoPhotoReportsProps {
    photos?: CargoPhoto[]
    onRequestPhoto?: () => void
}

export function CargoPhotoReports({ photos = [], onRequestPhoto }: CargoPhotoReportsProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Cargo Photo Reports</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                        <div className="aspect-square rounded-lg bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                            {photo.url ? (
                                <img src={photo.url} alt={photo.checkpoint} className="w-full h-full object-cover" />
                            ) : (
                                <Camera className="h-8 w-8 text-slate-300" />
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-900">{photo.checkpoint}</p>
                            <p className="text-xs text-slate-500">{photo.location}</p>
                        </div>
                    </div>
                ))}
                
                {/* Request Photo Card */}
                <button
                    onClick={onRequestPhoto}
                    className="aspect-square rounded-lg bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2 group"
                >
                    <div className="h-12 w-12 rounded-full bg-white border-2 border-slate-200 group-hover:border-blue-400 flex items-center justify-center transition-colors">
                        <Camera className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-semibold text-slate-600 group-hover:text-blue-600 transition-colors">
                            Request
                        </p>
                        <p className="text-xs text-slate-500">Photo</p>
                    </div>
                </button>
            </div>
        </div>
    )
}
