'use client'
import { Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { resetPassword } from '@/lib/api/auth'

const schema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string()
}).refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ['password_confirmation']
})

type ResetPasswordForm = z.infer<typeof schema>

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''
    const otp = searchParams.get('otp') || ''

    const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
        resolver: zodResolver(schema),
    })

    const { mutate, isPending } = useMutation({
        mutationFn: resetPassword,
        onSuccess: (data) => {
            toast.success(data.message || 'Password reset successfully')
            router.push('/login')
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message ?? 'Failed to reset password'
            toast.error(msg)
        },
    })

    const onSubmit = (data: ResetPasswordForm) => {
        if (!email || !otp) {
            toast.error('Missing required recovery tokens. Please restart process.')
            router.push('/forgot-password')
            return
        }
        mutate({
            email,
            otp,
            password: data.password,
            password_confirmation: data.password_confirmation
        })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-2xl shadow-sm border text-center">
                <div className="flex justify-center mb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Password</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        Your new password must be different from previous used passwords.
                    </p>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
                    <div>
                        <label className="text-sm font-medium leading-none text-slate-900">
                            New Password
                        </label>
                        <input
                            type="password"
                            {...register('password')}
                            className="flex h-11 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent mt-1.5 transition-shadow"
                            placeholder="••••••••"
                        />
                        {errors.password && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.password.message}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium leading-none text-slate-900">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            {...register('password_confirmation')}
                            className="flex h-11 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent mt-1.5 transition-shadow"
                            placeholder="••••••••"
                        />
                        {errors.password_confirmation && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.password_confirmation.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20 h-11 w-full mt-2"
                    >
                        {isPending ? 'Resetting password...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
            <ResetPasswordContent />
        </Suspense>
    )
}
