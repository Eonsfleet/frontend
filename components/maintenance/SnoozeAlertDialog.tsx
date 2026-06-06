'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { snoozeMaintenanceAlert } from '@/lib/api/maintenance'
import { MaintenanceAlert } from '@/types'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { addDays, format } from 'date-fns'
import { Loader2 } from 'lucide-react'

const PRESET_DAYS = [1, 3, 7] as const

interface SnoozeAlertDialogProps {
    alert: MaintenanceAlert | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function SnoozeAlertDialog({ alert, open, onOpenChange }: SnoozeAlertDialogProps) {
    const queryClient = useQueryClient()
    const [selectedDays, setSelectedDays] = useState(3)
    const [customDays, setCustomDays] = useState('')
    const [isCustom, setIsCustom] = useState(false)
    const [reason, setReason] = useState('')
    const [reasonError, setReasonError] = useState('')

    useEffect(() => {
        if (!open) {
            setSelectedDays(3)
            setCustomDays('')
            setIsCustom(false)
            setReason('')
            setReasonError('')
        }
    }, [open])

    const days = isCustom ? parseInt(customDays || '0', 10) : selectedDays
    const expiryDate = days > 0 ? format(addDays(new Date(), days), "EEE, d MMM yyyy") : null

    const { mutate: snooze, isPending } = useMutation({
        mutationFn: () => snoozeMaintenanceAlert(alert!.id, { snooze_days: days, reason }),
        onSuccess: () => {
            toast.success('Alert snoozed')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
            onOpenChange(false)
        },
        onError: () => toast.error('Failed to snooze alert'),
    })

    const handleSubmit = () => {
        if (reason.trim().length < 5) {
            setReasonError('Reason must be at least 5 characters.')
            return
        }
        if (!days || days < 1) {
            toast.error('Please select a valid number of days.')
            return
        }
        setReasonError('')
        snooze()
    }

    if (!alert) return null

    const vehicleReg = alert.relationships?.vehicle?.registration_number ?? 'Unknown'
    const serviceType = alert.relationships?.schedule?.service_type
        ?? alert.attributes.threshold_type?.replace(/_/g, ' ')
        ?? 'Maintenance'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-900">
                        Snooze Alert
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <p className="text-xs font-bold text-slate-500">
                        {vehicleReg} · {serviceType}
                    </p>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            How many days?
                        </Label>
                        <div className="flex gap-2 flex-wrap">
                            {PRESET_DAYS.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => { setSelectedDays(d); setIsCustom(false) }}
                                    className={cn(
                                        "rounded-full px-4 py-1.5 text-xs font-bold border transition-all",
                                        !isCustom && selectedDays === d
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "border-slate-200 text-slate-600 hover:border-slate-400"
                                    )}
                                >
                                    {d} {d === 1 ? 'day' : 'days'}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setIsCustom(true)}
                                className={cn(
                                    "rounded-full px-4 py-1.5 text-xs font-bold border transition-all",
                                    isCustom
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "border-slate-200 text-slate-600 hover:border-slate-400"
                                )}
                            >
                                Custom
                            </button>
                        </div>
                        {isCustom && (
                            <Input
                                type="number"
                                min={1}
                                max={30}
                                placeholder="1–30 days"
                                value={customDays}
                                onChange={(e) => setCustomDays(e.target.value)}
                                className="h-9 text-sm mt-1"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Reason <span className="text-rose-500">*</span>
                        </Label>
                        <Textarea
                            placeholder="e.g. Waiting for parts"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="resize-none h-20 text-sm"
                        />
                        {reasonError && (
                            <p className="text-[10px] text-rose-500 font-bold">{reasonError}</p>
                        )}
                    </div>

                    {expiryDate && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Will re-trigger on {expiryDate}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-xs font-bold"
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="text-xs font-black uppercase tracking-widest bg-slate-900"
                    >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Snooze →'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
