'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createIncident } from '@/lib/api/incidents'
import { getVehicles } from '@/lib/api/vehicles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const INCIDENT_TYPES = [
    'accident', 'breakdown', 'theft', 'vandalism', 'traffic_violation',
    'near_miss', 'fuel_theft', 'unauthorized_use', 'other',
]

interface Witness {
    name: string
    phone: string
    statement: string
}

export default function NewIncidentPage() {
    const router = useRouter()

    const [form, setForm] = useState({
        vehicle_id: '',
        type: '',
        date: '',
        time: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        description: '',
        victim_name: '',
        street: '',
        city: '',
        state: '',
        coords: '',
    })
    const [witnesses, setWitnesses] = useState<Witness[]>([])

    const { data: vehiclesData } = useQuery({
        queryKey: ['vehicles-list'],
        queryFn: () => getVehicles({ per_page: 100 }),
    })

    const { mutate: submit, isPending } = useMutation({
        mutationFn: () => createIncident({
            vehicle_id: form.vehicle_id || undefined,
            type: form.type,
            date: form.date,
            time: form.time,
            priority: form.priority,
            description: form.description,
            victim_name: form.victim_name || undefined,
            street: form.street || undefined,
            city: form.city || undefined,
            state: form.state || undefined,
            coords: form.coords || undefined,
            witness: witnesses.filter(w => w.name.trim()).map(w => ({
                name: w.name,
                phone: w.phone,
                statement: w.statement || undefined,
            })),
        }),
        onSuccess: (data) => {
            toast.success('Incident reported successfully')
            router.push(`/incidents/${data.data.id}`)
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message ?? 'Failed to report incident')
        },
    })

    const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

    const addWitness = () => setWitnesses(w => [...w, { name: '', phone: '', statement: '' }])
    const removeWitness = (i: number) => setWitnesses(w => w.filter((_, idx) => idx !== i))
    const setWitness = (i: number, key: keyof Witness, value: string) =>
        setWitnesses(w => w.map((x, idx) => idx === i ? { ...x, [key]: value } : x))

    const canSubmit = form.type && form.date && form.time && form.description && form.priority

    const vehicles = vehiclesData?.data ?? []

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6 bg-slate-50 min-h-full">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/incidents"><ArrowLeft className="h-5 w-5 text-slate-500" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Report Incident</h1>
                    <p className="text-slate-500 text-sm mt-0.5">File a new incident report for review.</p>
                </div>
            </div>

            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm">Incident Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Incident Type <span className="text-rose-500">*</span></label>
                            <Select value={form.type} onValueChange={v => set('type', v)}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    {INCIDENT_TYPES.map(t => (
                                        <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Priority <span className="text-rose-500">*</span></label>
                            <Select value={form.priority} onValueChange={v => set('priority', v)}>
                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['low', 'medium', 'high', 'critical'].map(p => (
                                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Date <span className="text-rose-500">*</span></label>
                            <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="bg-white" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Time <span className="text-rose-500">*</span></label>
                            <Input type="time" value={form.time} onChange={e => set('time', e.target.value)} className="bg-white" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Vehicle Involved</label>
                            <Select value={form.vehicle_id} onValueChange={v => set('vehicle_id', v)}>
                                <SelectTrigger className="bg-white"><SelectValue placeholder="Select vehicle (optional)" /></SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((v: any) => (
                                        <SelectItem key={v.id} value={String(v.id)}>
                                            {v.attributes?.registration_number ?? v.registration_number ?? `Vehicle #${v.id}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Victim Name</label>
                            <Input placeholder="If applicable" value={form.victim_name} onChange={e => set('victim_name', e.target.value)} className="bg-white" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Description <span className="text-rose-500">*</span></label>
                        <Textarea
                            placeholder="Describe what happened in detail..."
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            className="bg-white min-h-[120px]"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-sm">Location</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Street</label>
                            <Input placeholder="Street address" value={form.street} onChange={e => set('street', e.target.value)} className="bg-white" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">City</label>
                            <Input placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} className="bg-white" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">State</label>
                            <Input placeholder="State" value={form.state} onChange={e => set('state', e.target.value)} className="bg-white" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Coordinates</label>
                        <Input placeholder="lat,lng e.g. 6.5244,3.3792" value={form.coords} onChange={e => set('coords', e.target.value)} className="bg-white font-mono text-sm" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Witnesses</CardTitle>
                    <Button size="sm" variant="outline" onClick={addWitness}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Witness
                    </Button>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    {witnesses.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-2">No witnesses added.</p>
                    )}
                    {witnesses.map((w, i) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Name</label>
                                <Input value={w.name} onChange={e => setWitness(i, 'name', e.target.value)} className="bg-white h-8 text-sm" placeholder="Full name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-600">Phone</label>
                                <Input value={w.phone} onChange={e => setWitness(i, 'phone', e.target.value)} className="bg-white h-8 text-sm" placeholder="Phone number" />
                            </div>
                            <div className="space-y-1.5 relative">
                                <label className="text-xs font-medium text-slate-600">Statement</label>
                                <div className="flex gap-2">
                                    <Input value={w.statement} onChange={e => setWitness(i, 'statement', e.target.value)} className="bg-white h-8 text-sm" placeholder="Brief statement" />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-slate-400 hover:text-rose-500" onClick={() => removeWitness(i)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pb-8">
                <Button variant="outline" asChild><Link href="/incidents">Cancel</Link></Button>
                <Button
                    className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
                    disabled={!canSubmit || isPending}
                    onClick={() => submit()}
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit Report
                </Button>
            </div>
        </div>
    )
}
