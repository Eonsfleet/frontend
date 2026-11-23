'use client'

import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef } from 'react'
import type { RealtimeFuelVehicle } from '@/lib/api/fuelPage'
import { LOW_FUEL_PERCENT } from './useFuelBoard'
import { FREE_TILE_URL, FREE_TILE_ATTRIBUTION } from '@/lib/map/freeTiles'

const LAGOS: [number, number] = [6.5244, 3.3792]

function colour(percent: number | null): string {
    if (percent == null) return '#94a3b8'
    if (percent <= LOW_FUEL_PERCENT) return '#ef4444'
    if (percent <= 40) return '#f59e0b'
    return '#10b981'
}

function icon(v: RealtimeFuelVehicle, active: boolean) {
    const c = colour(v.level_percent)
    const ring = active ? 'box-shadow:0 0 0 3px rgba(0,85,255,.28);' : ''
    const faded = v.freshness === 'stale' ? 'opacity:.6;' : ''
    return L.divIcon({
        className: 'fuel-rt-badge',
        html: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;${faded}">
            <span style="background:${c};color:#fff;font:700 11px/1 ui-sans-serif,system-ui;padding:3px 6px;border-radius:8px;border:2px solid #fff;${ring}">${v.level_percent == null ? '—' : Math.round(v.level_percent) + '%'}</span>
            <span style="width:12px;height:12px;border-radius:999px;background:#fff;border:3px solid ${active ? '#0055FF' : c}"></span>
        </div>`,
        iconSize: [44, 36],
        iconAnchor: [22, 34],
    })
}

function FitOnce({ points, signature }: { points: [number, number][]; signature: string }) {
    const map = useMap()
    const last = useRef<string | null>(null)
    useEffect(() => {
        if (points.length === 0 || last.current === signature) return
        last.current = signature
        map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 13 })
        // Fit when the set of vehicles changes, not on every live position nudge.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature, map])
    return null
}

function Focus({ position, id }: { position: [number, number] | null; id: number | null }) {
    const map = useMap()
    const ref = useRef(position)
    useEffect(() => {
        ref.current = position
    }, [position])
    useEffect(() => {
        // Once per selection: a live position nudge must not restart the fly-to.
        if (id != null && ref.current) map.flyTo(ref.current, Math.max(map.getZoom(), 13), { duration: 0.45 })
    }, [id, map])
    return null
}

/** Vehicles at their last known positions. One with no position is not drawn anywhere: it is counted below instead. */
export function FuelLevelMap({ vehicles, activeId, onSelect }: { vehicles: RealtimeFuelVehicle[]; activeId: number | null; onSelect: (id: number) => void }) {
    const placed = useMemo(() => vehicles.filter((v) => v.location != null), [vehicles])
    const points = useMemo(() => placed.map((v) => [v.location!.latitude, v.location!.longitude] as [number, number]), [placed])
    const signature = useMemo(() => placed.map((v) => v.vehicle_id).sort((a, b) => a - b).join(','), [placed])
    const active = placed.find((v) => v.vehicle_id === activeId)
    const missing = vehicles.length - placed.length

    return (
        <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl bg-white">
            <MapContainer center={LAGOS} zoom={11} scrollWheelZoom touchZoom zoomControl={false} className="h-full w-full" style={{ background: '#e5e7eb' }}>
                <TileLayer url={FREE_TILE_URL} attribution={FREE_TILE_ATTRIBUTION} />
                {placed.map((v) => (
                    <Marker key={v.vehicle_id} position={[v.location!.latitude, v.location!.longitude]} icon={icon(v, v.vehicle_id === activeId)} eventHandlers={{ click: () => onSelect(v.vehicle_id) }} />
                ))}
                <FitOnce points={points} signature={signature} />
                <Focus id={activeId} position={active ? [active.location!.latitude, active.location!.longitude] : null} />
            </MapContainer>
            {missing > 0 && (
                <div className="absolute bottom-3 left-3 z-[500] rounded-lg bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
                    {missing} vehicle{missing === 1 ? ' has' : 's have'} no position and {missing === 1 ? 'is' : 'are'} not on the map
                </div>
            )}
        </div>
    )
}
