'use client'

import React, { useState } from 'react'
import { Camera, X } from 'lucide-react'
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
    const [selectedPhoto, setSelectedPhoto] = useState<CargoPhoto | null>(null)

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Cargo Photo Reports</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {photos.map((photo) => (
                        <div key={photo.id} className="space-y-1.5">
                            <button
                                onClick={() => setSelectedPhoto(photo)}
                                className="aspect-square rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden group hover:border-blue-400 hover:shadow-md transition-all duration-200 w-full"
                            >
                                {photo.url ? (
                                    <img 
                                        src={photo.url} 
                                        alt={photo.checkpoint} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                    />
                                ) : (
                                    <Camera className="h-6 w-6 text-slate-300 group-hover:text-slate-400 transition-colors" />
                                )}
                            </button>
                            <div>
                                <p className="text-xs font-semibold text-slate-900 truncate">{photo.checkpoint}</p>
                                <p className="text-[10px] text-slate-500 truncate">{photo.location}</p>
                            </div>
                        </div>
                    ))}
                    
                    {/* Request Photo Card */}
                    <button
                        onClick={onRequestPhoto}
                        className="aspect-square rounded-lg bg-slate-50 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
                    >
                        <div className="h-10 w-10 rounded-full bg-white border-2 border-slate-200 group-hover:border-blue-400 flex items-center justify-center transition-all duration-200 group-hover:scale-110">
                            <Camera className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors uppercase tracking-wider">
                                Request Photo
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Photo Popup Modal */}
            {selectedPhoto && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div 
                        className="relative max-w-4xl w-full max-h-[90vh] animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute -top-12 right-0 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-colors"
                        >
                            <X className="h-5 w-5 text-white" />
                        </button>

                        {/* Image */}
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                            {selectedPhoto.url ? (
                                <img 
                                    src={selectedPhoto.url} 
                                    alt={selectedPhoto.checkpoint}
                                    className="w-full h-auto max-h-[70vh] object-contain"
                                />
                            ) : (
                                <div className="w-full h-96 flex items-center justify-center bg-slate-100">
                                    <Camera className="h-16 w-16 text-slate-300" />
                                </div>
                            )}
                            
                            {/* Photo info */}
                            <div className="p-6 border-t border-slate-200">
                                <h4 className="text-lg font-bold text-slate-900 mb-1">{selectedPhoto.checkpoint}</h4>
                                <p className="text-sm text-slate-600">{selectedPhoto.location}</p>
                                {selectedPhoto.timestamp && (
                                    <p className="text-xs text-slate-500 mt-2">{selectedPhoto.timestamp}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
