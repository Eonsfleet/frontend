'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { extractApiError } from '@/lib/utils'

const schema = z.object({
    category: z.string().min(1, 'Category is required'),
    title: z.string().optional(),
    description: z.string().optional(),
    issued_at: z.string().optional(),
    expires_at: z.string().optional(),
})

type DocumentFormValues = z.infer<typeof schema>

interface UploadDocumentDialogProps {
    vehicleId: string | number
    isOpen: boolean
    onClose: () => void
}

export function UploadDocumentDialog({ vehicleId, isOpen, onClose }: UploadDocumentDialogProps) {
    const queryClient = useQueryClient()
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
    const [uploadedUrl, setUploadedUrl] = React.useState<string | null>(null)
    const [isUploading, setIsUploading] = React.useState(false)

    const form = useForm<DocumentFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            category: 'registration',
            title: '',
            description: '',
            issued_at: '',
            expires_at: '',
        },
    })

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: DocumentFormValues) => {
            if (!uploadedUrl) throw new Error('Please wait for file to finish uploading')

            return await createDocument({
                type: 'vehicle',
                related_id: vehicleId,
                category: values.category,
                file_path: uploadedUrl,
                title: values.title || undefined,
                description: values.description || undefined,
                issued_at: values.issued_at || undefined,
                expires_at: values.expires_at || undefined,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicle-documents', vehicleId] })
            toast.success('Document saved successfully')
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
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setSelectedFile(file)
            setUploadedUrl(null)
            setIsUploading(true)

            try {
                const { url } = await uploadFile(file)
                setUploadedUrl(url)
                toast.success('File uploaded to server', {
                    description: 'You can now save the document record.',
                    duration: 2000
                })
            } catch (error: any) {
                toast.error('File upload failed', {
                    description: extractApiError(error)
                })
                setSelectedFile(null)
            } finally {
                setIsUploading(false)
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Upload vehicle registration, insurance or inspection documents.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit((d) => mutate(d))} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="registration">Registration</SelectItem>
                                                <SelectItem value="insurance">Insurance</SelectItem>
                                                <SelectItem value="inspection">Inspection</SelectItem>
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
                                        <FormLabel>Title (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 2025 Registration" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="issued_at"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Issued At</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="expires_at"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Expires At</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormItem>
                                <FormLabel>Document File</FormLabel>
                                <FormControl>
                                    <div className="flex flex-col gap-2">
                                        <Input
                                            type="file"
                                            onChange={onFileChange}
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        />
                                        <p className="text-[10px] text-slate-500 italic">
                                            Supported types: PDF, Images, Word (Max 10MB)
                                        </p>
                                    </div>
                                </FormControl>
                            </FormItem>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Add any additional notes..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isPending || isUploading}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending || isUploading || !uploadedUrl}>
                                {isPending || isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isUploading ? 'Uploading File...' : 'Saving...'}
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload Document
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
