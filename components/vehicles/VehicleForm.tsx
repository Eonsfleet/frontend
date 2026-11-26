'use client'

import React from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
    estimationDefaults,
    estimationPayload,
    MAX_CONSUMPTION_L_PER_100KM,
    MAX_IDLE_L_PER_HOUR,
    rateError,
    type EstimationPayload,
} from '@/lib/fuel-estimation'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Vehicle } from '@/types'
import { Loader2, LayoutGrid, Cpu, Gauge, Thermometer, Droplet, ClipboardList } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OdometerReadingFields } from '@/components/odometer/OdometerReadingFields'
import { OdometerValue } from '@/components/odometer/OdometerBadge'
import { buildReading, emptyDraft, type DraftErrors, type PendingReading, type ReadingDraft } from '@/lib/odometerDraft'
import type { DistanceUnit } from '@/types/odometer'

/** A rate typed as text: blank is allowed, anything else must be above 0 and within the limit. */
const optionalRate = (max: number, label: string) =>
    z.string().optional().superRefine((value, ctx) => {
        const message = rateError(value, max, label)
        if (message) ctx.addIssue({ code: 'custom', message })
    })

const vehicleSchema = z.object({
    registration_number: z.string().min(1, 'Registration number is required').regex(/^\S+$/, 'No spaces allowed in registration number'),
    make: z.string().min(1, 'Make is required'),
    model: z.string().min(1, 'Model is required'),
    year: z.string().min(4, 'Enter a valid year'),
    chasis_number: z.string().optional(),
    display_number: z.string().optional(),
    color: z.string().optional(),
    fuel_type: z.string().optional(),
    body_type: z.string().optional(),
    type: z.string().optional(),
    status: z.enum(['active', 'inactive', 'in_transit', 'maintenance']),
    device_id: z.string().optional(),
    gvm: z.coerce.number().optional(),
    fuel_capacity: z.coerce.number().optional(),
    fuel_capacity_unit: z.string().optional(),
    fuel_sensor_conversion_factor: z.coerce.number().optional(),
    fuel_estimation_enabled: z.boolean(),
    estimated_liters_per_100km: optionalRate(MAX_CONSUMPTION_L_PER_100KM, 'Consumption'),
    estimated_idle_liters_per_hour: optionalRate(MAX_IDLE_L_PER_HOUR, 'Idle burn'),
    tire_psi: z.object({
        front_left: z.coerce.number().optional(),
        front_right: z.coerce.number().optional(),
        rear_left: z.coerce.number().optional(),
        rear_right: z.coerce.number().optional(),
    }).optional(),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

/** What the form hands on: the rates as numbers, and null where they were left blank. */
export type VehicleSubmission = Omit<VehicleFormValues, keyof EstimationPayload> & EstimationPayload & {
    /**
     * A dashboard reading, present only when the user typed one. It is never part of the vehicle
     * create/update body (the server ignores odometer_when_join); the caller posts it to
     * /vehicles/{id}/odometer-readings after the vehicle is saved.
     */
    odometer_reading?: PendingReading | null
}

interface VehicleFormProps {
    initialData?: Vehicle
    onSubmit: (data: VehicleSubmission) => void
    isLoading?: boolean
    onCancel?: () => void
    /** The organisation's distance unit, the default for the reading's unit selector. */
    defaultDistanceUnit?: DistanceUnit
}

export function VehicleForm({ initialData, onSubmit, isLoading, onCancel, defaultDistanceUnit }: VehicleFormProps) {
    const currentOdometer = initialData?.attributes.odometer ?? null
    const [readingDraft, setReadingDraft] = React.useState<ReadingDraft>(() =>
        emptyDraft(defaultDistanceUnit ?? currentOdometer?.unit ?? 'km'),
    )
    const [readingErrors, setReadingErrors] = React.useState<DraftErrors>({})

    // A reading is sent only when the user entered one. An ordinary edit never submits an odometer value.
    const submit = (values: VehicleFormValues) => {
        const built = buildReading(readingDraft, currentOdometer?.lifetime_km ?? null)
        if (!built.ok) {
            setReadingErrors(built.errors)
            return
        }
        setReadingErrors({})
        onSubmit({ ...values, ...estimationPayload(values), odometer_reading: built.reading })
    }

    const form = useForm<VehicleFormValues>({
        resolver: zodResolver(vehicleSchema) as any,
        defaultValues: initialData ? {
            registration_number: initialData.attributes.registration_number,
            make: initialData.attributes.make,
            model: initialData.attributes.model,
            year: initialData.attributes.year.toString(),
            chasis_number: initialData.attributes.chasis_number || '',
            display_number: initialData.attributes.display_number || '',
            color: initialData.attributes.color || '',
            fuel_type: initialData.attributes.fuel_type || '',
            body_type: initialData.attributes.body_type || '',
            type: (initialData.attributes.type && ['car', 'van', 'truck', 'bus', 'motorcycle', 'tricycle'].includes(initialData.attributes.type.toLowerCase()))
                ? initialData.attributes.type.toLowerCase()
                : 'car',
            status: initialData.attributes.status,
            device_id: initialData.attributes.device_id || '',
            gvm: initialData.attributes.gvm || 0,
            fuel_capacity: initialData.attributes.fuel_capacity || 0,
            fuel_capacity_unit: initialData.attributes.fuel_capacity_unit || 'L',
            fuel_sensor_conversion_factor: initialData.attributes.fuel_sensor_conversion_factor || 0,
            ...estimationDefaults(initialData.attributes),
            tire_psi: initialData.attributes.tire_psi || {
                front_left: 32,
                front_right: 32,
                rear_left: 32,
                rear_right: 32,
            },
        } : {
            registration_number: '',
            make: '',
            model: '',
            year: new Date().getFullYear().toString(),
            chasis_number: '',
            display_number: '',
            color: '',
            fuel_type: 'Petrol',
            body_type: 'Sedan',
            type: 'car',
            status: 'active',
            device_id: '',
            gvm: 0,
            fuel_capacity: 0,
            fuel_capacity_unit: 'L',
            fuel_sensor_conversion_factor: 0,
            ...estimationDefaults(),
            tire_psi: {
                front_left: 32,
                front_right: 32,
                rear_left: 32,
                rear_right: 32,
            },
        }
    })

    const estimationEnabled = useWatch({ control: form.control, name: 'fuel_estimation_enabled' })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid grid-cols-3 mb-6">
                        <TabsTrigger value="general">General Info</TabsTrigger>
                        <TabsTrigger value="technical">Technical Specs</TabsTrigger>
                        <TabsTrigger value="tires">Tire Pressure</TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="registration_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Registration Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. ABC-123" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="display_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Display Number (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Internal ID" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="make"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Make</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Toyota, Mercedes, etc." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Model</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Camry, Actros, etc." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Year</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Color</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Silver, White" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                                <SelectItem value="in_transit">In Transit</SelectItem>
                                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fleet Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select fleet type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="car">Car</SelectItem>
                                                <SelectItem value="van">Van</SelectItem>
                                                <SelectItem value="truck">Truck</SelectItem>
                                                <SelectItem value="bus">Bus</SelectItem>
                                                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                                                <SelectItem value="tricycle">Tricycle</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="technical" className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="chasis_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Chasis Number (VIN)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter VIN" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="device_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Device ID (IMEI)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Tracker IMEI" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fuel_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fuel Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select fuel type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Petrol">Petrol</SelectItem>
                                                <SelectItem value="Diesel">Diesel</SelectItem>
                                                <SelectItem value="Electric">Electric</SelectItem>
                                                <SelectItem value="Hybrid">Hybrid</SelectItem>
                                                <SelectItem value="Gas">Gas (CNG/LPG)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="body_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Body Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select body type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Sedan">Sedan</SelectItem>
                                                <SelectItem value="Truck">Truck</SelectItem>
                                                <SelectItem value="Van">Van</SelectItem>
                                                <SelectItem value="SUV">SUV</SelectItem>
                                                <SelectItem value="Coupe">Coupe</SelectItem>
                                                <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="md:col-span-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-slate-800">Odometer</p>
                                    {initialData && <OdometerValue odometer={currentOdometer} className="text-xs" />}
                                </div>
                                <p className="text-xs text-slate-500">
                                    {initialData
                                        ? 'Leave the reading blank to keep the current odometer. A reading is only recorded when you enter one.'
                                        : 'Optional. Enter what the dashboard shows now, or add it later.'}
                                </p>
                                <OdometerReadingFields
                                    draft={readingDraft}
                                    onChange={setReadingDraft}
                                    errors={readingErrors}
                                    showKind={false}
                                    idPrefix="vf-odo"
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="gvm"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gross Vehicle Mass (kg)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fuel_capacity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fuel Capacity</FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input type="number" className="flex-1" {...field} />
                                            </FormControl>
                                            <FormField
                                                control={form.control}
                                                name="fuel_capacity_unit"
                                                render={({ field: unitField }) => (
                                                    <Select onValueChange={unitField.onChange} defaultValue={unitField.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-24">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="L">Liters</SelectItem>
                                                            <SelectItem value="Gal">Gallons</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fuel_sensor_conversion_factor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fuel Sensor conversion factor</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="md:col-span-2 space-y-4 rounded-2xl border border-slate-200 p-4">
                                <FormField
                                    control={form.control}
                                    name="fuel_estimation_enabled"
                                    render={({ field }) => (
                                        <FormItem className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <FormLabel>Estimate fuel use</FormLabel>
                                                <FormDescription>
                                                    For vehicles whose tracker reports no fuel level, fuel use is estimated from distance and idling time. Turn this off to stop estimating for this vehicle.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Estimate fuel use" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="estimated_liters_per_100km"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Consumption (L/100 km)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" inputMode="decimal" step="0.1" min="0" placeholder="Typical for this make and model" disabled={!estimationEnabled} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="estimated_idle_liters_per_hour"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Idle burn (L/hour)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" inputMode="decimal" step="0.1" min="0" placeholder="Typical for this make and model" disabled={!estimationEnabled} {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <p className="text-xs text-slate-500">
                                    Your own figures win. Leave a rate blank to use the typical figure for this vehicle&apos;s make and model, when one is on file. With neither, no fuel estimate is made for it. Changes reach fuel reports within the hour.
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="tires" className="space-y-4 pt-2">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Gauge className="w-4 h-4 text-blue-600" />
                                Recommended Tire PSI Settings
                            </h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6 max-w-md mx-auto">
                                <FormField
                                    control={form.control}
                                    name="tire_psi.front_left"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase tracking-wider text-slate-500">Front Left</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} className="bg-white" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="tire_psi.front_right"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase tracking-wider text-slate-500">Front Right</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} className="bg-white" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="tire_psi.rear_left"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase tracking-wider text-slate-500">Rear Left</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} className="bg-white" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="tire_psi.rear_right"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] uppercase tracking-wider text-slate-500">Rear Right</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} className="bg-white" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-8 text-center">
                                * These values are used for reference and threshold alerting in the maintenance module.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[120px]" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {initialData ? 'Update Vehicle' : 'Create Vehicle'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
