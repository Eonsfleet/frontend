import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeviceTab } from '@/app/(portal)/tracking/components/tabs/DeviceTab'
import type { ResolvedVehicleTelemetry } from '@/lib/resolveVehicleTelemetry'

const baseResolved = {
  rssi: null, satellites: null, engineTemp: null, isDeviceOnline: true,
} as unknown as ResolvedVehicleTelemetry

describe('DeviceTab', () => {
  it('renders IMEI, SIM number (phone), signal quality, temperature and health', () => {
    render(
      <DeviceTab
        device={{ imei: '123456789012345' } as any}
        resolved={{ ...baseResolved, rssi: -70, engineTemp: 82 }}
        deviceInfoData={{ data: { attributes: { phone_number: '2348012345678' } } }}
      />,
    )
    expect(screen.getByText('123456789012345')).toBeInTheDocument()
    expect(screen.getByText('2348012345678')).toBeInTheDocument()
    expect(screen.getByText('-70 dBm')).toBeInTheDocument()
    expect(screen.getByText('82°C')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('shows an em dash for Firmware — no firmware field exists in the backend yet', () => {
    render(<DeviceTab device={{ imei: '1' } as any} resolved={baseResolved} deviceInfoData={null} />)
    expect(screen.getByText('Firmware')).toBeInTheDocument()
    expect(screen.getByText('Firmware').nextElementSibling?.textContent).toBe('—')
  })

  it('does not render network, voltage, satellite count or last heartbeat (owned by the Device Status card)', () => {
    render(<DeviceTab device={{ imei: '1' } as any} resolved={baseResolved} deviceInfoData={null} />)
    expect(screen.queryByText('Network')).not.toBeInTheDocument()
    expect(screen.queryByText('Voltage')).not.toBeInTheDocument()
    expect(screen.queryByText('Satellite Count')).not.toBeInTheDocument()
    expect(screen.queryByText('Last Heartbeat')).not.toBeInTheDocument()
  })
})
