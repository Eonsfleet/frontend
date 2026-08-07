import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const COLOR_CLASSES = {
    blue: 'bg-blue-50 text-blue-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    amber: 'bg-amber-50 text-amber-500',
    rose: 'bg-rose-50 text-rose-500',
    purple: 'bg-purple-50 text-purple-500',
} as const

interface KpiTileProps {
    icon: LucideIcon
    label: string
    value: React.ReactNode
    caption?: React.ReactNode
    color?: keyof typeof COLOR_CLASSES
}

// Matches the fuel module's TxKpiCards convention: icon tile + stacked label/value/caption.
export function KpiTile({ icon: Icon, label, value, caption, color = 'blue' }: KpiTileProps) {
    return (
        <Card className="rounded-2xl border-slate-100 p-3 shadow-none">
            <CardContent className="flex items-center gap-3 p-0">
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', COLOR_CLASSES[color])}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-slate-500">{label}</p>
                    <p className="whitespace-nowrap text-xl font-bold tracking-tight text-slate-900">{value}</p>
                    {caption && <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">{caption}</p>}
                </div>
            </CardContent>
        </Card>
    )
}
