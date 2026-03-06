'use client'

import React, { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/settings'
import { toast } from 'sonner'
import { Loader2, Building, Globe, Mail, Phone, Upload } from 'lucide-react'

const orgSchema = z.object({
    name: z.string().min(2, 'Organization name is required'),
    subdomain: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Lower-case letters, numbers, and hyphens only'),
    domain: z.string().optional(),
})

type OrgFormValues = z.infer<typeof orgSchema>

export default function OrganizationSettingsPage() {
    const { user, organization: currentOrg } = useAuthStore()
    const queryClient = useQueryClient()
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [logoUrl, setLogoUrl] = React.useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            toast.promise(
                new Promise((resolve) => {
                    setTimeout(() => {
                        setLogoUrl(URL.createObjectURL(file))
                        resolve(true)
                    }, 1500)
                }),
                {
                    loading: 'Uploading new logo...',
                    success: 'Logo updated successfully',
                    error: 'Failed to upload image'
                }
            )
        }
    }

    const userRole = user?.attributes?.role
    const isAdmin = Array.isArray(userRole) ? userRole.includes('administrator') : userRole === 'administrator'

    const { data: orgData, isLoading } = useQuery({
        queryKey: ['settings-organization', currentOrg?.id],
        queryFn: () => api.getOrganization(currentOrg!.id),
        enabled: !!currentOrg?.id
    })

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty }
    } = useForm<OrgFormValues>({
        resolver: zodResolver(orgSchema),
        defaultValues: { name: '', subdomain: '', domain: '' }
    })

    useEffect(() => {
        if (orgData?.data) {
            reset({
                name: orgData.data.name || '',
                subdomain: orgData.data.subdomain || '',
                domain: orgData.data.domain || '',
            })
        }
    }, [orgData, reset])

    const { mutate: updateOrg, isPending } = useMutation({
        mutationFn: (data: OrgFormValues) => api.updateOrganization(currentOrg!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings-organization'] })
            toast.success('Organization settings updated successfully')
        },
        onError: () => {
            toast.error('Failed to update organization settings')
        }
    })

    const onSubmit = (data: OrgFormValues) => {
        updateOrg(data)
    }

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization Settings</h1>
                <p className="text-slate-500 mt-1">Manage public profile, custom domains, and corporate branding.</p>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-white border-b border-slate-100 pb-4">
                    <CardTitle className="text-base font-bold text-slate-900">Company Profile</CardTitle>
                    <CardDescription>This information determines your login subdomain and external facing emails.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardContent className="space-y-8 p-6">

                        <div className="flex flex-col sm:flex-row gap-8 items-start">
                            <div className="flex-shrink-0">
                                <Label className="block text-sm font-semibold text-slate-700 mb-3">Organization Logo</Label>
                                <div
                                    className="relative w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-slate-400 transition-colors cursor-pointer group overflow-hidden"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Organization Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Building className="w-8 h-8 mb-2 group-hover:hidden" />
                                            <Upload className="w-8 h-8 mb-2 hidden group-hover:block text-slate-600" />
                                            <span className="text-xs font-medium">Upload Image</span>
                                        </>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white transition-all">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                </div>
                                <p className="text-[10px] text-slate-400 text-center mt-2 max-w-[128px]">Min 256x256px. PNG or JPG only.</p>
                            </div>

                            <div className="flex-1 space-y-5 w-full">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Display Name <span className="text-red-500">*</span></Label>
                                    <Input id="name" {...register('name')} placeholder="E.g., Logistics Express Inc." className="max-w-md" disabled={!isAdmin} />
                                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subdomain" className="text-sm font-semibold text-slate-700">Login Subdomain <span className="text-red-500">*</span></Label>
                                    <div className="flex max-w-md shadow-sm rounded-md">
                                        <Input id="subdomain" {...register('subdomain')} className="rounded-r-none border-r-0 focus-visible:ring-0 z-10" disabled={!isAdmin} />
                                        <div className="flex items-center px-3 border border-l-0 border-slate-200 bg-slate-50 text-slate-500 text-sm rounded-r-md">
                                            .eonsfleet.com
                                        </div>
                                    </div>
                                    {errors.subdomain && <p className="text-xs text-red-500 mt-1">{errors.subdomain.message}</p>}
                                    <p className="text-xs text-slate-500">Your dedicated login portal. Changing this forces all users to log in again.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="domain" className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                        <Globe className="w-3.5 h-3.5 text-slate-400" /> Custom Domain
                                    </Label>
                                    <Input id="domain" {...register('domain')} placeholder="e.g., app.yourcompany.com" className="max-w-md" disabled={!isAdmin} />
                                    <p className="text-[11px] text-indigo-600 flex items-center font-medium mt-1">Requires 'Enterprise' plan DNS configuration.</p>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                    {isAdmin && (
                        <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end gap-3 rounded-b-xl">
                            <Button variant="outline" type="button" onClick={() => reset()} disabled={!isDirty || isPending}>
                                Discard Changes
                            </Button>
                            <Button type="submit" disabled={!isDirty || isPending}>
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Preferences
                            </Button>
                        </CardFooter>
                    )}
                </form>
            </Card>
        </div>
    )
}
