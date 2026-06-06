'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ScheduleDetailContent } from './ScheduleDetailContent'

interface Props {
    scheduleId: string | null
    onClose: () => void
}

export function MaintenanceScheduleDrawer({ scheduleId, onClose }: Props) {
    const [isFullWidth, setIsFullWidth] = useState(false)
    const pathname = usePathname()

    // Reset full-width when a different (or no) schedule is selected
    useEffect(() => {
        if (!scheduleId) setIsFullWidth(false)
    }, [scheduleId])

    const handleExpand = () => {
        setIsFullWidth(true)
        window.history.pushState({}, '', `/maintenance/schedules/${scheduleId}?width=full`)
    }

    const handleCollapse = () => {
        setIsFullWidth(false)
        window.history.replaceState({}, '', pathname)
    }

    const handleClose = () => {
        // Always restore listing URL when drawer closes
        window.history.replaceState({}, '', pathname)
        setIsFullWidth(false)
        onClose()
    }

    return (
        <Sheet open={!!scheduleId} onOpenChange={(open) => { if (!open) handleClose() }}>
            <SheetContent
                side="right"
                className={cn(
                    'p-0 flex flex-col gap-0 overflow-y-auto transition-[max-width] duration-300 ease-in-out',
                    isFullWidth ? 'w-screen !max-w-full' : 'w-full sm:max-w-[700px]'
                )}
            >
                {/* Always rendered — Radix a11y requirement */}
                <SheetTitle className="sr-only">Maintenance Schedule Detail</SheetTitle>

                <ScheduleDetailContent
                    scheduleId={scheduleId}
                    mode="drawer"
                    isFullWidth={isFullWidth}
                    onExpandFull={handleExpand}
                    onCollapse={handleCollapse}
                    onClose={handleClose}
                />
            </SheetContent>
        </Sheet>
    )
}
