'use client'

import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Copy,
    Edit3,
    ExternalLink,
    Eye,
    EyeOff,
    FileJson,
    FileText,
    Filter,
    Headphones,
    ListChecks,
    MoreVertical,
    Pause,
    Plus,
    RefreshCw,
    RotateCcw,
    Send,
    Settings,
    ShieldCheck,
    Trash2,
    Webhook,
    Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api/settings'
import { GenerateApiKeyDialog } from '@/components/integrations/GenerateApiKeyDialog'

type IntegrationTab = 'api' | 'webhooks'

const resources = [
    {
        title: 'API Documentation',
        description: 'Explore endpoints and guides',
        icon: FileText,
        className: 'bg-blue-50 text-blue-600',
    },
    {
        title: 'Authentication Guide',
        description: 'Learn how to authenticate',
        icon: ShieldCheck,
        className: 'bg-indigo-50 text-indigo-600',
    },
    {
        title: 'Postman Collection',
        description: 'Import our collection',
        icon: Zap,
        className: 'bg-orange-50 text-orange-600',
    },
    {
        title: 'API Status Page',
        description: 'View real-time status',
        icon: CheckCircle2,
        className: 'bg-emerald-50 text-emerald-600',
    },
]

const webhookEndpoints = [
    {
        name: 'Primary Production',
        url: 'https://api.acmelogistics.com/webhooks/eonsfleet',
        active: true,
        events: '18 events',
        lastDelivery: 'May 16, 2024 10:28 AM',
        deliveryStatus: '200 OK',
        successRate: 99.2,
    },
    {
        name: 'Analytics Service',
        url: 'https://analytics.acmelogistics.com/hook/eonsfleet',
        active: true,
        events: '12 events',
        lastDelivery: 'May 16, 2024 10:27 AM',
        deliveryStatus: '200 OK',
        successRate: 98.9,
    },
    {
        name: 'Backup Endpoint',
        url: 'https://backup.acmelogistics.com/webhook',
        active: true,
        events: '15 events',
        lastDelivery: 'May 16, 2024 10:21 AM',
        deliveryStatus: '200 OK',
        successRate: 97.8,
    },
    {
        name: 'Staging Endpoint',
        url: 'https://staging.acmelogistics.com/webhook',
        active: false,
        events: '8 events',
        lastDelivery: 'May 15, 2024 09:14 PM',
        deliveryStatus: '-',
        successRate: 0,
    },
    {
        name: 'Local Development',
        url: 'http://localhost:3000/webhook/eonsfleet',
        active: false,
        events: '2 events',
        lastDelivery: 'May 12, 2024 04:32 PM',
        deliveryStatus: '-',
        successRate: 0,
    },
]

const eventSubscriptions = [
    { name: 'All Events', count: '0', checked: false },
    { name: 'Vehicle Events', count: '6 events', checked: true },
    { name: 'Location Updates', count: '2 events', checked: true },
    { name: 'Trip Events', count: '5 events', checked: false },
    { name: 'Geofence Events', count: '3 events', checked: false },
    { name: 'Fuel Events', count: '4 events', checked: false },
    { name: 'Alert Events', count: '6 events', checked: false },
    { name: 'Device Events', count: '2 events', checked: false },
    { name: 'Maintenance Events', count: '2 events', checked: false },
    { name: 'Driver Events', count: '3 events', checked: false },
]
const deliveryLogs = [
    {
        time: 'May 16, 2024 10:28:34 AM',
        event: 'vehicle.moving',
        description: 'Vehicle started moving',
        endpoint: 'Primary Production',
        status: 'Delivered',
        response: '200 OK',
        duration: '112 ms',
    },
    {
        time: 'May 16, 2024 10:28:21 AM',
        event: 'location.update',
        description: 'Location updated',
        endpoint: 'Analytics Service',
        status: 'Delivered',
        response: '200 OK',
        duration: '95 ms',
    },
    {
        time: 'May 16, 2024 10:27:58 AM',
        event: 'fuel.level.low',
        description: 'Fuel level below 15%',
        endpoint: 'Primary Production',
        status: 'Delivered',
        response: '200 OK',
        duration: '128 ms',
    },
    {
        time: 'May 16, 2024 10:27:43 AM',
        event: 'geofence.enter',
        description: 'Entered "Lagos Depot"',
        endpoint: 'Backup Endpoint',
        status: 'Failed',
        response: '500 Internal Server Error',
        duration: '-',
    },
    {
        time: 'May 16, 2024 10:27:30 AM',
        event: 'trip.started',
        description: 'Trip started',
        endpoint: 'Primary Production',
        status: 'Delivered',
        response: '200 OK',
        duration: '103 ms',
    },
]

