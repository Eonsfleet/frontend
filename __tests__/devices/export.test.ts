/**
 * Device export unit tests
 *
 * Regression guard: `/devices/export` defaults to `format=json` server-side, so
 * omitting the param streams a JSON envelope that gets saved as a spreadsheet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/lib/api/client'

vi.mock('@/lib/api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}))

import { exportDevices, deviceExportExtension } from '@/lib/api/tracking'

const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const xlsxBlob = () => new Blob(['PK'], { type: XLSX_MIME })

beforeEach(() => {
    vi.clearAllMocks()
})

describe('exportDevices', () => {
    it('requests excel by default so the backend does not fall back to JSON', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: xlsxBlob() })

        await exportDevices({ status: 'offline' })

        expect(apiClient.get).toHaveBeenCalledWith('/devices/export', {
            params: { status: 'offline', format: 'excel' },
            responseType: 'blob',
        })
    })

    it('passes the status filter through and still pins the format', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: xlsxBlob() })

        await exportDevices()

        expect(apiClient.get).toHaveBeenCalledWith('/devices/export', {
            params: { format: 'excel' },
            responseType: 'blob',
        })
    })

    it('honours an explicit csv format', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({
            data: new Blob(['ID,IMEI\n'], { type: 'text/csv' }),
        })

        await exportDevices({ status: 'online', format: 'csv' })

        expect(apiClient.get).toHaveBeenCalledWith('/devices/export', {
            params: { status: 'online', format: 'csv' },
            responseType: 'blob',
        })
    })

    it('rejects when the API answers with a JSON payload instead of a file', async () => {
        const payload = JSON.stringify({
            data: [{ id: 1, imei: '358657106249795' }],
            total: 1,
        })
        vi.mocked(apiClient.get).mockResolvedValue({
            data: new Blob([payload], { type: 'application/json' }),
        })

        await expect(exportDevices({ status: 'offline' })).rejects.toThrow(
            /did not return a spreadsheet/i,
        )
    })

    it('maps the format to the matching file extension', () => {
        expect(deviceExportExtension('excel')).toBe('xlsx')
        expect(deviceExportExtension('csv')).toBe('csv')
    })
})
