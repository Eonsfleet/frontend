'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
    X,
    MapPin,
    Clock,
    Compass,
    Route,
    Gauge,
    Check,
    RotateCcw,
    Download,
    ArrowUpRight,
    Edit2,
    Play,
    Terminal,
    MoreHorizontal,
    AlertTriangle,
    CircleAlert,
    Info
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const AlertMiniMap = dynamic(
    () => import('@/app/(portal)/alerts/AlertMiniMap'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-lg">
                <span className="text-[10px] font-medium text-slate-400">Loading Map...</span>
            </div>
        )
    }
)

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
}

const SEVERITY_BG: Record<string, string> = {
    critical: '#fef2f2',
    warning: '#fffbeb',
    info: '#eff6ff',
}

function SeverityIcon({ severity, className = '' }: { severity: string; className?: string }) {
    if (severity === 'critical') {
        return (
            <div className={`w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 ${className}`}>
                <CircleAlert className="w-4 h-4 text-red-500" />
            </div>
        )
    }
    if (severity === 'warning') {
        return (
            <div className={`w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 ${className}`}>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
        )
    }
    return (
        <div className={`w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 ${className}`}>
            <Info className="w-4 h-4 text-blue-500" />
        </div>
    )
}

interface DetailRowProps {
    label: string
    value: string
    valueClass?: string
    valueIcon?: React.ReactNode
    suffix?: string
}

function DetailRow({ label, value, valueClass = '', valueIcon, suffix }: DetailRowProps) {
    return (
        <div className="flex items-baseline justify-between select-none">
            <span className="text-[12px] text-slate-400">{label}</span>
            <span className={`text-[13px] font-medium text-slate-800 text-right flex items-center gap-1 ${valueClass}`}>
                {valueIcon}
                {value}
                {suffix && <span className="text-[11px] text-slate-400 ml-0.5">{suffix}</span>}
            </span>
        </div>
    )
}

export interface RichAlertItem {
    id: string
    title: string
    vehicleName: string
    vehiclePlate: string
    severity: 'critical' | 'warning' | 'info'
    time: string
    relativeTime: string
    status: 'active' | 'acknowledged' | 'resolved'
    locationName: string
    lat: number
    lng: number
    ackBy?: string
    ackByInitials?: string
    ackRole?: string
    ackAt?: string
    ackNote?: string
    resBy?: string
    resAt?: string
    resNote?: string
    beforeSpeed?: string
    afterSpeed?: string
    relatedAlert?: string
    details: {
        speed?: number
        speedLimit?: number
        overspeedAmount?: string
        overspeedPercent?: string
        duration?: string
        distance?: string
        direction?: string
        driverName?: string
        fleetName?: string
        status?: string
        imageUrl?: string
    }
    timeline: {
        time: string
        title: string
        description?: string
    }[]
}

interface AlertsDrawerProps {
    isOpen: boolean
    onClose: () => void
    selectedAlert: RichAlertItem | undefined
    onAcknowledge: (id: string) => void
    onResolve: (id: string) => void
    onReopen: (id: string) => void
    onSaveNote: (id: string, note: string) => void
}

