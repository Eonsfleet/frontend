'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { DriverDialog } from './DriverDialog'

export function AddDriverDialog() {
    const [open, setOpen] = useState(false)

    return (
        <PermissionGate permission="drivers:write">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Driver
            </Button>
            <DriverDialog open={open} onOpenChange={setOpen} mode="add" />
        </PermissionGate>
    )
}

