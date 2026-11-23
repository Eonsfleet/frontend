'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Layers } from 'lucide-react'
import type { RouteHistorySegment } from '@/lib/api/tracking'
import type { LatLng } from '@/lib/map/types'
import { simplifyRoutePoints } from '@/lib/playback/route'
import { useMapProvider } from '../../hooks/useMapProvider'

export const SEGMENT_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#ea580c', '#16a34a', '#ca8a04', '#4f46e5']

const pin = (color: string, label: string) =>
  `<div style="width:24px;height:24px;border-radius:9999px;background:${color};color:#fff;font:900 11px Inter,sans-serif;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.3)">${label}</div>`
const PIN = { iconSize: [24, 24] as [number, number], iconAnchor: [12, 12] as [number, number] }

function pathOf(segment: RouteHistorySegment): LatLng[] {
  return segment.path.filter((p) => p.latitude != null && p.longitude != null).map((p) => ({ lat: p.latitude, lng: p.longitude }))
}

export function HistoryMap({
  segments,
  selectedId,
  onSelect,
  mapStyle,
  onToggleStyle,
}: {
  segments: RouteHistorySegment[]
  selectedId: string | null
  onSelect: (id: string) => void
  mapStyle: 'standard' | 'satellite'
  onToggleStyle: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { provider, isReady } = useMapProvider({
    containerRef,
    initialCenter: { lat: 6.5244, lng: 3.3792 },
    initialZoom: 11,
    styleKey: mapStyle,
    preferredProviderKind: 'leaflet',
    tileSource: 'google',
  })

  const paths = useMemo(() => segments.map((s) => ({ id: s.id, points: simplifyRoutePoints(pathOf(s)) })), [segments])
  const drawn = useRef<{ overlays: Set<string>; markers: Set<string> }>({ overlays: new Set(), markers: new Set() })

  useEffect(() => {
    if (provider && isReady) provider.setStyle(mapStyle)
  }, [provider, isReady, mapStyle])

  useEffect(() => {
    if (!provider || !isReady) return
    const prev = drawn.current
    prev.overlays.forEach((k) => provider.removeOverlay(k))
    prev.markers.forEach((k) => provider.removeMarker(k))
    const overlays = new Set<string>()
    const markers = new Set<string>()

    const fitTo: LatLng[] = []
    // Unselected journeys are drawn faint underneath; the selected one is drawn last and bold.
    const ordered = [...paths].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))
    ordered.forEach(({ id, points }) => {
      if (points.length < 2) return
      const idx = segments.findIndex((s) => s.id === id)
      const isSel = id === selectedId
      const hasSelection = !!selectedId
      const key = `history-${id}`
      provider.setPolyline(key, points, {
        color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
        weight: isSel ? 6 : 3,
        opacity: isSel ? 0.95 : hasSelection ? 0.3 : 0.75,
      })
      overlays.add(key)
      if (isSel || !hasSelection) fitTo.push(...points)
    })

    const sel = segments.find((s) => s.id === selectedId)
    if (sel) {
      const add = (id: string, lat: number, lng: number, html: string, onClick?: () => void) => {
        provider.addMarker(id, { lat, lng, html, ...PIN, zIndexOffset: 500, onClick })
        markers.add(id)
      }
      add('history-start', sel.start.latitude, sel.start.longitude, pin('#16a34a', 'A'))
      add('history-end', sel.end.latitude, sel.end.longitude, pin('#dc2626', 'B'))
      sel.stop_points.forEach((s, i) => add(`history-stop-${i}`, s.latitude, s.longitude, pin('#1677ff', String(i + 1))))
    }

    drawn.current = { overlays, markers }
    if (fitTo.length > 1) provider.fitBounds(fitTo, { paddingPx: 48 })
  }, [provider, isReady, paths, segments, selectedId])

  // Click-to-select by proximity isn't available on polylines across engines; selection happens from the list.
  void onSelect

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <button
        type="button"
        onClick={onToggleStyle}
        className="absolute right-3 top-3 z-[400] flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <Layers className="h-3.5 w-3.5" /> {mapStyle === 'standard' ? 'Satellite' : 'Map'}
      </button>
    </div>
  )
}
