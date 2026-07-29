import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
}

// Every empty state must explain what is missing and the next action (spec section 6.5).
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Icon className="h-5 w-5 text-slate-400" />
            </div>
            <div>
                <p className="text-sm font-semibold text-slate-700">{title}</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">{description}</p>
            </div>
            {actionLabel && onAction && (
                <Button size="sm" onClick={onAction} className="mt-1">
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
