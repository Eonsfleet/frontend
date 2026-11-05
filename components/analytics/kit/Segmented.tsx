'use client'

import { cn } from '@/lib/utils'

/** A small single-choice switch (radio group) for choosing which metric or category a chart shows. */
export function Segmented<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string
    options: { id: T; label: string }[]
    value: T
    onChange: (id: T) => void
}) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-an-border p-0.5">
            {options.map((o) => (
                <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={value === o.id}
                    onClick={() => onChange(o.id)}
                    className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-an-accent',
                        value === o.id ? 'bg-an-accent text-white' : 'text-an-muted hover:text-an-text',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}