const webhookGuide = [
    { title: 'Webhook Documentation', description: 'Learn how webhooks work', icon: FileText },
    { title: 'Verify Webhook Signatures', description: 'Validate requests from EonsFleet', icon: ShieldCheck },
    { title: 'Example Payloads', description: 'View sample event payloads', icon: FileJson },
    { title: 'Troubleshooting', description: 'Common issues and solutions', icon: Clock3 },
]
function IntegrationTabs({ activeTab, onTabChange }: { activeTab: IntegrationTab; onTabChange: (tab: IntegrationTab) => void }) {
    return (
        <nav aria-label="Integration sections" className="flex items-center gap-6 overflow-x-auto border-b border-slate-100 pb-px">
            {(['api', 'webhooks'] as IntegrationTab[]).map((tab) => {
                const isActive = activeTab === tab
                return (
                    <button
                        className={cn(
                            'relative inline-flex items-center whitespace-nowrap pb-3 text-sm font-medium transition-colors',
                            isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700',
                        )}
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        type="button"
                    >
                        {tab === 'api' ? 'API' : 'Webhooks'}
                        {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" />}
                    </button>
                )
            })}
        </nav>
    )
}
function MetricCard({
    title,
    value,
    delta,
    dataKey,
    stroke,
    data,
}: {
    title: string
    value: string
    delta: string
    dataKey: 'requests' | 'success_rate' | 'avg_response_time_ms'
    stroke: string
    data: { label: string; requests: number; success_rate: number | null; avg_response_time_ms: number | null }[]
}) {
    return (
        <section className="rounded-2xl bg-white p-5">
            <p className="text-[13px] font-medium text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            {delta && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                    <span className="text-emerald-600">{delta}</span> vs previous 30 days
                </p>
            )}
            <div className="mt-3 h-24">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ left: -24, right: 0, top: 8, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`${dataKey}-fill`} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={stroke} stopOpacity={0.18} />
                                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis
                            axisLine={false}
                            dataKey="label"
                            interval={3}
                            tick={{ fill: '#94a3b8', fontSize: 10 }}
                            tickLine={false}
                        />
                        <YAxis hide domain={['dataMin - 8', 'dataMax + 8']} />
                        <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: 12 }}
                            cursor={{ stroke: '#e2e8f0' }}
                        />
                        <Area
                            activeDot={{ r: 4, fill: stroke, stroke: '#fff', strokeWidth: 2 }}
                            dataKey={dataKey}
                            fill={`url(#${dataKey}-fill)`}
                            stroke={stroke}
                            strokeWidth={2.5}
                            type="monotone"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </section>
    )
}

function StatusCard() {
    return (
        <section className="rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">API Status</h2>
                <Badge className="rounded-md bg-emerald-50 px-2 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                    Active
                </Badge>
            </div>
            <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Environment</span>
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Production
                    </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">API Version</span>
                    <span className="font-medium text-slate-900">v1</span>
                </div>
            </div>
        </section>
    )
}

