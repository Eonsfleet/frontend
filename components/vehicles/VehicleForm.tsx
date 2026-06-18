'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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
    odometer_when_join: z.coerce.number().optional(),
    gvm: z.coerce.number().optional(),
    fuel_capacity: z.coerce.number().optional(),
    fuel_capacity_unit: z.string().optional(),
    fuel_sensor_conversion_factor: z.coerce.number().optional(),
    tire_psi: z.object({
        front_left: z.coerce.number().optional(),
        front_right: z.coerce.number().optional(),
        rear_left: z.coerce.number().optional(),
        rear_right: z.coerce.number().optional(),
    }).optional(),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

interface VehicleFormProps {
    initialData?: Vehicle
    onSubmit: (data: VehicleFormValues) => void
    isLoading?: boolean
    onCancel?: () => void
}

export function VehicleForm({ initialData, onSubmit, isLoading, onCancel }: VehicleFormProps) {
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
            type: initialData.attributes.type || 'Fleet',
            status: initialData.attributes.status,
            device_id: initialData.attributes.device_id || '',
            odometer_when_join: initialData.attributes.odometer?.at_join_km || 0,
            gvm: initialData.attributes.gvm || 0,
            fuel_capacity: initialData.attributes.fuel_capacity || 0,
            fuel_capacity_unit: initialData.attributes.fuel_capacity_unit || 'L',
            fuel_sensor_conversion_factor: initialData.attributes.fuel_sensor_conversion_factor || 0,
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
            type: 'Fleet',
            status: 'active',
            device_id: '',
            odometer_when_join: 0,
            gvm: 0,
            fuel_capacity: 0,
            fuel_capacity_unit: 'L',
            fuel_sensor_conversion_factor: 0,
            tire_psi: {
                front_left: 32,
                front_right: 32,
                rear_left: 32,
                rear_right: 32,
            },
        }
    })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                        <FormControl>
                                            <Input placeholder="e.g. Fleet, Subcontracted" {...field} />
                                        </FormControl>
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
                            <FormField
                                control={form.control}
                                name="odometer_when_join"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Odometer When Joined (KM)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
