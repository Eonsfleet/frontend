'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Maximize2, Minimize2, Layers, Navigation as NavigationIcon } from 'lucide-react'
import type { PlaybackMovement, PlaybackSpeedSegment, PlaybackStop } from '@/types'

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const STANDARD_TILE_URL = MAPBOX_ACCESS_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const SATELLITE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const SPEED_LEGEND: { bucket: string; color: string }[] = [
  { bucket: '0 - 20', color: '#22c55e' },
  { bucket: '20 - 40', color: '#84cc16' },
  { bucket: '40 - 60', color: '#eab308' },
  { bucket: '60 - 80', color: '#f97316' },
  { bucket: '80+', color: '#ef4444' },
]

function positionMarkerIcon(heading: number) {
  return L.divIcon({
    className: 'custom-marker-wrapper',
    html: `<div class="marker-container is-active"><div class="marker-pulse"></div><div class="marker-base" style="transform: rotate(${heading}deg); background: #2563eb; border-color: #fff;"><div class="marker-icon-wrapper"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-white"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div></div></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

function endpointMarkerIcon(color: string) {
  return L.divIcon({
    className: 'playback-endpoint-marker',
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function stopMarkerIcon(index: number) {
  return L.divIcon({
    className: 'playback-stop-marker',
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:#2563eb;color:white;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid white;">${index + 1}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function MapController({ movements, currentIndex }: { movements: PlaybackMovement[]; currentIndex: number }) {
  const map = useMap()
  useEffect(() => {
    if (movements.length > 0 && currentIndex === 0) {
      map.fitBounds(movements.map((m) => [m.lat, m.lng] as [number, number]), { padding: [50, 50] })
    }
  }, [movements.length])

  useEffect(() => {
    const point = movements[currentIndex]
    if (point) map.flyTo([point.lat, point.lng], 16)
  }, [currentIndex, map])

  return null
}

export interface PlaybackMapProps {
  movements: PlaybackMovement[]
  speedSegments: PlaybackSpeedSegment[]
  stops: PlaybackStop[]
  currentIndex: number
  mapStyle: 'standard' | 'satellite'
  onToggleMapStyle: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export function PlaybackMap({
  movements,
  speedSegments,
  stops,
  currentIndex,
  mapStyle,
  onToggleMapStyle,
  isFullscreen,
  onToggleFullscreen,
}: PlaybackMapProps) {
  const currentMovement = movements[currentIndex]
  const tileUrl = mapStyle === 'satellite' ? SATELLITE_TILE_URL : STANDARD_TILE_URL

  return (
    <div className="relative flex-1 h-full">
      <MapContainer center={[6.5244, 3.3792]} zoom={12} className="h-full w-full z-10" zoomControl={false}>
        <TileLayer url={tileUrl} attribution="&copy; Mapbox" />
        <MapController movements={movements} currentIndex={currentIndex} />

        {speedSegments.map((segment, i) => (
          <Polyline key={i} positions={segment.positions} color={segment.color} weight={4} opacity={0.85} />
        ))}

        {movements[0] && <Marker position={[movements[0].lat, movements[0].lng]} icon={endpointMarkerIcon('#22c55e')} />}
        {movements.length > 1 && (
          <Marker
            position={[movements[movements.length - 1].lat, movements[movements.length - 1].lng]}
            icon={endpointMarkerIcon('#ef4444')}
          />
        )}

        {stops.map((stop, i) => (
          <Marker key={i} position={[stop.lat, stop.lng]} icon={stopMarkerIcon(i)} />
        ))}

        {currentMovement && (
          <Marker position={[currentMovement.lat, currentMovement.lng]} icon={positionMarkerIcon(currentMovement.heading)} />
        )}
      </MapContainer>

      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg border border-slate-200 p-3 z-20">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Speed (km/h)</p>
        <div className="space-y-1">
          {SPEED_LEGEND.map((entry) => (
            <div key={entry.bucket} className="flex items-center gap-2">
              <span data-testid="speed-legend-swatch" className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
              <span className="text-[10px] font-bold text-slate-600">{entry.bucket}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
        <button
          type="button"
          disabled
          title="Traffic layer isn't available yet"
          aria-label="Traffic"
          className="h-10 w-10 rounded-xl bg-white/60 shadow-lg flex items-center justify-center text-slate-300 cursor-not-allowed"
        >
          <NavigationIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleMapStyle}
          aria-label={mapStyle === 'standard' ? 'Satellite' : 'Map'}
          className="h-10 w-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-blue-600"
        >
          <Layers className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="h-10 w-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:text-blue-600"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