function RateLimitCard() {
    const { data } = useQuery({ queryKey: ['rate-limit'], queryFn: api.getRateLimit, refetchInterval: 15000 })
    const limit = data?.data.limit ?? 0
    const used = data?.data.used ?? 0
    const remaining = data?.data.remaining ?? 0
    const usedPct = limit > 0 ? Math.round((used / limit) * 100) : 0
    const usageData = [{ name: 'Used', value: used }, { name: 'Remaining', value: Math.max(0, remaining) }]

    return (
        <section className="rounded-2xl bg-white p-5">
            <h2 className="text-base font-bold text-slate-900">Rate Limit</h2>
            <p className="mt-1 text-[13px] text-slate-500">Per minute usage</p>
            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-4">
                <div className="relative h-32">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                cornerRadius={8}
                                data={usageData}
                                dataKey="value"
                                endAngle={-270}
                                innerRadius={44}
                                outerRadius={58}
                                paddingAngle={2}
                                startAngle={90}
                                stroke="none"
                            >
                                <Cell fill="#3b82f6" />
                                <Cell fill="#e2e8f0" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold text-slate-900">{usedPct}%</span>
                        <span className="text-xs font-medium text-slate-500">Used</span>
                    </div>
                </div>
                <div className="space-y-3 text-sm">
                    <div>
                        <p className="text-xs text-slate-400">Limit</p>
                        <p className="font-medium text-slate-900">{limit.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Used</p>
                        <p className="font-medium text-slate-900">{used.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Remaining</p>
                        <p className="font-medium text-slate-900">{remaining.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </section>
    )
}

function CredentialsCard() {
    const queryClient = useQueryClient()
    const [isGenerateOpen, setIsGenerateOpen] = useState(false)
    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
    const [rotatedKey, setRotatedKey] = useState<string | null>(null)

    const { data, isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: api.getApiKeys })

    const revokeMutation = useMutation({
        mutationFn: api.revokeApiKey,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] })
            toast.success('API key revoked')
        },
        onError: () => toast.error('Failed to revoke API key'),
    })

    const rotateMutation = useMutation({
        mutationFn: (id: string) => api.rotateApiKey(id),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['api-keys'] })
            setRotatedKey(res.data.new_key.api_key)
            toast.success('API key rotated — the old key still works until you revoke it')
        },
        onError: () => toast.error('Failed to rotate API key'),
    })

    const toggleReveal = (id: string) => {
        setRevealedIds((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const keys = data?.data ?? []

    return (
        <section className="rounded-2xl bg-white p-5 xl:col-span-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-900">API Credentials</h2>
                    <p className="mt-1 text-sm text-slate-500">Use your API keys to authenticate requests to the EonsFleet API.</p>
                </div>
                <Button
                    variant="ghost"
                    className="h-9 w-fit rounded-lg bg-slate-50 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setIsGenerateOpen(true)}
                >
                    <Plus className="mr-2 h-4 w-4" /> Generate Key
                </Button>
            </div>
            {isLoading ? (
                <div className="mt-5 space-y-4">
                    {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
            ) : keys.length === 0 ? (
                <p className="mt-6 text-sm text-slate-500">No API keys yet. Generate one to start calling the EonsFleet API.</p>
            ) : (
                <div className="mt-5 divide-y divide-slate-100">
                    {keys.map((key) => {
                        const revealed = revealedIds.has(key.id)
                        return (
                            <div className="grid gap-4 py-4 md:grid-cols-[1.7fr_0.7fr_1fr_auto]" key={key.id}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-slate-900">{key.key_name}</p>
                                        <Badge className={cn('rounded-md px-2 text-[11px] font-medium', key.is_active && !key.is_expired && !key.is_revoked ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : 'bg-slate-100 text-slate-500 hover:bg-slate-100')}>
                                            {key.is_revoked ? 'Revoked' : key.is_expired ? 'Expired' : key.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2">
                                        <p className="font-mono text-sm text-slate-700">{revealed ? key.prefix : `${key.prefix.slice(0, 8)}${'*'.repeat(16)}`}</p>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100" onClick={() => toggleReveal(key.id)}>
                                            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100"
                                            onClick={() => {
                                                navigator.clipboard.writeText(key.prefix)
                                                toast.info('Copied to clipboard')
                                            }}
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-sm">
                                    <p className="text-xs font-medium text-slate-400">Created</p>
                                    <p className="mt-1 text-slate-600">{new Date(key.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-sm">
                                    <p className="text-xs font-medium text-slate-400">Last Used</p>
                                    <p className="mt-1 text-slate-600">{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</p>
                                </div>
                                <div className="flex items-center justify-self-end gap-2 self-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-600 hover:bg-slate-50"
                                        disabled={key.is_revoked || rotateMutation.isPending}
                                        onClick={() => rotateMutation.mutate(key.id)}
                                    >
                                        Rotate
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                        disabled={key.is_revoked || revokeMutation.isPending}
                                        onClick={() => revokeMutation.mutate(key.id)}
                                    >
                                        Revoke
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            <GenerateApiKeyDialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen} />

            <Dialog open={rotatedKey !== null} onOpenChange={(open) => !open && setRotatedKey(null)}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Key rotated</DialogTitle>
                        <DialogDescription>
                            Copy the new key now — <strong className="text-rose-600">it won&apos;t be shown again.</strong> The old key keeps working until you revoke it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 p-3 font-mono text-sm break-all text-slate-800">
                        <p className="pr-10">{rotatedKey}</p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                            onClick={() => {
                                navigator.clipboard.writeText(rotatedKey ?? '')
                                toast.info('Copied to clipboard')
                            }}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button className="w-full rounded-lg bg-blue-600 hover:bg-blue-700" onClick={() => setRotatedKey(null)}>
                            I have stored it securely
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    )
}

function QuickStartCard() {
    return (
        <section className="rounded-2xl bg-white p-5 xl:col-span-5">
            <h2 className="text-base font-bold text-slate-900">Quick Start</h2>
            <p className="mt-1 text-sm text-slate-500">Make your first API request in minutes.</p>
            <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 text-white">
                <div className="flex overflow-x-auto text-xs font-medium text-slate-300">
                    {['cURL', 'JavaScript', 'Python', 'PHP', 'Go'].map((tabName, tabIndex) => (
                        <button
                            className={cn('px-5 py-3 transition hover:bg-white/5', tabIndex === 0 && 'border-b-2 border-blue-500 text-white')}
                            key={tabName}
                            type="button"
                        >
                            {tabName}
                        </button>
                    ))}
                </div>
                <div className="relative overflow-x-auto p-5 font-mono text-xs leading-6 sm:text-sm">
                    <Button className="absolute right-4 top-4 h-8 rounded-md bg-white/10 px-3 text-xs font-medium text-white hover:bg-white/20">
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                    </Button>
                    <p><span className="mr-4 text-slate-500">1</span><span className="text-cyan-300">curl</span> <span className="text-blue-300">--request</span> GET \</p>
                    <p><span className="mr-4 text-slate-500">2</span>https://api.eonsfleet.com/v1/vehicles \</p>
                    <p><span className="mr-4 text-slate-500">3</span><span className="text-blue-300">--header</span> <span className="text-green-300">&quot;Authorization: Bearer ef_****************7a3f&quot;</span> \</p>
                    <p><span className="mr-4 text-slate-500">4</span><span className="text-blue-300">--header</span> <span className="text-green-300">&quot;Accept: application/json&quot;</span></p>
                </div>
            </div>
            <a className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700" href="#">
                View API Documentation <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </a>
        </section>
    )
}

function LogsTable() {
    const [page, setPage] = useState(1)
    const { data, isLoading } = useQuery({
        queryKey: ['api-usage-logs', page],
        queryFn: () => api.getApiUsageLogs({ page, per_page: 15 }),
    })

    const logs = data?.data.logs ?? []
    const pagination = data?.data.pagination

    return (
        <section className="rounded-2xl bg-white p-5 xl:col-span-9">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-900">API Request Logs</h2>
                    <p className="mt-1 text-sm text-slate-500">Monitor and analyze API requests to your account.</p>
                </div>
            </div>
            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="text-xs font-medium text-slate-400">
                        <tr>
                            <th className="px-3 py-3">Time</th>
                            <th className="px-3 py-3">Method</th>
                            <th className="px-3 py-3">Endpoint</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Response Time</th>
                            <th className="px-3 py-3">IP Address</th>
                            <th className="px-3 py-3">User Agent</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={7} className="py-10 text-center text-slate-400">Loading…</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={7} className="py-10 text-center text-slate-400">No API requests logged yet.</td></tr>
                        ) : (
                            logs.map((log) => {
                                const isError = (log.status_code ?? 0) >= 400
                                return (
                                    <tr className="text-slate-600 transition hover:bg-slate-50/70" key={log.id}>
                                        <td className="px-3 py-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="px-3 py-3">
                                            <Badge className={cn('rounded-md px-2 py-1 text-[11px] font-medium', log.method === 'POST' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50')}>
                                                {log.method}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-3">
                                            <p className="font-medium text-slate-900">{log.endpoint}</p>
                                            <p className="text-xs text-slate-400">{log.description}</p>
                                        </td>
                                        <td className="px-3 py-3">
                                            <Badge className={cn('rounded-md px-2 py-1 text-[11px] font-medium', isError ? 'bg-orange-50 text-orange-700 hover:bg-orange-50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50')}>
                                                {log.status_code ?? '—'}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-3">{log.duration_ms != null ? `${log.duration_ms} ms` : '—'}</td>
                                        <td className="px-3 py-3">{log.ip_address ?? '—'}</td>
                                        <td className="px-3 py-3">{log.user_agent ?? '—'}</td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-between pt-4 text-sm text-slate-500">
                    <p>Page {pagination.current_page} of {pagination.last_page} ({pagination.total} total)</p>
                    <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50" disabled={page >= pagination.last_page} onClick={() => setPage((p) => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </section>
    )
}

function ResourcesPanel() {
    return (
        <aside className="space-y-4 xl:col-span-3">
            <section className="rounded-2xl bg-white p-5">
                <h2 className="text-base font-bold text-slate-900">Resources</h2>
                <div className="mt-4 space-y-4">
                    {resources.map((resource) => {
                        const ResourceIcon = resource.icon
                        return (
                            <a className="flex items-center gap-3 rounded-xl transition hover:bg-slate-50" href="#" key={resource.title}>
                                <span className={cn('grid h-9 w-9 place-items-center rounded-lg', resource.className)}>
                                    <ResourceIcon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-slate-900">{resource.title}</span>
                                    <span className="block text-xs text-slate-400">{resource.description}</span>
                                </span>
                                <ExternalLink className="h-4 w-4 text-slate-400" />
                            </a>
                        )
                    })}
                </div>
            </section>
            <section className="rounded-2xl bg-white p-5">
                <h2 className="text-base font-bold text-slate-900">Need Help?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Our support team is ready to help you integrate smoothly.</p>
                <Button variant="ghost" className="mt-4 h-10 w-full rounded-lg bg-slate-50 font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                    <Headphones className="mr-2 h-4 w-4" /> Contact Support
                </Button>
            </section>
        </aside>
    )
}

function WebhookMetricCard({ title, value, subtitle, icon: Icon, tone }: { title: string; value: string; subtitle: string; icon: React.ElementType; tone: string }) {
    return (
        <section className="rounded-2xl bg-white p-5">
            <div className="flex items-start gap-4">
                <span className={cn('grid h-10 w-10 place-items-center rounded-xl', tone)}>
                    <Icon className="h-5 w-5" />
                </span>
                <div>
                    <p className="text-[13px] font-medium text-slate-500">{title}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
                    <p className="mt-2 text-xs font-medium text-slate-500">{subtitle}</p>
                </div>
            </div>
        </section>
    )
}

function WebhookSecretCard({ className }: { className?: string } = {}) {
    return (
        <section className="rounded-2xl bg-white p-5 w-full col-span-4 min-h-max">
            <h2 className="text-base font-bold text-slate-900">Webhook Signing Secret</h2>
            <p className="mt-1 text-sm text-slate-500">Use this secret to verify webhook signatures from EonsFleet.</p>
            <div className="mt-4 flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">whsec_**********************7a3f</p>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100">
                    <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100">
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
            <Button variant="ghost" className="mt-4 h-9 w-full rounded-lg bg-slate-50 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                <RefreshCw className="mr-2 h-4 w-4" /> Rotate Secret
            </Button>
        </section>
    )
}
function WebhooksTable() {
    const [openMenu, setOpenMenu] = useState<string | null>(null)
    const actionItems = [
        { label: 'View Details', icon: Eye },
        { label: 'Edit Webhook', icon: Edit3 },
        { label: 'Manage Events', icon: ListChecks },
        { label: 'Test Webhook', icon: Send },
        { label: 'View Deliveries', icon: FileText },
        { label: 'Regenerate Secret', icon: RotateCcw },
        { label: 'Duplicate Webhook', icon: Copy },
        { label: 'Pause Webhook', icon: Pause },
        { label: 'Delete Webhook', icon: Trash2, danger: true },
    ]

    return (
        <section className="relative rounded-2xl bg-white p-5 xl:col-span-8">
            <div>
                <h2 className="text-base font-bold text-slate-900">Your Webhooks</h2>
                <p className="mt-1 text-sm text-slate-500">Manage your webhook endpoints and configurations.</p>
            </div>
            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[840px] text-left text-sm">
                    <thead className="text-xs font-medium text-slate-400">
                        <tr>
                            <th className="px-3 py-3">Endpoint</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Events</th>
                            <th className="px-3 py-3">Last Delivery</th>
                            <th className="px-3 py-3">Success Rate (30D)</th>
                            <th className="px-3 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {webhookEndpoints.map((endpoint) => (
                            <tr className="text-slate-600 transition hover:bg-slate-50/70" key={endpoint.name}>
                                <td className="px-3 py-4">
                                    <p className="font-medium text-slate-900">{endpoint.name}</p>
                                    <p className="mt-1 text-xs text-slate-500">{endpoint.url}</p>
                                </td>
                                <td className="px-3 py-4">
                                    <Badge className={cn('rounded-md px-2 py-1 text-[11px] font-medium', endpoint.active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : 'bg-slate-100 text-slate-500 hover:bg-slate-100')}>
                                        {endpoint.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </td>
                                <td className="px-3 py-4">{endpoint.events}</td>
                                <td className="px-3 py-4">
                                    <p>{endpoint.lastDelivery}</p>
                                    <p className={cn('mt-1 text-xs', endpoint.active ? 'text-emerald-600' : 'text-slate-400')}>{endpoint.deliveryStatus}</p>
                                </td>
                                <td className="px-3 py-4">
                                    <p className="font-medium text-slate-700">{endpoint.successRate}%</p>
                                    <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                                        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${endpoint.successRate}%` }} />
                                    </div>
                                </td>
                                <td className="relative px-3 py-4 text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-50 text-slate-500"><Settings className="h-4 w-4" /></Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-slate-400"
                                        onClick={() => setOpenMenu(openMenu === endpoint.name ? null : endpoint.name)}
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                    {openMenu === endpoint.name && (
                                        <div className="absolute right-3 top-12 z-20 w-56 rounded-2xl bg-white p-2 text-sm">
                                            {actionItems.map(({ label, icon: Icon, danger }) => (
                                                <button
                                                    className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium transition hover:bg-slate-50', danger ? 'text-rose-600' : 'text-slate-700')}
                                                    key={label}
                                                    onClick={() => setOpenMenu(null)}
                                                    type="button"
                                                >
                                                    <Icon className="h-4 w-4" /> {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <a className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700" href="#">View All Webhooks</a>

        </section>
    )
}
function EventSubscriptionsCard() {
    return (
        <section className="rounded-2xl bg-white p-5 xl:col-span-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Event Subscriptions</h2>
                    <p className="mt-1 text-sm text-slate-500">Manage which events you want to receive.</p>
                </div>
                <Button variant="ghost" className="h-9 rounded-lg bg-slate-50 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                    <Edit3 className="mr-2 h-4 w-4" /> Manage
                </Button>
            </div>
            <div className="mt-5 divide-y divide-slate-100">
                {eventSubscriptions.map((event) => (
                    <label className="flex cursor-pointer items-center gap-3 py-3" key={event.name}>
                        <input checked={event.checked} readOnly type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
                        <span className="flex-1 text-sm font-medium text-slate-700">{event.name}</span>
                        <span className="text-xs text-slate-400">{event.count}</span>
                    </label>
                ))}
            </div>
            <a className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700" href="#">
                View All Events <ChevronRight className="ml-1 h-4 w-4" />
            </a>
        </section>
    )
}

function WebhookGuideCard() {
    return (
        <section className="rounded-2xl bg-white p-5 xl:col-span-4">
            <h2 className="text-base font-bold text-slate-900">Webhook Guide</h2>
            <p className="mt-1 text-sm text-slate-500">Learn how to configure and secure webhooks.</p>
            <div className="mt-5 space-y-4">
                {webhookGuide.map((item) => {
                    const Icon = item.icon
                    return (
                        <a className="flex items-center gap-3 rounded-xl transition hover:bg-slate-50" href="#" key={item.title}>
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span>
                            <span>
                                <span className="block text-sm font-medium text-slate-900">{item.title}</span>
                                <span className="block text-xs text-slate-400">{item.description}</span>
                            </span>
                        </a>
                    )
                })}
            </div>
            <a className="mt-5 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700" href="#">
                View Full Documentation <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </a>
        </section>
    )
}
function RecentDeliveriesTable() {
    return (
        <section className="rounded-2xl bg-white p-5 xl:col-span-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Recent Deliveries</h2>
                    <p className="mt-1 text-sm text-slate-500">Monitor the delivery status of your webhook events.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" className="h-9 rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100">All Statuses <ChevronDown className="ml-2 h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" className="h-9 rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100">May 9, 2024 - May 16, 2024 <Calendar className="ml-2 h-3.5 w-3.5 text-slate-400" /></Button>
                    <Button variant="ghost" className="h-9 rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100"><Filter className="mr-2 h-3.5 w-3.5" /> Filters</Button>
                </div>
            </div>
            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="text-xs font-medium text-slate-400">
                        <tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Endpoint</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Response</th><th className="px-3 py-3">Duration</th><th className="px-3 py-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {deliveryLogs.map((delivery) => {
                            const isFailed = delivery.status === 'Failed'
                            return (
                                <tr className="text-slate-600 transition hover:bg-slate-50/70" key={`${delivery.time}-${delivery.event}`}>
                                    <td className="px-3 py-4 whitespace-nowrap">{delivery.time}</td>
                                    <td className="px-3 py-4"><p className="font-medium text-slate-900">{delivery.event}</p><p className="text-xs text-slate-400">{delivery.description}</p></td>
                                    <td className="px-3 py-4">{delivery.endpoint}</td>
                                    <td className={cn('px-3 py-4 font-medium', isFailed ? 'text-rose-600' : 'text-emerald-600')}>{isFailed ? 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³' : 'ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã¢â‚¬Â¦ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“'} {delivery.status}</td>
                                    <td className={cn('px-3 py-4', isFailed ? 'text-slate-700' : 'text-emerald-600')}>{delivery.response}</td>
                                    <td className="px-3 py-4">{delivery.duration}</td>
                                    <td className="px-3 py-4 text-right"><Button variant="ghost" className="h-8 rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100">{isFailed ? 'View Details' : 'View'}</Button><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400"><MoreVertical className="h-4 w-4" /></Button></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <a className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700" href="#">View All Deliveries</a>
        </section>
    )
}

function ApiTabContent() {
    const { data: summaryData } = useQuery({ queryKey: ['api-usage-summary'], queryFn: () => api.getApiUsageSummary(30) })
    const days = summaryData?.data.days ?? []
    const chartData = days.map((d) => ({
        label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        requests: d.requests,
        success_rate: d.success_rate ?? 0,
        avg_response_time_ms: d.avg_response_time_ms ?? 0,
    }))

    const totalRequests = days.reduce((sum, d) => sum + d.requests, 0)
    const daysWithData = days.filter((d) => d.requests > 0)
    const avgSuccessRate = daysWithData.length > 0 ? daysWithData.reduce((sum, d) => sum + (d.success_rate ?? 0), 0) / daysWithData.length : 0
    const avgResponseTime = daysWithData.length > 0 ? daysWithData.reduce((sum, d) => sum + (d.avg_response_time_ms ?? 0), 0) / daysWithData.length : 0

    return (
        <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-5">
                <StatusCard />
                <MetricCard title="Requests (30 Days)" value={totalRequests.toLocaleString()} delta="" dataKey="requests" stroke="#3b82f6" data={chartData} />
                <MetricCard title="Success Rate (30 Days)" value={`${avgSuccessRate.toFixed(1)}%`} delta="" dataKey="success_rate" stroke="#10b981" data={chartData} />
                <MetricCard title="Average Response Time" value={`${Math.round(avgResponseTime)} ms`} delta="" dataKey="avg_response_time_ms" stroke="#8b5cf6" data={chartData} />
                <RateLimitCard />
            </section>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12"><CredentialsCard /><QuickStartCard /></section>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12"><LogsTable /><ResourcesPanel /></section>
        </>
    )
}

function WebhooksTabContent() {
    return (
        <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                <WebhookMetricCard title="Total Webhooks" value="5" subtitle="Active endpoints" icon={Webhook} tone="bg-violet-50 text-violet-600" />
                <WebhookMetricCard title="Successful Deliveries (30D)" value="24,781" subtitle="98.7% success rate" icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
                <WebhookMetricCard title="Failed Deliveries (30D)" value="312" subtitle="1.3% failure rate" icon={AlertTriangle} tone="bg-orange-50 text-orange-600" />
                <WebhookMetricCard title="Events Delivered (30D)" value="25,093" subtitle="+18% vs previous 30 days" icon={RefreshCw} tone="bg-blue-50 text-blue-600" />
                <WebhookMetricCard title="Avg. Response Time" value="142 ms" subtitle="-12% vs previous 30 days" icon={Clock3} tone="bg-indigo-50 text-indigo-600" />
            </section>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12"><WebhooksTable /><WebhookSecretCard className="xl:col-span-4 h-fit" /></section>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12"><RecentDeliveriesTable /><WebhookGuideCard /></section>
        </>
    )
}
export default function IntegrationsPage() {
    const [activeTab, setActiveTab] = useState<IntegrationTab>('webhooks')
    const isWebhooks = activeTab === 'webhooks'

    return (
        <div className="space-y-6 p-6 lg:p-8">
            <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integrations</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {isWebhooks
                                ? 'Receive real-time event notifications from EonsFleet via webhooks.'
                                : 'Connect EonsFleet API with your systems and automate data flow.'}
                        </p>
                    </div>
                    {isWebhooks && (
                        <Button className="h-10 w-fit rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Add Webhook
                        </Button>
                    )}
                </div>
                <IntegrationTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {isWebhooks ? <WebhooksTabContent /> : <ApiTabContent />}
        </div>
    )
}