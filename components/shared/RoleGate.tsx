'use client'

import React, { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, ArrowLeft, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RoleGateProps {
    children: React.ReactNode
    allowedRoles: string[]
    fallbackMessage?: string
}

export function RoleGate({
    children,
    allowedRoles,
    fallbackMessage = "You do not have the required permissions to view this secure area."
}: RoleGateProps) {
    const { user } = useAuthStore()
    const router = useRouter()
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
        )
    }

    if (!user) {
        // Handled by higher-up layout middleware ideally, but fallback here
        return null
    }

    const userRoles = Array.isArray(user.attributes.role) ? user.attributes.role : [user.attributes.role]
    const hasAccess = userRoles.some(r => allowedRoles.includes(r as string))

    if (!hasAccess) {
        return (
            <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-slate-50 p-6">
                <Card className="w-full max-w-md shadow-sm border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center pt-10 pb-8 px-8 text-center">
                        <div className="h-16 w-16 bg-rose-100 rounded-full flex items-center justify-center mb-6 ring-8 ring-rose-50">
                            <ShieldAlert className="h-8 w-8 text-rose-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Restricted Access</h2>
                        <p className="text-slate-500 mb-8">{fallbackMessage}</p>

                        <div className="w-full space-y-3">
                            <Button
                                className="w-full"
                                onClick={() => router.push('/dashboard')}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <>{children}</>
}
