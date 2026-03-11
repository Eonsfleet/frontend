'use client'

import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Maximize2 } from 'lucide-react'
import Link from 'next/link'

// Dynamically import the map component with SSR disabled
// This is critical because Leaflet requires the window object which is not available during SSR
const MapComponent = dynamic(
    () => import('./DashboardMapComponent'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-md">
                <span className="text-sm font-medium text-slate-500 text-muted-foreground">Initializing Map...</span>
            </div>
        )
    }
)

export function DashboardMap({ locations }: { locations: any[] }) {
    return (
        <Card className="col-span-1 lg:col-span-2 border-slate-200 shadow-sm flex flex-col h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-slate-900">Active Fleet Map</CardTitle>
                    <CardDescription>Real-time positions of your active trips.</CardDescription>
                </div>
                <Link
                    href="/tracking"
                    className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-slate-900 shrink-0"
                    title="Open Full Map"
                >
                    <Maximize2 className="h-4 w-4" />
                </Link>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
                <div className="w-full h-full overflow-hidden">
                    <MapComponent locations={locations} />
                </div>
            </CardContent>
        </Card>
    )
}
