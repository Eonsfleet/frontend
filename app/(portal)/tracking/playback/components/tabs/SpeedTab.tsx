'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts'
import { format } from 'date-fns'
import type { PlaybackEvent, PlaybackMovement } from '@/types'

export function SpeedTab({ movements, events }: { movements: PlaybackMovement[]; events: PlaybackEvent[] }) {
  const data = movements.map((m) => ({ time: format(new Date(m.timestamp), 'hh:mm a'), speed: Math.round(m.speed) }))
  const overspeedIndexes = new Set(events.filter((e) => e.type === 'overspeed').map((e) => e.startIndex))

  if (data.length === 0) {
    return <p className="text-[10px] font-bold text-slate-400 p-4">No speed data for this window.</p>
  }

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 'bold' }} />
          <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} dot={false} />
          {[...overspeedIndexes].map((index) => (
            <ReferenceDot key={index} x={data[index]?.time} y={data[index]?.speed} r={5} fill="#f97316" stroke="white" />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
