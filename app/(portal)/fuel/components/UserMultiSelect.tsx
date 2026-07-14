'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getUsers } from '@/lib/api/settings'
import { cn } from '@/lib/utils'

interface UserMultiSelectProps {
    /** Currently selected user ids. */
    value: number[]
    onChange: (ids: number[]) => void
    placeholder?: string
    emptyLabel?: string
    className?: string
}

/**
 * Searchable, multi-select user picker backed by /users. Mirrors VehicleMultiSelect;
 * used to choose alert recipients (recipient_user_ids).
 */
export function UserMultiSelect({
    value,
    onChange,
    placeholder = 'Search users...',
    emptyLabel = 'Select users',
    className,
}: UserMultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const usersQuery = useQuery({
        queryKey: ['fuel-alert-recipient-users'],
        queryFn: () => getUsers({ per_page: 200 }),
    })

    const allUsers = useMemo(
        () =>
            (usersQuery.data?.data.users ?? []).map((user) => ({
                id: Number(user.id),
                label: user.attributes.full_name || `${user.attributes.first_name} ${user.attributes.last_name}`.trim() || user.attributes.email,
                meta: user.attributes.email,
            })),
        [usersQuery.data],
    )

    const options = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return allUsers
        return allUsers.filter((user) => user.label.toLowerCase().includes(q) || user.meta.toLowerCase().includes(q))
    }, [search, allUsers])

    useEffect(() => {
        if (!isOpen) return
        const onPointerDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', onPointerDown)
        return () => document.removeEventListener('mousedown', onPointerDown)
    }, [isOpen])

    const selectedSet = useMemo(() => new Set(value), [value])

    const toggle = (id: number) => {
        onChange(selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id])
    }

    const triggerLabel =
        value.length === 0
            ? emptyLabel
            : value.length === 1
                ? allUsers.find((u) => u.id === value[0])?.label ?? '1 user'
                : `${value.length} users selected`

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                aria-expanded={isOpen}
                className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                onClick={() => setIsOpen((open) => !open)}
            >
                <span className={cn('min-w-0 truncate', value.length === 0 && 'text-slate-400')}>{triggerLabel}</span>
                <span className="flex shrink-0 items-center gap-1">
                    {value.length > 0 && (
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label="Clear recipients"
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            onClick={(event) => {
                                event.stopPropagation()
                                onChange([])
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    onChange([])
                                }
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                </span>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={placeholder}
                                className="h-8 border-slate-200 pl-8 text-[12px]"
                                aria-label="Search users"
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        {usersQuery.isLoading ? (
                            <p className="px-3 py-3 text-center text-[12px] text-slate-400">Loading users...</p>
                        ) : options.length === 0 ? (
                            <p className="px-3 py-3 text-center text-[12px] text-slate-400">No users found.</p>
                        ) : (
                            options.map((user) => {
                                const checked = selectedSet.has(user.id)
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                        onClick={() => toggle(user.id)}
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-[12px] font-semibold text-slate-700">{user.label}</span>
                                            <span className="block truncate text-[11px] text-slate-400">{user.meta || '—'}</span>
                                        </span>
                                        <Check className={cn('h-3.5 w-3.5 shrink-0 text-blue-600', checked ? 'opacity-100' : 'opacity-0')} />
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
