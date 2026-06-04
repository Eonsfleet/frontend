'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload } from 'lucide-react'
import { uploadFile, createDocument } from '@/lib/api/documents'
import { getVehicles } from '@/lib/api/vehicles'
import { getDrivers } from '@/lib/api/drivers'
import { extractApiError } from '@/lib/utils'

const schema = z.object({
    type: z.enum(['vehicle', 'driver']),
    related_id: z.string().min(1, 'Please select an entity'),
    category: z.string().min(1, 'Category is required'),
    title: z.string().optional(),
    description: z.string().optional(),
    issued_at: z.string().optional(),
    expires_at: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DocumentUploadDialogProps {
    open: boolean
    onClose: () => void
    defaultType?: 'vehicle' | 'driver'
    defaultRelatedId?: string | number
}

export function DocumentUploadDialog({
    open,
    onClose,
    defaultType = 'vehicle',
    defaultRelatedId,
}: DocumentUploadDialogProps) {
    const queryClient = useQueryClient()
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
    const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null)
    const [isUploading, setIsUploading] = React.useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            type: defaultType,
            related_id: defaultRelatedId ? String(defaultRelatedId) : '',
            category: 'registration',
            title: '',
            description: '',
            issued_at: '',
            expires_at: '',
        },
    })

    const entityType = form.watch('type')

    const { data: vehiclesData } = useQuery({
        queryKey: ['vehicles-list-doc'],
        queryFn: () => getVehicles({ per_page: 200 }),
        enabled: open && entityType === 'vehicle',
    })

    const { data: driversData } = useQuery({
        queryKey: ['drivers-list-doc'],
        queryFn: () => getDrivers({ per_page: 200 }),
        enabled: open && entityType === 'driver',
    })

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: FormValues) => {
            if (!uploadedUrl) throw new Error('Please wait for the file to finish uploading')
            return createDocument({
                type: values.type,
                related_id: values.related_id,
                category: values.category,
                file_path: uploadedUrl,
                title: values.title || undefined,
                description: values.description || undefined,
                issued_at: values.issued_at || undefined,
                expires_at: values.expires_at || undefined,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] })
            queryClient.invalidateQueries({ queryKey: ['vehicle-documents'] })
            toast.success('Document uploaded successfully')
            form.reset()
            setSelectedFile(null)
            setUploadedUrl(null)
            onClose()
        },
        onError: (error: any) => {
            toast.error(extractApiError(error))
        },
    })

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File too large — maximum is 10 MB')
            e.target.value = ''
            return
        }
        setSelectedFile(file)
        setUploadedUrl(null)
        setIsUploading(true)
        try {
            const { url } = await uploadFile(file)
            setUploadedUrl(url)
            toast.success('File ready', { description: 'You can now save the document.', duration: 2000 })
        } catch (err: any) {
            toast.error('Upload failed', { description: extractApiError(err) })
            setSelectedFile(null)
        } finally {
            setIsUploading(false)
        }
    }

    const handleClose = () => {
        form.reset()
        setSelectedFile(null)
        setUploadedUrl(null)
        onClose()
    }

    const vehicles = vehiclesData?.data ?? []
    const drivers = driversData?.data ?? []

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Attach a document to a vehicle or driver record.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit((d) => mutate(d))} className="space-y-4">

                        {/* Entity type + selector */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Belongs To</FormLabel>
                                        <Select
                                            onValueChange={(v) => {
                                                field.onChange(v)
                                                form.setValue('related_id', '')
                                            }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="vehicle">Vehicle</SelectItem>
                                                <SelectItem value="driver">Driver</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="related_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{entityType === 'vehicle' ? 'Vehicle' : 'Driver'}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select…" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {entityType === 'vehicle'
                                                    ? vehicles.map((v) => (
                                                        <SelectItem key={v.id} value={String(v.id)}>
                                                            {v.attributes.registration_number} — {v.attributes.make} {v.attributes.model}
                                                        </SelectItem>
                                                    ))
                                                    : drivers.map((d) => (
                                                        <SelectItem key={d.id} value={String(d.id)}>
                                                            {d.attributes.full_name || `${d.attributes.first_name} ${d.attributes.last_name}`}
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Category + Title */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="registration">Registration</SelectItem>
                                                <SelectItem value="insurance">Insurance</SelectItem>
                                                <SelectItem value="inspection">Inspection</SelectItem>
                                                <SelectItem value="license">License</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title (optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 2025 Insurance" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="issued_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Issued Date</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="expires_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Expiry Date</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* File */}
                        <FormItem>
                            <FormLabel>File</FormLabel>
                            <FormControl>
                                <div className="space-y-1">
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        onChange={onFileChange}
                                    />
                                    {selectedFile && (
                                        <p className="text-[11px] text-slate-500">
                                            {selectedFile.name} · {(selectedFile.size / 1024).toFixed(0)} KB
                                            {uploadedUrl && <span className="text-emerald-600 ml-1">✓ ready</span>}
                                            {isUploading && <span className="text-blue-500 ml-1">uploading…</span>}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-slate-400">PDF, JPG, PNG, DOC — max 10 MB</p>
                                </div>
                            </FormControl>
                        </FormItem>

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Additional notes…"
                                            className="resize-none h-20"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending || isUploading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending || isUploading || !uploadedUrl}>
                                {(isPending || isUploading) ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploading ? 'Uploading…' : 'Saving…'}</>
                                ) : (
                                    <><Upload className="mr-2 h-4 w-4" />Save Document</>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
