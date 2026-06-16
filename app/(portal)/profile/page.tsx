'use client'

import React, { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2, UserCircle, Upload, Shield, Calendar, Phone, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { useUpdateUser, useUpdatePassword, useUploadFile } from '@/lib/hooks/useUpdateUser'

const profileSchema = z.object({
    first_name: z.string().min(2, 'Required'),
    last_name: z.string().min(2, 'Required'),
    phone_number: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z.object({
    current_password: z.string().min(6, 'Required'),
    new_password: z.string().min(8, 'Minimum 8 characters'),
    confirm_password: z.string().min(8, 'Minimum 8 characters'),
}).refine(data => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>

const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    (props, ref) => {
        const [show, setShow] = React.useState(false)
        return (
            <div className="relative">
                <Input type={show ? 'text' : 'password'} ref={ref} {...props} className="pr-10" />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        )
    }
)
PasswordInput.displayName = 'PasswordInput'

export default function ProfilePage() {
    const { user, updateUser: updateUserStore } = useAuthStore()
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [securityOpen, setSecurityOpen] = React.useState(false)
    
    // React Query mutations
    const updateUserMutation = useUpdateUser() // For profile updates
    const updatePasswordMutation = useUpdatePassword()
    const uploadFileMutation = useUploadFile()

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image too large', { description: 'Maximum file size is 5 MB.' })
            e.target.value = ''
            return
        }
        
        // Show loading toast
        const uploadToast = toast.loading('Uploading avatar...')
        
        try {
            // Step 1: Upload file to get URL (waits for completion)
            const uploadResponse = await uploadFileMutation.mutateAsync({ file, folder: 'avatar' })
            
            // Step 2: Get the uploaded file URL from response
            const uploadedFileUrl = uploadResponse.data.file.url
            
            // Update toast to show we're saving
            toast.loading('Saving avatar...', { id: uploadToast })
            
            // Step 3: Update user with the avatar URL (only runs after upload succeeds)
            await updateUserMutation.mutateAsync({ 
                id: user!.id, 
                data: { avatar: uploadedFileUrl } 
            })
            
            // Step 4: Update local store with new avatar URL
            updateUserStore({
                attributes: { ...user!.attributes, avatar: uploadedFileUrl }
            })
            
            toast.success('Avatar updated successfully', { id: uploadToast })
        } catch (error) {
            toast.error('Failed to update avatar', { id: uploadToast })
        }
    }

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty, isSubmitting }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            first_name: '',
            last_name: '',
            phone_number: ''
        }
    })

    const {
        register: registerObj,
        handleSubmit: handleSubmitPassword,
        reset: resetPassword,
        formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword }
    } = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema)
    })

    useEffect(() => {
        if (user) {
            reset({
                first_name: user.attributes.first_name || '',
                last_name: user.attributes.last_name || '',
                phone_number: user.attributes.phone_number || '',
            })
        }
    }, [user, reset])

    const onSubmitProfile = async (data: ProfileFormValues) => {
        // Transform data to match API payload
        const payload = {
            f_name: data.first_name,
            l_name: data.last_name,
            phone_number: data.phone_number || null,
        }

        updateUserMutation.mutate(
            { id: user!.id, data: payload },
            {
                onSuccess: (response) => {
                    // Update local store with new user data
                    updateUserStore({
                        attributes: {
                            ...user!.attributes,
                            first_name: data.first_name,
                            last_name: data.last_name,
                            full_name: `${data.first_name} ${data.last_name}`,
                            phone_number: data.phone_number || null,
                        }
                    })
                    reset(data) // Reset dirty state
                }
            }
        )
    }

    const onSubmitPassword = async (data: PasswordFormValues) => {
        // new_password/confirm_password match is enforced client-side by the schema;
        // the API only expects { current_password, password }
        const payload = {
            current_password: data.current_password,
            password: data.new_password,
        }

        updatePasswordMutation.mutate(payload, {
            onSuccess: () => {
                resetPassword()
                setSecurityOpen(false)
            }
        })
    }

    if (!user) return <div role="status" aria-label="Loading" className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>

    const userRoleStr = String(Array.isArray(user.attributes.role) ? user.attributes.role[0] : user.attributes.role)

    return (
        <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personal Profile</h1>
                <p className="text-slate-500 mt-1">Manage your identity, avatar, and security credentials.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column - Meta */}
                <div className="col-span-1 space-y-6">
                    <Card className="shadow-sm border-slate-200 text-center overflow-hidden">
                        <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <CardContent className="px-6 pb-6 relative pt-0">
                            <div
                                className="mx-auto w-24 h-24 bg-white rounded-full border-4 border-white shadow-sm flex items-center justify-center -mt-12 mb-4 overflow-hidden relative group cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {user.attributes.avatar ? (
                                    <img src={user.attributes.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500 text-3xl font-bold uppercase">
                                        {user.attributes.first_name?.[0]}{user.attributes.last_name?.[0]}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center text-white transition-all">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900">{user.attributes.full_name}</h2>
                            <p className="text-sm text-slate-500 mb-3">{user.attributes.email}</p>
                            <Badge variant="secondary" className="capitalize bg-indigo-50 text-indigo-700">
                                {userRoleStr.replace('_', ' ')}
                            </Badge>
                        </CardContent>
                        <div className="bg-slate-50 border-t border-slate-100 p-4 divide-y divide-slate-200 text-sm">
                            <div className="flex justify-between py-2 text-slate-600">
                                <span className="flex items-center gap-1.5 min-w-0 text-slate-500"><Shield className="w-4 h-4" /> ID</span>
                                <span className="font-mono text-xs">{user.id.substring(0, 8)}</span>
                            </div>
                            <div className="flex justify-between py-2 text-slate-600">
                                <span className="flex items-center gap-1.5 min-w-0 text-slate-500"><Calendar className="w-4 h-4" /> Joined</span>
                                <span className="font-medium text-xs">{user.attributes.joined_date ? format(new Date(user.attributes.joined_date), 'MMM dd, yyyy') : 'Unknown'}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column - Forms */}
                <div className="col-span-1 md:col-span-2 space-y-6">

                    {/* General Info */}
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="border-b border-slate-100 bg-slate-50 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserCircle className="w-5 h-5 text-indigo-500" /> Identity Details
                            </CardTitle>
                        </CardHeader>
                        <form onSubmit={handleSubmit(onSubmitProfile)}>
                            <CardContent className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name</Label>
                                        <Input id="first_name" {...register('first_name')} />
                                        {errors.first_name && <p className="text-xs text-red-500 mt-1">{errors.first_name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name</Label>
                                        <Input id="last_name" {...register('last_name')} />
                                        {errors.last_name && <p className="text-xs text-red-500 mt-1">{errors.last_name.message}</p>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address <span className="text-xs text-slate-400 font-normal ml-1">(Managed by Administrator)</span></Label>
                                    <Input id="email" value={user.attributes.email} disabled className="bg-slate-50 text-slate-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone_number">Phone Number</Label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input id="phone_number" {...register('phone_number')} className="pl-9" placeholder="+1 (555) 000-0000" />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setSecurityOpen(true)}
                                >
                                    <Shield className="w-4 h-4 mr-2" /> Manage Security
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!isDirty || isSubmitting || updateUserMutation.isPending}
                                >
                                    {(isSubmitting || updateUserMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Profile
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                </div>
            </div>

            {/* Security Modal */}
            <Dialog
                open={securityOpen}
                onOpenChange={(open) => {
                    setSecurityOpen(open)
                    if (!open) resetPassword()
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-500" /> Security
                        </DialogTitle>
                        <DialogDescription>Update your password to keep your account secure.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Current Password</Label>
                            <PasswordInput {...registerObj('current_password')} />
                            {passwordErrors.current_password && <p className="text-xs text-red-500 mt-1">{passwordErrors.current_password.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <div className="space-y-2">
                                <Label>New Password</Label>
                                <PasswordInput {...registerObj('new_password')} />
                                {passwordErrors.new_password && <p className="text-xs text-red-500 mt-1">{passwordErrors.new_password.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Confirm Password</Label>
                                <PasswordInput {...registerObj('confirm_password')} />
                                {passwordErrors.confirm_password && <p className="text-xs text-red-500 mt-1">{passwordErrors.confirm_password.message}</p>}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSecurityOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingPassword || updatePasswordMutation.isPending}
                            >
                                {(isSubmittingPassword || updatePasswordMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Update Password
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
