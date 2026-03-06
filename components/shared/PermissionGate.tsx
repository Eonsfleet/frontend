'use client'

import React from 'react'
import { usePermission } from '@/hooks/usePermission'

interface PermissionGateProps {
    permission: string
    children: React.ReactNode
    fallback?: React.ReactNode
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
    const { can } = usePermission()

    if (can(permission)) {
        return <>{children}</>
    }

    return <>{fallback}</>
}
