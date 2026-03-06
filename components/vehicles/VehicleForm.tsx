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
import { Loader2 } from 'lucide-react'

const vehicleSchema = z.object({
    registration_number: z.string().min(1, 'Registration number is required'),
    make: z.string().min(1, 'Make is required'),
    model: z.string().min(1, 'Model is required'),
    year: z.string().min(4, 'Enter a valid year'),
    chasis_number: z.string().optional(),
    display_number: z.string().optional(),
    color: z.string().optional(),
    fuel_type: z.string().optional(),
    body_type: z.string().optional(),
    status: z.enum(['active', 'inactive', 'in_transit', 'maintenance']),
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
        resolver: zodResolver(vehicleSchema),
        defaultValues: initialData ? {
            registration_number: initialData.attributes.registration_number,
            make: initialData.attributes.make,
            model: initialData.attributes.model,
            year: initialData.attributes.year,
            chasis_number: initialData.attributes.chasis_number || '',
            display_number: initialData.attributes.display_number || '',
            color: initialData.attributes.color || '',
            fuel_type: initialData.attributes.fuel_type || '',
            body_type: initialData.attributes.body_type || '',
            status: initialData.attributes.status,
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
            status: 'active',
        }
    })

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
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
                        name="fuel_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fuel Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
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
                                        <SelectTrigger>
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
                        name="chasis_number"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Chasis Number (VIN)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter VIN" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

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
