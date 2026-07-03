import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeviceTab } from '@/app/(portal)/tracking/components/tabs/DeviceTab'
import type { ResolvedVehicleTelemetry } from '@/lib/resolveVehicleTelemetry'

const baseResolved = {
  rssi: null, satellites: null, engineTemp: null, isDeviceOnline: true,
} as unknown as ResolvedVehicleTelemetry

describe('DeviceTab', () => {
  it('renders IMEI, firmware, SIM number, signal quality, temperature and health', () => {
    render(
      <DeviceTab
        device={{ imei: '123456789012345' } as any}
        resolved={{ ...baseResolved, rssi: -70, engineTemp: 82 }}
        deviceStatusData={{ data: { firmware_version: '2.1.0', sim_number: '89234...', model: 'VT310', network: '4G' } }}
      />,
    )
    expect(screen.getByText('123456789012345')).toBeInTheDocument()
    expect(screen.getByText('2.1.0')).toBeInTheDocument()
    expect(screen.getByText('89234...')).toBeInTheDocument()
    expect(screen.getByText('-70 dBm')).toBeInTheDocument()
    expect(screen.getByText('82°C')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('does not render device model, network, voltage, satellite count or last heartbeat (owned by the Device Status card)', () => {
    render(<DeviceTab device={{ imei: '1' } as any} resolved={baseResolved} deviceStatusData={{ data: { model: 'VT310', network: '4G' } }} />)
    expect(screen.queryByText('Device Model')).not.toBeInTheDocument()
    expect(screen.queryByText('Network')).not.toBeInTheDocument()
    expect(screen.queryByText('Voltage')).not.toBeInTheDocument()
    expect(screen.queryByText('Satellite Count')).not.toBeInTheDocument()
    expect(screen.queryByText('Last Heartbeat')).not.toBeInTheDocument()
  })
})
