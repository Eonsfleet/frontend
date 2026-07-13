'use client'

import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { RealtimeVehicle } from './useFuelRealtime'

const LAGOS: [number, number] = [6.5244, 3.3792]

function fallbackPositionFor(id: number): [number, number] {
    const a = ((id * 73) % 100) / 100
    const b = ((id * 137) % 100) / 100
    return [LAGOS[0] - 0.06 + a * 0.14, LAGOS[1] - 0.08 + b * 0.2]
}

function positionFor(vehicle: RealtimeVehicle): [number, number] {
    return vehicle.position ?? fallbackPositionFor(vehicle.id)
}

function badgeColor(pct: number | null): string {
    if (pct == null) return '#94a3b8'
    if (pct <= 20) return '#ef4444'
    if (pct <= 40) return '#f59e0b'
    return '#10b981'
}

function badgeIcon(pct: number | null, active: boolean, showFuelLevel: boolean) {
    const color = badgeColor(pct)
    const ring = active ? 'box-shadow:0 0 0 3px rgba(37,99,235,.35);' : ''
    return L.divIcon({
        className: 'fuel-rt-badge',
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
            ${showFuelLevel ? `<span style="background:${color};color:#fff;font:700 11px/1 ui-sans-serif,system-ui;padding:3px 6px;border-radius:8px;border:2px solid #fff;${ring}">${pct ?? '—'}%</span>` : ''}
            <span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:#fff;border:2px solid ${active ? '#2563eb' : color};font-size:16px;line-height:1;${!showFuelLevel ? ring : ''}">🚚</span>
        </div>`,
        iconSize: [44, 40],
        iconAnchor: [22, 40],
    })
}

function FitBounds({ points }: { points: [number, number][] }) {
    const map = useMap()
    useEffect(() => {
        if (points.length === 0) return
        map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 13 })
    }, [points, map])
    return null
}

function ActiveVehicleFocus({ position }: { position: [number, number] | null }) {
    const map = useMap()
    useEffect(() => {
        if (!position) return
        map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.45 })
    }, [position, map])
    return null
}

const LAYERS = {
    Map: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    Satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    Traffic: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
} as const
type LayerKey = keyof typeof LAYERS

interface RealtimeMapProps {
    vehicles: RealtimeVehicle[]
    activeId: number | null
    onSelect: (id: number) => void
}

export function RealtimeMap({ vehicles, activeId, onSelect }: RealtimeMapProps) {
    const [layer, setLayer] = useState<LayerKey>('Map')
    const [showFuelLevel, setShowFuelLevel] = useState(true)
    const points = useMemo(() => vehicles.map(positionFor), [vehicles])
    const activePosition = useMemo(() => {
        const vehicle = vehicles.find((v) => v.id === activeId)
        return vehicle ? positionFor(vehicle) : null
    }, [activeId, vehicles])

    return (
        <div className="relative h-full min-h-[380px] w-full overflow-hidden rounded-2xl border border-slate-100">
            <MapContainer center={LAGOS} zoom={12} scrollWheelZoom={false} zoomControl={false} className="h-full w-full" style={{ background: '#e5e7eb' }}>
                <TileLayer url={LAYERS[layer]} attribution="&copy; OpenStreetMap" />
                {vehicles.map((v) => (
                    <Marker
                        key={v.id}
                        position={positionFor(v)}
                        icon={badgeIcon(v.fuelPercent, v.id === activeId, showFuelLevel)}
                        eventHandlers={{ click: () => onSelect(v.id) }}
                    />
                ))}
                <FitBounds points={points} />
                <ActiveVehicleFocus position={activePosition} />
            </MapContainer>

            {/* Layer toggle */}
            <div className="absolute left-3 top-3 z-[500] inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                {(Object.keys(LAYERS) as LayerKey[]).map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setLayer(k)}
                        className={cn(
                            'rounded-md px-3 py-1 text-[12px] font-medium transition-colors duration-200',
                            layer === k ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700',
                        )}
                    >
                        {k}
                    </button>
                ))}
            </div>

            {/* Show fuel level chip */}
            <button
                type="button"
                aria-pressed={showFuelLevel}
                onClick={() => setShowFuelLevel((current) => !current)}
                className="absolute right-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 shadow-sm transition-colors duration-200 hover:bg-slate-50"
            >
                <span className={cn(
                    'flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border text-[10px]',
                    showFuelLevel ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-300 text-transparent',
                )}>
                    ✓
                </span>
                Show fuel level
            </button>

            {/* Live pill */}
            <div className="absolute bottom-3 right-3 z-[500] inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-600 shadow-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
            </div>
        </div>
    )
}
