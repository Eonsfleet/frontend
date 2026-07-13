'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PlaybackEvent, PlaybackMovement, PlaybackStats, PlaybackStop } from '@/types'
import { TimelineTab } from './tabs/TimelineTab'
import { EventsTab } from './tabs/EventsTab'
import { StopsTab } from './tabs/StopsTab'
import { SpeedTab } from './tabs/SpeedTab'
import { AltitudeTab } from './tabs/AltitudeTab'
import { FuelTab } from './tabs/FuelTab'
import { VehiclesTab } from './tabs/VehiclesTab'

export interface PlaybackBottomPanelProps {
  movements: PlaybackMovement[]
  events: PlaybackEvent[]
  stops: PlaybackStop[]
  stats: PlaybackStats
  vehicleLabel: string
  onJumpToIndex?: (index: number) => void
}

export function PlaybackBottomPanel({ movements, events, stops, stats, vehicleLabel, onJumpToIndex }: PlaybackBottomPanelProps) {
  return (
    <Tabs defaultValue="timeline" className="bg-white border-t border-slate-200">
      <TabsList className="h-11 w-full justify-start gap-4 rounded-none bg-transparent p-0 px-4 border-b border-slate-100">
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="stops">Stops</TabsTrigger>
        <TabsTrigger value="speed">Speed</TabsTrigger>
        <TabsTrigger value="altitude">Altitude</TabsTrigger>
        <TabsTrigger value="fuel">Fuel</TabsTrigger>
        <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
      </TabsList>
      <div className="p-4 max-h-64 overflow-y-auto">
        <TabsContent value="timeline" className="m-0">
          <TimelineTab movements={movements} events={events} onJumpToIndex={onJumpToIndex} />
        </TabsContent>
        <TabsContent value="events" className="m-0">
          <EventsTab events={events} onJumpToIndex={onJumpToIndex} />
        </TabsContent>
        <TabsContent value="stops" className="m-0">
          <StopsTab stops={stops} onJumpToIndex={onJumpToIndex} />
        </TabsContent>
        <TabsContent value="speed" className="m-0">
          <SpeedTab movements={movements} events={events} />
        </TabsContent>
        <TabsContent value="altitude" className="m-0">
          <AltitudeTab />
        </TabsContent>
        <TabsContent value="fuel" className="m-0">
          <FuelTab />
        </TabsContent>
        <TabsContent value="vehicles" className="m-0">
          <VehiclesTab vehicleLabel={vehicleLabel} stats={stats} />
        </TabsContent>
      </div>
    </Tabs>
  )
}

