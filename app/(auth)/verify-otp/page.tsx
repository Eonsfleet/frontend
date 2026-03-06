'use client'
import { useState, Suspense } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { verifyOtp } from '@/lib/api/auth'
import Link from 'next/link'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp'

function VerifyOtpContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''

    const [otp, setOtp] = useState('')

    const { mutate, isPending } = useMutation({
        mutationFn: verifyOtp,
        onSuccess: (data) => {
            toast.success(data.message || 'OTP Verified')
            router.push(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`)
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message ?? 'Invalid OTP code'
            toast.error(msg)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (otp.length !== 6) {
            toast.error('Please enter a valid 6-digit code')
            return
        }
        if (!email) {
            toast.error('Missing email address, please restart the recovery process')
            return
        }
        mutate({ email, otp })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-2xl shadow-sm border text-center">
                <div className="flex justify-center mb-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Verify Code</h1>
                    <p className="text-slate-500 text-sm mt-2">
                        We sent a 6-digit verification code to <br className="hidden sm:block" />
                        <span className="font-semibold text-slate-900">{email || 'your email'}</span>
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-8 flex flex-col items-center">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(val) => setOtp(val)}
                        disabled={isPending}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>

                    <button
                        type="submit"
                        disabled={isPending || otp.length !== 6}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md hover:shadow-blue-600/20 h-11 w-full"
                    >
                        {isPending ? 'Verifying...' : 'Verify Code'}
                    </button>
                </form>

                <p className="text-sm text-slate-500">
                    Didn't receive the code?{' '}
                    <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                        Resend
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
            <VerifyOtpContent />
        </Suspense>
    )
}
