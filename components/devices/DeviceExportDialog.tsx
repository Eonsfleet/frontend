'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Loader2 } from 'lucide-react'
import { exportDevices, deviceExportExtension, type DeviceExportFormat } from '@/lib/api/tracking'
import { toast } from 'sonner'
import { extractApiError } from '@/lib/utils'
import { format as formatDate } from 'date-fns'

type DeviceExportStatus = 'all' | 'online' | 'offline'

interface DeviceExportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const FORMAT_LABELS: Record<DeviceExportFormat, string> = {
    excel: 'Excel (.xlsx)',
    csv: 'CSV (.csv)',
}

export function DeviceExportDialog({ open, onOpenChange }: DeviceExportDialogProps) {
    const [status, setStatus] = useState<DeviceExportStatus>('all')
    const [exportFormat, setExportFormat] = useState<DeviceExportFormat>('excel')
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const blob = await exportDevices({
                status: status !== 'all' ? status : undefined,
                format: exportFormat,
            })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `devices-${status}-${formatDate(new Date(), 'yyyy-MM-dd')}.${deviceExportExtension(exportFormat)}`
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(url)
            toast.success('Devices exported successfully.')
            onOpenChange(false)
        } catch (err) {
            toast.error(extractApiError(err, 'Export failed. Please try again.'))
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] rounded-3xl border-slate-200 shadow-2xl">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base font-black uppercase italic tracking-wide text-slate-900">
                        Export Devices
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-slate-400 uppercase tracking-widest">
                        Choose status and format
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as DeviceExportStatus)}>
                                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All devices</SelectItem>
                                    <SelectItem value="online">Online</SelectItem>
                                    <SelectItem value="offline">Offline</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Format</Label>
                            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as DeviceExportFormat)}>
                                <SelectTrigger className="rounded-xl border-slate-200 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="excel">{FORMAT_LABELS.excel}</SelectItem>
                                    <SelectItem value="csv">{FORMAT_LABELS.csv}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            {isExporting ? 'Exporting...' : 'Export Devices'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
