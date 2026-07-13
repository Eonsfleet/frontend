'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

export interface AlertItem {
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
    details: {
        speed?: number
        speedLimit?: number
        duration?: string
        distance?: string
        direction?: string
        overspeedAmount?: string
        overspeedPercent?: string
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

interface AlertsMapProps {
    alerts: AlertItem[]
    selectedAlert?: AlertItem
    onSelectAlert: (alert: AlertItem) => void
}

// Controller to auto-pan and center map on selected alert
const MapController = ({ selectedAlert }: { selectedAlert?: AlertItem }) => {
    const map = useMap()

    useEffect(() => {
        if (selectedAlert) {
            map.setView([selectedAlert.lat, selectedAlert.lng], 14, { animate: true })
        }
    }, [selectedAlert, map])

    return null
}

// Custom pulsing Leaflet marker icon utilizing CSS
const getSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#3b82f6'
    const bgColor = severity === 'critical' ? '#fee2e2' : severity === 'warning' ? '#fef3c7' : '#dbeafe'

    return L.divIcon({
        html: `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background-color: ${bgColor};
                border: 2.5px solid ${color};
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
                position: relative;
            ">
                <div style="
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background-color: ${color};
                "></div>
                <div style="
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid ${color};
                    animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
                    opacity: 0.45;
                "></div>
            </div>
        `,
        className: 'custom-alert-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    })
}

export default function AlertsMap({ alerts, selectedAlert, onSelectAlert }: AlertsMapProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse">
                <span className="text-sm font-semibold text-slate-500">Initializing Map...</span>
            </div>
        )
    }

    // Default center (Ikeja, Lagos) matching the image
    const defaultCenter: [number, number] = [6.592, 3.342]

    return (
        <div className="w-full h-full relative z-0 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <MapContainer
                center={selectedAlert ? [selectedAlert.lat, selectedAlert.lng] : defaultCenter}
                zoom={13}
                className="w-full h-full"
                scrollWheelZoom={true}
            >
                <MapController selectedAlert={selectedAlert} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {alerts.map((alert) => (
                    <Marker
                        key={alert.id}
                        position={[alert.lat, alert.lng]}
                        icon={getSeverityIcon(alert.severity)}
                        eventHandlers={{
                            click: () => onSelectAlert(alert),
                        }}
                    >
                        <Popup className="custom-popup">
                            <div className="p-2 min-w-[180px] text-xs font-sans">
                                <div className="flex items-center gap-1.5 mb-1 font-black text-slate-900 leading-tight">
                                    <span style={{
                                        display: 'inline-block',
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'warning' ? '#f59e0b' : '#3b82f6'
                                    }}></span>
                                    {alert.title}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 mb-2">
                                    {alert.vehicleName} • {alert.vehiclePlate}
                                </div>
                                <div className="text-[10px] text-slate-400 mb-3 font-semibold">
                                    {alert.time} • {alert.relativeTime}
                                </div>
                                
                                {alert.details?.speed && (
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 bg-slate-50 p-1.5 rounded-lg border border-slate-100 font-semibold">
                                        <div className="text-slate-400">Speed:</div>
                                        <div className="text-slate-800 text-right">{alert.details.speed} km/h</div>
                                        <div className="text-slate-400">Limit:</div>
                                        <div className="text-slate-800 text-right">{alert.details.speedLimit} km/h</div>
                                    </div>
                                )}
                                
                                <button
                                    onClick={() => onSelectAlert(alert)}
                                    className="w-full py-1 text-center font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                >
                                    View Details
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
            
            {/* Custom map control overlay styles (ensures clean standard look) */}
            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    padding: 0;
                }
                .leaflet-popup-content {
                    margin: 0;
                }
                .leaflet-container {
                    font-family: inherit;
                }
            `}</style>
        </div>
    )
}
