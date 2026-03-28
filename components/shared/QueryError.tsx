import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QueryErrorProps {
    message?: string
    onRetry?: () => void
}

export function QueryError({ message = 'Failed to load data.', onRetry }: QueryErrorProps) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{message}</span>
            {onRetry && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                    onClick={onRetry}
                >
                    <RefreshCw className="h-3 w-3" /> Retry
                </Button>
            )}
        </div>
    )
}
