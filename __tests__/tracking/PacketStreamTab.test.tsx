import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PacketStreamTab } from '@/app/(portal)/tracking/components/tabs/PacketStreamTab'
import { usePacketStreamStore } from '@/store/packetStreamStore'
import type { PacketStreamEntry } from '@/lib/packetStream'

function makeEntries(count: number, vehicleId: string): PacketStreamEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${vehicleId}-${i}`,
    vehicleId,
    type: 'Location' as const,
    receivedAt: 1000 - i,
    summary: `Location update ${i}`,
    raw: { speed: i },
  }))
}

describe('PacketStreamTab buffer cap indicator', () => {
  beforeEach(() => {
    usePacketStreamStore.setState({ buffers: {}, droppedWhilePaused: {}, isPaused: false, maxRows: 3 })
  })

  it('shows no cap note when the buffer is below maxRows', () => {
    usePacketStreamStore.setState({ buffers: { '1': makeEntries(2, '1') } })
    render(<PacketStreamTab vehicleId="1" />)
    expect(screen.queryByText(/Showing last/)).not.toBeInTheDocument()
  })

  it('shows a cap note once the buffer reaches maxRows', () => {
    usePacketStreamStore.setState({ buffers: { '1': makeEntries(3, '1') } })
    render(<PacketStreamTab vehicleId="1" />)
    expect(screen.getByText('Showing last 3 events — older events are no longer available.')).toBeInTheDocument()
  })
})
