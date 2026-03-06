'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { requestPasswordReset } from '@/lib/api/auth'
import Link from 'next/link'

const schema = z.object({
    email: z.string().email('Valid email required'),
})
type ForgotPasswordForm = z.infer<typeof schema>

export default function ForgotPasswordPage() {
    const router = useRouter()
    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(schema),
    })

    const { mutate, isPending } = useMutation({
        mutationFn: requestPasswordReset,
        onSuccess: (data, variables) => {
            toast.success(data.message || 'OTP sent successfully')
            router.push(`/verify-otp?email=${encodeURIComponent(variables.email)}`)
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message ?? 'Failed to send OTP'
            toast.error(msg)
        },
    })

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-2xl shadow-sm border text-center">
                <div className="flex justify-center mb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Forgot Password</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        Enter your email and we'll send you a 6-digit code to reset your password.
                    </p>
                </div>
                <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4 text-left">
                    <div>
                        <label className="text-sm font-medium leading-none text-slate-900">
                            Email Address
                        </label>
                        <input
                            type="email"
                            {...register('email')}
                            className="flex h-11 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent mt-1.5 transition-shadow"
                            placeholder="name@company.com"
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1.5 font-medium">{errors.email.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20 h-11 w-full"
                    >
                        {isPending ? 'Sending code...' : 'Send Reset Code'}
                    </button>
                </form>

                <p className="text-sm text-slate-500">
                    Remember your password?{' '}
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    )
}
