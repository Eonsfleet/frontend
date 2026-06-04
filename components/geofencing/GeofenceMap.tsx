'use client'
import dynamic from 'next/dynamic'
import { Geofence } from '@/types'

// Map components must be dynamically imported with SSR disabled
const DynamicMapEditor = dynamic(
    () => import('./GeofenceMapEditor'),
    { ssr: false, loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-md flex items-center justify-center"><p className="text-slate-500">Loading map editor...</p></div> }
)

interface Props {
    onChange: (data: { type: 'polygon' | 'circle', coordinates: any, radius?: number }) => void
    initialGeofence?: Geofence
    vehicles?: (import('@/types').Vehicle | any)[]
    center?: { lat: number; lng: number }
}

export function GeofenceMap(props: Props) {
    return <DynamicMapEditor {...props} />
}