export function AlertsDrawer({
    isOpen,
    onClose,
    selectedAlert,
    onAcknowledge,
    onResolve,
    onReopen,
    onSaveNote
}: AlertsDrawerProps) {
    const router = useRouter()
    const [isEditingNote, setIsEditingNote] = useState(false)
    const [editNoteText, setEditNoteText] = useState('')

    useEffect(() => {
        if (selectedAlert) {
            setEditNoteText(selectedAlert.ackNote || '')
            setIsEditingNote(false)
        }
    }, [selectedAlert])

    if (!selectedAlert) return null

    const handleSaveNoteClick = () => {
        onSaveNote(selectedAlert.id, editNoteText)
        setIsEditingNote(false)
    }

    return (
        <div
            className={`border-l border-slate-100 bg-white h-full overflow-y-auto flex flex-col shrink-0 transition-all duration-300 ease-in-out relative ${
                isOpen ? 'w-[320px]' : 'w-0 opacity-0 pointer-events-none'
            }`}
        >
            <div className="w-[320px] flex flex-col h-full absolute right-0 top-0 bottom-0">
                {/* Drawer Header */}
                <div className="px-5 py-4 flex items-start justify-between shrink-0 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <SeverityIcon severity={selectedAlert.severity} />
                        <div>
                            <h3 className="text-[15px] font-semibold text-slate-900 leading-tight">{selectedAlert.title}</h3>
                            <Badge
                                style={{
                                    color: SEVERITY_COLORS[selectedAlert.severity],
                                    backgroundColor: SEVERITY_BG[selectedAlert.severity]
                                }}
                                className="text-[10px] font-medium border-none px-2 py-0 rounded capitalize mt-1"
                            >
                                {selectedAlert.severity}
                            </Badge>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-grow overflow-y-auto">
                    {/* Vehicle Info */}
                    <div className="px-5 py-4 flex gap-3 border-b border-slate-50">
                        <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            <img
                                className="w-full h-full object-cover"
                                src={selectedAlert.details.imageUrl || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=300"}
                                alt="Vehicle"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[13px] font-semibold text-slate-900 leading-tight">{selectedAlert.vehicleName}</h4>
                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    {selectedAlert.details.status || 'Moving'}
                                </span>
                            </div>
                            <p className="font-mono text-[12px] text-slate-500 mt-0.5">{selectedAlert.vehiclePlate}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Fleet: {selectedAlert.details.fleetName || 'Lagos Operations'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Driver: {selectedAlert.details.driverName || 'John Doe'}
                            </p>
                        </div>
                    </div>

                    {/* Telemetry Key-Value Rows */}
                    <div className="px-5 py-4 space-y-3 border-b border-slate-50">
                        <DetailRow label="Time" value={`May 20, 2024 ${selectedAlert.time}`} />
                        <DetailRow label="Location" value={selectedAlert.locationName} valueIcon={<MapPin className="w-3 h-3 text-blue-500 shrink-0" />} />
                        <DetailRow label="Speed" value={`${selectedAlert.details.speed || 0} km/h`} />
                        <DetailRow label="Speed Limit" value={`${selectedAlert.details.speedLimit || 60} km/h`} />
                        {selectedAlert.details.overspeedAmount && (
                            <DetailRow
                                label="Overspeed"
                                value={selectedAlert.details.overspeedAmount}
                                valueClass="text-red-500"
                                suffix={`(${selectedAlert.details.overspeedPercent})`}
                            />
                        )}
                        <DetailRow label="Duration" value={selectedAlert.details.duration || 'N/A'} />
                        <DetailRow label="Distance" value={selectedAlert.details.distance || 'N/A'} />
                        <DetailRow label="Direction" value={selectedAlert.details.direction || 'N/A'} />
                    </div>

                    {/* Active drawer */}
                    {selectedAlert.status === 'active' && (
                        <>
                            <div className="px-5 py-4 grid grid-cols-2 gap-2 border-b border-slate-50">
                                <Button
                                    onClick={() => onAcknowledge(selectedAlert.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium h-9 text-[13px] cursor-pointer"
                                >
                                    Acknowledge
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onResolve(selectedAlert.id)}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium h-9 text-[13px] cursor-pointer"
                                >
                                    Resolve
                                </Button>
                            </div>

                            <div className="px-5 py-4">
                                <h4 className="text-[13px] font-semibold text-slate-800 mb-3">Alert Timeline</h4>
                                <div className="relative pl-5 space-y-4 border-l border-slate-200 ml-1.5">
                                    {selectedAlert.timeline.map((node, idx) => (
                                        <div key={idx} className="relative">
                                            <div
                                                style={{ backgroundColor: idx === 0 ? SEVERITY_COLORS[selectedAlert.severity] : '#cbd5e1' }}
                                                className="absolute -left-[23px] top-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                                            />
                                            <div className="text-[11px] text-slate-400">{node.time}</div>
                                            <div className="text-[13px] font-medium text-slate-800 mt-0.5 leading-snug">{node.title}</div>
                                            {node.description && (
                                                <div className="text-[12px] text-slate-500 mt-0.5">{node.description}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => toast.info('Opening full timeline log')}
                                    className="w-full mt-4 flex items-center justify-between text-[12px] font-medium text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50/50 transition-colors cursor-pointer"
                                >
                                    <span>View Full History</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </>
                    )}

                    {/* Acknowledged drawer */}
                    {selectedAlert.status === 'acknowledged' && (
                        <>
                            <div className="px-5 py-4 border-b border-slate-50">
                                <div className="rounded-lg overflow-hidden h-[160px] relative">
                                    <AlertMiniMap
                                        lat={selectedAlert.lat}
                                        lng={selectedAlert.lng}
                                        severity={selectedAlert.severity}
                                    />
                                    <button
                                        onClick={() => toast.info('Centering main tracker map on coordinates')}
                                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-medium text-blue-600 hover:bg-white transition-colors cursor-pointer"
                                    >
                                        View on Map
                                    </button>
                                </div>
                            </div>

                            <div className="px-5 py-4 border-b border-slate-50">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[13px] font-semibold text-slate-800">Acknowledgement Details</h4>
                                    <button
                                        onClick={() => setIsEditingNote(!isEditingNote)}
                                        className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                        {isEditingNote ? 'Cancel' : 'Edit Note'}
                                    </button>
                                </div>
                                <div className="space-y-2.5">
                                    <DetailRow label="Acknowledged By" value={selectedAlert.ackBy || 'You'} />
                                    <DetailRow label="Role" value={selectedAlert.ackRole || 'Fleet Manager'} />
                                    <DetailRow label="Acknowledged At" value={selectedAlert.ackAt || 'May 20, 2024'} />
                                    <div>
                                        <span className="text-[12px] text-slate-400">Note (Optional)</span>
                                        {isEditingNote ? (
                                            <div className="mt-1.5 space-y-2">
                                                <textarea
                                                    className="w-full p-2 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
                                                    rows={3}
                                                    value={editNoteText}
                                                    onChange={(e) => setEditNoteText(e.target.value)}
                                                />
                                                <Button
                                                    onClick={handleSaveNoteClick}
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-7 text-[11px] cursor-pointer"
                                                >
                                                    Save Note
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-[12px] text-slate-600 mt-1 italic">
                                                &ldquo;{selectedAlert.ackNote || 'No notes added.'}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-4 grid grid-cols-2 gap-2">
                                <Button
                                    onClick={() => onResolve(selectedAlert.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium h-9 text-[12px] gap-1.5 cursor-pointer"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    Mark as Resolved
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => onReopen(selectedAlert.id)}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium h-9 text-[12px] gap-1.5 cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reopen Alert
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Resolved drawer */}
                    {selectedAlert.status === 'resolved' && (
                        <>
                            <div className="px-5 py-4 border-b border-slate-50">
                                <h4 className="text-[13px] font-semibold text-slate-800 mb-3">Before vs After Comparison</h4>
                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="bg-red-50 rounded-lg p-3">
                                        <div className="text-[10px] font-medium text-red-500 uppercase">Before Event</div>
                                        <div className="text-base font-semibold text-red-700 mt-1">{selectedAlert.beforeSpeed || '98 km/h'}</div>
                                    </div>
                                    <div className="bg-emerald-50 rounded-lg p-3">
                                        <div className="text-[10px] font-medium text-emerald-500 uppercase">After Resolution</div>
                                        <div className="text-base font-semibold text-emerald-700 mt-1">{selectedAlert.afterSpeed || '58 km/h'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-4 border-b border-slate-50">
                                <div className="rounded-lg overflow-hidden h-[160px] relative">
                                    <AlertMiniMap
                                        lat={selectedAlert.lat}
                                        lng={selectedAlert.lng}
                                        severity={selectedAlert.severity}
                                    />
                                    <button
                                        onClick={() => toast.info('Centering playback path')}
                                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-medium text-blue-600 hover:bg-white transition-colors cursor-pointer"
                                    >
                                        View in Playback
                                    </button>
                                </div>
                            </div>

                            <div className="px-5 py-4 border-b border-slate-50">
                                <h4 className="text-[13px] font-semibold text-slate-800 mb-3">Resolution Details</h4>
                                <div className="space-y-2.5">
                                    <DetailRow label="Resolved By" value={selectedAlert.resBy || 'You'} />
                                    <DetailRow label="Resolved At" value={selectedAlert.resAt || 'May 20, 2024'} />
                                    <div>
                                        <span className="text-[12px] text-slate-400">Resolution Notes</span>
                                        <p className="text-[12px] text-slate-600 mt-1 italic leading-relaxed">
                                            &ldquo;{selectedAlert.resNote || 'No resolution notes provided.'}&rdquo;
                                        </p>
                                    </div>
                                    {selectedAlert.relatedAlert && (
                                        <div>
                                            <span className="text-[12px] text-slate-400">Related Alerts</span>
                                            <p className="text-[12px] text-slate-600 mt-1 flex items-center gap-1.5">
                                                <AlertTriangle className="w-3 h-3 text-slate-400" />
                                                {selectedAlert.relatedAlert}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-5 py-4 grid grid-cols-2 gap-2">
                                <Button
                                    onClick={() => onReopen(selectedAlert.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium h-9 text-[12px] gap-1.5 cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reopen Alert
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => toast.success('Downloading incident reports')}
                                    className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium h-9 text-[12px] gap-1.5 cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Download PDF
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="px-5 py-4 border-t border-slate-100 shrink-0 bg-white">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2.5">Actions</span>
                    <div className="grid grid-cols-5 gap-1.5">
                        {[
                            { icon: MapPin, label: 'Live Track', action: () => toast.success(`Tracking ${selectedAlert.vehiclePlate} in real-time`) },
                            { icon: Play, label: 'Playback', action: () => router.push('/tracking') },
                            { icon: Route, label: 'Route History', action: () => toast.success('Loading historical route patterns') },
                            { icon: Terminal, label: 'Send Command', action: () => toast.info(`Command Terminal opened for ${selectedAlert.vehiclePlate}`) },
                            { icon: MoreHorizontal, label: 'More', action: () => toast.info('Opening contextual menu options') },
                        ].map(({ icon: Icon, label, action }) => (
                            <button
                                key={label}
                                onClick={action}
                                className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-colors group cursor-pointer"
                            >
                                <Icon className="w-4 h-4 mb-1 group-hover:scale-105 transition-transform" />
                                <span className="text-[9px] font-medium leading-tight text-center">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
