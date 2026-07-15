'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createIncident } from '@/lib/api/incidents'
import { getVehicles } from '@/lib/api/vehicles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, Loader2, Search, Car, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete'
import { cn, extractApiError } from '@/lib/utils'

const INCIDENT_TYPES = [
    'accident', 'breakdown', 'theft', 'vandalism', 'traffic_violation',
    'near_miss', 'fuel_theft', 'unauthorized_use', 'other',
]

interface Witness {
    name: string
    phone: string
    statement: string
}

// Searchable vehicle combobox
function VehicleCombobox({
    vehicles,
    value,
    onChange,
}: {
    vehicles: any[]
    value: string
    onChange: (id: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const selected = vehicles.find((v: any) => String(v.id) === value)
    const filtered = vehicles.filter((v: any) => {
        const reg = (v.attributes?.registration_number ?? v.registration_number ?? '').toLowerCase()
        const make = (v.attributes?.make ?? '').toLowerCase()
        const model = (v.attributes?.model ?? '').toLowerCase()
        const q = search.toLowerCase()
        return reg.includes(q) || make.includes(q) || model.includes(q)
    })

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between h-10 px-3 bg-white border border-slate-200 rounded-md text-sm text-left hover:border-slate-300 transition-colors"
            >
                <span className={cn(selected ? 'text-slate-900' : 'text-slate-400')}>
                    {selected
                        ? (selected.attributes?.registration_number ?? `Vehicle #${selected.id}`)
                        : 'Select vehicle (optional)'}
                </span>
                {value ? (
                    <X
                        className="h-4 w-4 text-slate-400 hover:text-slate-600"
                        onClick={(e) => { e.stopPropagation(); onChange(''); setSearch('') }}
                    />
                ) : (
                    <Car className="h-4 w-4 text-slate-400" />
                )}
            </button>

            {open && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                autoFocus
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Search by plate, make or model..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">No vehicles found</p>
                        ) : (
                            filtered.map((v: any) => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => { onChange(String(v.id)); setOpen(false); setSearch('') }}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-left hover:bg-slate-50 transition-colors',
                                        String(v.id) === value && 'bg-blue-50 text-blue-700 font-medium'
                                    )}
                                >
                                    <Car className="h-4 w-4 shrink-0 text-slate-400" />
                                    <div>
                                        <p className="font-medium">{v.attributes?.registration_number ?? `Vehicle #${v.id}`}</p>
                                        {(v.attributes?.make || v.attributes?.model) && (
                                            <p className="text-xs text-slate-400">
                                                {[v.attributes?.make, v.attributes?.model].filter(Boolean).join(' ')}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
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
        onError: (err: unknown) => {
            toast.error(extractApiError(err, 'Failed to report incident'))
        },
    })

    const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

    // When a location is selected, parse Mapbox place_name and fill all location fields
    const handleLocationSelect = (location: { name: string; coords: { latitude: number; longitude: number } }) => {
        const parts = location.name.split(',').map((p: string) => p.trim())
        setForm(f => ({
            ...f,
            street: parts[0] ?? '',
            city: parts[1] ?? '',
            state: parts[2] ?? '',
            coords: `${location.coords.latitude},${location.coords.longitude}`,
        }))
    }

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
                            <Input type="time" value={form.time} onChange={e => { const v = e.target.value; set('time', v); if (/^\d{2}:\d{2}$/.test(v)) e.target.blur() }} className="bg-white" />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Vehicle Involved</label>
                            <VehicleCombobox
                                vehicles={vehicles}
                                value={form.vehicle_id}
                                onChange={v => set('vehicle_id', v)}
                            />
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
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Search Location</label>
                        <LocationAutocomplete
                            value={form.street}
                            onSelect={handleLocationSelect}
                            placeholder="Search address to auto-fill fields..."
                        />
                        <p className="text-xs text-slate-400">
                            Selecting a result auto-fills street, city, state and coordinates.
                        </p>
                    </div>

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
                        <Input
                            placeholder="Auto-filled from location search"
                            value={form.coords}
                            onChange={e => set('coords', e.target.value)}
                            className="bg-white font-mono text-sm"
                        />
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
