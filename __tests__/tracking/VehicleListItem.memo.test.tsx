import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const labelCalls = vi.hoisted(() => ({ n: 0 }))
vi.mock('@/hooks/useRelativeTime', () => ({
  useRelativeTime: () => {
    labelCalls.n += 1
    return 'Just now'
  },
}))

import { VehicleListItem } from '@/app/(portal)/tracking/components/VehicleListItem'

const vehicle = { id: '1', attributes: { registration_number: 'ABC-123-XD' } } as any
const loc = { status: 'parked', is_online: true, speed: 0 }

describe('VehicleListItem rendering', () => {
  beforeEach(() => {
    labelCalls.n = 0
  })

  it('does not re-render when the list rebuilds with the same vehicle, location, selection and alarm', () => {
    const { rerender } = render(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={() => undefined} />)
    expect(labelCalls.n).toBe(1)

    // The list renders again on every packet, with a fresh onSelect closure each time.
    rerender(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={() => undefined} />)
    rerender(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={() => undefined} />)

    expect(labelCalls.n).toBe(1)
  })

  it('re-renders when its own location, selection or alarm changes', () => {
    const { rerender } = render(<VehicleListItem vehicle={vehicle} loc={loc} isSelected={false} onSelect={() => undefined} />)
    rerender(<VehicleListItem vehicle={vehicle} loc={{ ...loc, speed: 40, status: 'in_transit' }} isSelected={false} onSelect={() => undefined} />)
    expect(labelCalls.n).toBe(2)
    rerender(<VehicleListItem vehicle={vehicle} loc={{ ...loc, speed: 40, status: 'in_transit' }} isSelected onSelect={() => undefined} />)
    expect(labelCalls.n).toBe(3)
  })
})
