'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWorkOrderFromAlert } from '@/lib/api/maintenance'
import { MaintenanceAlert } from '@/types'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const FAULT_CATEGORIES = [
    'Routine Maintenance',
    'Brake System',
    'Engine',
    'Tyres',
    'Electrical',
    'Transmission',
    'Fluid Services',
    'Other',
]

interface CreateWorkOrderDialogProps {
    alert: MaintenanceAlert | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateWorkOrderDialog({ alert, open, onOpenChange }: CreateWorkOrderDialogProps) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [title, setTitle] = useState('')
    const [notes, setNotes] = useState('')
    const [faultCategory, setFaultCategory] = useState('')

    useEffect(() => {
        if (open && alert) {
            const vehicleReg = alert.relationships?.vehicle?.registration_number ?? 'Unknown'
            const serviceType = alert.relationships?.schedule?.service_type
                ?? alert.attributes.threshold_type?.replace(/_/g, ' ')
                ?? ''
            setTitle(`${serviceType} – ${vehicleReg}`)
            setNotes('')
            setFaultCategory('')
        }
    }, [open, alert])

    const { mutate: createWorkOrder, isPending } = useMutation({
        mutationFn: () =>
            createWorkOrderFromAlert(alert!.id, {
                title,
                description: notes || title,
                fault_category: faultCategory,
            }),
        onSuccess: (res) => {
            toast.success('Work order created')
            queryClient.invalidateQueries({ queryKey: ['maintenance-alerts-full'] })
            onOpenChange(false)
            const jobId = res?.data?.id ?? (res?.data as any)?.attributes?.id
            if (jobId) router.push(`/maintenance/jobs/${jobId}`)
        },
        onError: () => toast.error('Failed to create work order'),
    })

    const handleSubmit = () => {
        if (!title.trim()) { toast.error('Title is required'); return }
        if (!faultCategory) { toast.error('Fault category is required'); return }
        createWorkOrder()
    }

    if (!alert) return null

    const vehicleReg = alert.relationships?.vehicle?.registration_number ?? 'Unknown'
    const vehicleMake = alert.relationships?.vehicle?.make ?? ''
    const vehicleModel = alert.relationships?.vehicle?.model ?? ''
    const serviceType = alert.relationships?.schedule?.service_type
        ?? alert.attributes.threshold_type?.replace(/_/g, ' ')
        ?? 'Maintenance'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm font-black uppercase tracking-widest text-slate-900">
                        Create Work Order
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Creating a job for
                        </p>
                        <p className="text-sm font-black text-slate-900 mt-0.5">
                            {vehicleMake} {vehicleReg} {vehicleModel}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                            Alert: {serviceType} · {alert.attributes.alert_type?.toUpperCase()}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Job title
                        </Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-sm h-9"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Fault category <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={faultCategory} onValueChange={setFaultCategory}>
                            <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {FAULT_CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Notes (optional)
                        </Label>
                        <Textarea
                            placeholder="Additional context..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none h-20 text-sm"
                        />
                    </div>
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
                        {isPending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : 'Create Work Order'
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
