import { describe, it, expect, beforeEach } from 'vitest'
import { usePacketStreamStore } from '@/store/packetStreamStore'
import type { PacketStreamEntry } from '@/lib/packetStream'

function entry(overrides: Partial<PacketStreamEntry>): PacketStreamEntry {
  return {
    id: overrides.id ?? 'default-id',
    vehicleId: '1',
    type: 'Location',
    receivedAt: 1000,
    summary: 'Location update',
    raw: { speed: 10 },
    ...overrides,
  }
}

describe('packetStreamStore dedup', () => {
  beforeEach(() => {
    usePacketStreamStore.setState({ buffers: {}, droppedWhilePaused: {}, isPaused: false, maxRows: 200 })
  })

  it('drops a duplicate payload delivered on a second channel within the dedup window', () => {
    const { push } = usePacketStreamStore.getState()
    push(entry({ id: 'a', receivedAt: 1000, raw: { speed: 10 } }))
    push(entry({ id: 'b', receivedAt: 1500, raw: { speed: 10 } }))
    expect(usePacketStreamStore.getState().buffers['1']).toHaveLength(1)
  })

  it('keeps a genuinely different payload arriving within the same window', () => {
    const { push } = usePacketStreamStore.getState()
    push(entry({ id: 'a', receivedAt: 1000, raw: { speed: 10 } }))
    push(entry({ id: 'b', receivedAt: 1500, raw: { speed: 20 } }))
    expect(usePacketStreamStore.getState().buffers['1']).toHaveLength(2)
  })

  it('keeps an identical payload if it arrives after the dedup window', () => {
    const { push } = usePacketStreamStore.getState()
    push(entry({ id: 'a', receivedAt: 1000, raw: { speed: 10 } }))
    push(entry({ id: 'b', receivedAt: 5000, raw: { speed: 10 } }))
    expect(usePacketStreamStore.getState().buffers['1']).toHaveLength(2)
  })

  it('still respects maxRows after dedup', () => {
    usePacketStreamStore.setState({ maxRows: 2 })
    const { push } = usePacketStreamStore.getState()
    push(entry({ id: 'a', receivedAt: 1000, raw: { speed: 1 } }))
    push(entry({ id: 'b', receivedAt: 5000, raw: { speed: 2 } }))
    push(entry({ id: 'c', receivedAt: 9000, raw: { speed: 3 } }))
    expect(usePacketStreamStore.getState().buffers['1']).toHaveLength(2)
  })
})
