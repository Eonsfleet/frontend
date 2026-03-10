'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon, Car, Wrench, Clock, CheckSquare, Bell, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createSchedule, getAllOrgChecklists } from '@/lib/api/maintenance'
import { getVehicles } from '@/lib/api/vehicles'
import { getVendors } from '@/lib/api/vendors'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreateMaintenanceScheduleModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const SERVICE_TYPES = [
    { value: 'oil_change', label: 'Oil Change' },
    { value: 'tyre_rotation', label: 'Tyre Rotation' },
    { value: 'brake_service', label: 'Brake Service' },
    { value: 'battery_check', label: 'Battery Check' },
    { value: 'engine_check', label: 'Engine Check' },
    { value: 'full_inspection', label: 'Full Inspection' },
    { value: 'transmission_service', label: 'Transmission Service' },
]

export function CreateMaintenanceScheduleModal({ open, onOpenChange }: CreateMaintenanceScheduleModalProps) {
    const queryClient = useQueryClient()
    const [step, setStep] = React.useState(1)

    // Form State
    const [formData, setFormData] = React.useState({
        vehicle_id: '',
        service_type: '',
        schedule_type: 'time' as 'time' | 'mileage',
        interval_value: '',
        interval_unit: 'months' as 'days' | 'weeks' | 'months',
        schedule_date: undefined as Date | undefined,
        is_recurring: false,
        priority: 'normal',
        description: '',
        vendor_id: '',
        turn_on_notification: true,
        checklists: [] as number[],
        note: ''
    })

    // Queries
    const { data: vehicleData } = useQuery({
        queryKey: ['vehicles-lite'],
        queryFn: () => getVehicles({ per_page: 100 }),
        enabled: open
    })

    const { data: vendorData } = useQuery({
        queryKey: ['vendors-lite'],
        queryFn: () => getVendors(),
        enabled: open
    })

    const { data: checklistData } = useQuery({
        queryKey: ['checklists-all'],
        queryFn: () => getAllOrgChecklists(),
        enabled: open
    })

    // Mutation
    const { mutate: handleCreate, isPending } = useMutation({
        mutationFn: (data: any) => createSchedule(data),
        onSuccess: () => {
            toast.success('Maintenance schedule created successfully')
            queryClient.invalidateQueries({ queryKey: ['maintenance-schedules'] })
            onOpenChange(false)
            resetForm()
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to create schedule')
        }
    })

    const resetForm = () => {
        setStep(1)
        setFormData({
            vehicle_id: '',
            service_type: '',
            schedule_type: 'time',
            interval_value: '',
            interval_unit: 'months',
            schedule_date: undefined,
            is_recurring: false,
            priority: 'normal',
            description: '',
            vendor_id: '',
            turn_on_notification: true,
            checklists: [],
            note: ''
        })
    }

    const onSubmit = () => {
        handleCreate({
            ...formData,
            interval_value: formData.interval_value ? parseInt(formData.interval_value) : undefined,
            schedule_date: formData.schedule_date ? format(formData.schedule_date, 'yyyy-MM-dd') : undefined
        })
    }

    const nextStep = () => setStep(s => Math.min(s + 1, 4))
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    const renderStepIndicators = () => (
        <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
                <div
                    key={s}
                    className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        step === s ? "w-8 bg-slate-900" : s < step ? "w-4 bg-emerald-500" : "w-4 bg-slate-200"
                    )}
                />
            ))}
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                <DialogHeader className="p-8 bg-slate-900 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                            <Wrench className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight italic">Plan Asset Cycle</DialogTitle>
                            <DialogDescription className="text-white/50 text-xs font-bold uppercase tracking-widest">
                                {step === 1 && "Vehicle & Service Type"}
                                {step === 2 && "Scheduling Parameters"}
                                {step === 3 && "Venders & Checklists"}
                                {step === 4 && "Review & Notifications"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 bg-white">
                    {renderStepIndicators()}

                    {/* Step 1: Vehicle & Service */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Vehicle</Label>
                                <Select
                                    value={formData.vehicle_id}
                                    onValueChange={(v) => setFormData({ ...formData, vehicle_id: v })}
                                >
                                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-slate-900 font-bold uppercase text-xs tracking-tight">
                                        <SelectValue placeholder="Select an Asset" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100">
                                        {vehicleData?.data?.vehicles?.map((v: any) => (
                                            <SelectItem key={v.id} value={v.id.toString()} className="font-bold uppercase text-[10px] tracking-tight py-3">
                                                {v.registration_number} — {v.make} {v.model}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Category</Label>
                                <Select
                                    value={formData.service_type}
                                    onValueChange={(v) => setFormData({ ...formData, service_type: v })}
                                >
                                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-slate-900 font-bold uppercase text-xs tracking-tight">
                                        <SelectValue placeholder="What kind of service?" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100">
                                        {SERVICE_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value} className="font-bold uppercase text-[10px] tracking-tight py-3">
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brief Description</Label>
                                <Textarea
                                    className="rounded-xl border-slate-100 bg-slate-50/50 min-h-[100px] font-medium text-sm focus:ring-slate-900"
                                    placeholder="Enter any specific details about this service cycle..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Schedule Params */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                                <div className="flex gap-2">
                                    <button
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            formData.schedule_type === 'time' ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-400 border border-slate-100"
                                        )}
                                        onClick={() => setFormData({ ...formData, schedule_type: 'time' })}
                                    >
                                        Time Based
                                    </button>
                                    <button
                                        className={cn(
                                            "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            formData.schedule_type === 'mileage' ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-400 border border-slate-100"
                                        )}
                                        onClick={() => setFormData({ ...formData, schedule_type: 'mileage' })}
                                    >
                                        Mileage Based
                                    </button>
                                </div>
                            </div>

                            {formData.schedule_type === 'time' ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Every</Label>
                                            <Input
                                                type="number"
                                                className="h-12 rounded-xl border-slate-100 bg-slate-50"
                                                placeholder="e.g. 3"
                                                value={formData.interval_value}
                                                onChange={(e) => setFormData({ ...formData, interval_value: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</Label>
                                            <Select
                                                value={formData.interval_unit}
                                                onValueChange={(v: any) => setFormData({ ...formData, interval_unit: v })}
                                            >
                                                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold uppercase text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-100">
                                                    <SelectItem value="days" className="font-bold uppercase text-[10px]">Days</SelectItem>
                                                    <SelectItem value="weeks" className="font-bold uppercase text-[10px]">Weeks</SelectItem>
                                                    <SelectItem value="months" className="font-bold uppercase text-[10px]">Months</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-12 justify-start text-left font-bold uppercase text-xs tracking-tight rounded-xl border-slate-100 bg-slate-50",
                                                        !formData.schedule_date && "text-slate-400"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {formData.schedule_date ? format(formData.schedule_date, "PPP") : "Pick a start date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={formData.schedule_date}
                                                    onSelect={(d) => setFormData({ ...formData, schedule_date: d })}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Interval (KM)</Label>
                                        <Input
                                            type="number"
                                            className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold uppercase text-xs"
                                            placeholder="e.g. 5000"
                                            value={formData.interval_value}
                                            onChange={(e) => setFormData({ ...formData, interval_value: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-black uppercase tracking-tight text-slate-900 italic">Recurring Cycle</Label>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Auto-schedule next occurrence</p>
                                </div>
                                <Switch
                                    checked={formData.is_recurring}
                                    onCheckedChange={(c) => setFormData({ ...formData, is_recurring: c })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Vendors & Checklists */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Provider</Label>
                                <Select
                                    value={formData.vendor_id}
                                    onValueChange={(v) => setFormData({ ...formData, vendor_id: v })}
                                >
                                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold uppercase text-xs tracking-tight">
                                        <SelectValue placeholder="Select Preferred Vendor" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-100">
                                        {vendorData?.data?.vendors?.map((v: any) => (
                                            <SelectItem key={v.id} value={v.id.toString()} className="font-bold uppercase text-[10px] tracking-tight py-3">
                                                {v.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standard Checklists</Label>
                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto p-1 pr-2 custom-scrollbar">
                                    {checklistData?.data?.checklists?.map((c: any) => (
                                        <div key={c.id} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-50 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                                            <Checkbox
                                                id={`check-${c.id}`}
                                                checked={formData.checklists.includes(c.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setFormData({ ...formData, checklists: [...formData.checklists, c.id] })
                                                    } else {
                                                        setFormData({ ...formData, checklists: formData.checklists.filter(id => id !== c.id) })
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`check-${c.id}`} className="text-xs font-bold text-slate-700 cursor-pointer flex-1">{c.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Finalize */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-6 bg-slate-900 rounded-2xl text-white space-y-4">
                                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Schedule Summary</p>
                                        <h3 className="text-lg font-black italic uppercase tracking-tight leading-none">
                                            {SERVICE_TYPES.find(t => t.value === formData.service_type)?.label || 'Maintenance'}
                                        </h3>
                                    </div>
                                    <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-black uppercase text-[9px]">
                                        {formData.schedule_type}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Asset ID</p>
                                        <p className="text-xs font-bold italic">{vehicleData?.data?.vehicles?.find((v: any) => v.id.toString() === formData.vehicle_id)?.registration_number || 'None'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Interval</p>
                                        <p className="text-xs font-bold italic">
                                            {formData.interval_value} {formData.schedule_type === 'time' ? formData.interval_unit : 'KM'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-black uppercase tracking-tight text-slate-900 italic">Push Notifications</Label>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Notify when cycle approaches</p>
                                </div>
                                <Switch
                                    checked={formData.turn_on_notification}
                                    onCheckedChange={(c) => setFormData({ ...formData, turn_on_notification: c })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Internal Audit Note</Label>
                                <Input
                                    className="h-12 rounded-xl border-slate-100 bg-slate-50 font-medium text-sm"
                                    placeholder="Optional note for maintenance logs..."
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-8 bg-slate-50/80 border-t border-slate-100 sm:justify-between flex-row gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={step === 1 ? () => onOpenChange(false) : prevStep}
                        className="font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900"
                    >
                        {step === 1 ? "Cancel" : <><ChevronLeft className="mr-2 h-4 w-4" /> Back</>}
                    </Button>

                    <Button
                        type="button"
                        onClick={step === 4 ? onSubmit : nextStep}
                        disabled={isPending || (step === 1 && (!formData.vehicle_id || !formData.service_type))}
                        className={cn(
                            "px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all",
                            step === 4 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
                        )}
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            step === 4 ? "Authorize Plan" : <>{step === 1 ? "Configure Logic" : "Continue"} <ChevronRight className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
