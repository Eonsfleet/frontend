'use client'

import React, { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
    CheckCircle2,
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
    Headphones,
    MoreVertical,
    Pause,
    Plus,
    RefreshCw,
    Send,
    ShieldCheck,
    Trash2,
    Webhook as WebhookIcon,
    Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn, extractApiError } from '@/lib/utils'
import * as api from '@/lib/api/settings'
import { GenerateApiKeyDialog } from '@/components/integrations/GenerateApiKeyDialog'
import { WebhookFormDialog2 } from '@/components/integrations/WebhookFormDialog2'
import { WebhookDeliveryAttemptsSheet } from '@/components/integrations/WebhookDeliveryAttemptsSheet'
import { WebhookReplayDialog, WebhookReplayHistory } from '@/components/integrations/WebhookReplayDialog'
import type { Webhook, WebhookDelivery } from '@/types'

type IntegrationTab = 'api' | 'webhooks'
type WebhookDialogState = { mode: 'create' | 'edit' | 'duplicate'; webhook: Webhook | null } | null

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

const QUICK_START_SNIPPETS: Record<string, string> = {
    cURL: `curl --request GET \\
  https://api.eonsfleet.com/v1/vehicles \\
  --header "Authorization: Bearer ef_****************7a3f" \\
  --header "Accept: application/json"`,
    JavaScript: `const response = await fetch('https://api.eonsfleet.com/v1/vehicles', {
  headers: {
    Authorization: 'Bearer ef_****************7a3f',
    Accept: 'application/json',
  },
})
const vehicles = await response.json()`,
    Python: `import requests

response = requests.get(
    "https://api.eonsfleet.com/v1/vehicles",
    headers={
        "Authorization": "Bearer ef_****************7a3f",
        "Accept": "application/json",
    },
)
vehicles = response.json()`,
    PHP: `$ch = curl_init('https://api.eonsfleet.com/v1/vehicles');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ef_****************7a3f',
    'Accept: application/json',
]);
$vehicles = json_decode(curl_exec($ch), true);`,
    Go: `req, _ := http.NewRequest("GET", "https://api.eonsfleet.com/v1/vehicles", nil)
req.Header.Set("Authorization", "Bearer ef_****************7a3f")
req.Header.Set("Accept", "application/json")
resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()`,
}

function highlightSnippetLine(line: string, key: number): React.ReactNode {
    const parts = line.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g)
    return (
        <p key={key}>
            <span className="mr-4 text-slate-500">{key + 1}</span>
            {parts.map((part, i) => (/^["'].*["']$/.test(part) ? <span key={i} className="text-green-300">{part}</span> : <span key={i}>{part}</span>))}
        </p>
    )
}

function QuickStartCard() {
    const languages = Object.keys(QUICK_START_SNIPPETS)
    const [activeLang, setActiveLang] = useState(languages[0])
    const lines = QUICK_START_SNIPPETS[activeLang].split('\n')

    return (
        <section className="rounded-2xl bg-white p-5 xl:col-span-5">
            <h2 className="text-base font-bold text-slate-900">Quick Start</h2>
            <p className="mt-1 text-sm text-slate-500">Make your first API request in minutes.</p>
            <div className="mt-5 overflow-hidden rounded-2xl bg-slate-950 text-white">
                <div className="flex overflow-x-auto text-xs font-medium text-slate-300">
                    {languages.map((tabName) => (
                        <button
                            className={cn('px-5 py-3 transition hover:bg-white/5', activeLang === tabName && 'border-b-2 border-blue-500 text-white')}
                            key={tabName}
                            onClick={() => setActiveLang(tabName)}
                            type="button"
                        >
                            {tabName}
                        </button>
                    ))}
                </div>
                <div className="relative overflow-x-auto p-5 font-mono text-xs leading-6 sm:text-sm">
                    <Button
                        className="absolute right-4 top-4 h-8 rounded-md bg-white/10 px-3 text-xs font-medium text-white hover:bg-white/20"
                        onClick={() => {
                            navigator.clipboard.writeText(QUICK_START_SNIPPETS[activeLang])
                            toast.info('Copied to clipboard')
                        }}
                    >
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                    </Button>
                    {lines.map((line, i) => highlightSnippetLine(line, i))}
                </div>
            </div>
            <a className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700" href="https://api.eonsfleet.io" target="_blank" rel="noopener noreferrer">
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
                            <a className="flex items-center gap-3 rounded-xl transition hover:bg-slate-50" href="https://api.eonsfleet.io" target="_blank" rel="noopener noreferrer" key={resource.title}>
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

/** Shared pager for the webhook tables — both endpoints paginate server-side. */
function TablePager({
    pagination,
    onPage,
}: {
    pagination: { current_page: number; last_page: number; total: number } | undefined
    onPage: (next: number) => void
}) {
    if (!pagination || pagination.last_page <= 1) return null
    return (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <p>Page {pagination.current_page} of {pagination.last_page} ({pagination.total} total)</p>
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-slate-50"
                    disabled={pagination.current_page <= 1}
                    onClick={() => onPage(pagination.current_page - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg bg-slate-50"
                    disabled={pagination.current_page >= pagination.last_page}
                    onClick={() => onPage(pagination.current_page + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
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

function WebhookSecretCard({
    webhook,
    onSecretIssued,
    className,
}: {
    webhook: Webhook | undefined
    onSecretIssued: (secret: string) => void
    className?: string
}) {
    const queryClient = useQueryClient()

    const regenerateMutation = useMutation({
        mutationFn: () => api.regenerateWebhookSecret(webhook!.id),
        // The rotated secret is in this response and nowhere else — refetching the
        // endpoint afterwards will not include it. Hand it straight to the reveal
        // dialog before invalidating, or the caller is left with a dead endpoint.
        onSuccess: (res) => {
            if (res.data.secret_key) {
                onSecretIssued(res.data.secret_key)
            } else {
                toast.error('Secret was rotated but not returned — contact support before your endpoint fails.')
            }
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
        },
        onError: () => toast.error('Failed to regenerate secret'),
    })

    if (!webhook) {
        return (
            <section className={cn('col-span-4 min-h-max w-full rounded-2xl bg-white p-5', className)}>
                <h2 className="text-base font-bold text-slate-900">Webhook Signing Secret</h2>
                <p className="mt-2 text-sm text-slate-500">Select a webhook to rotate its signing secret.</p>
            </section>
        )
    }

    return (
        <section className={cn('col-span-4 min-h-max w-full rounded-2xl bg-white p-5', className)}>
            <h2 className="text-base font-bold text-slate-900">Webhook Signing Secret</h2>
            <p className="mt-1 text-sm text-slate-500">For &quot;{webhook.name ?? webhook.url}&quot;</p>
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                Signing secrets are shown once, when the endpoint is created or its secret is rotated. Existing
                secrets cannot be retrieved — if yours is lost, rotate to get a new one.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-amber-700">
                Rotating takes effect immediately: deliveries signed with the old secret will start failing
                signature checks until you deploy the new one.
            </p>
            <Button
                variant="ghost"
                disabled={regenerateMutation.isPending}
                className="mt-4 h-9 w-full rounded-lg bg-slate-50 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                onClick={() => regenerateMutation.mutate()}
            >
                <RefreshCw className={cn('mr-2 h-4 w-4', regenerateMutation.isPending && 'animate-spin')} /> Rotate Secret
            </Button>
        </section>
    )
}
function WebhooksTable({
    onSelectSecret,
    onOpenDialog,
}: {
    onSelectSecret: (webhook: Webhook) => void
    onOpenDialog: (state: WebhookDialogState) => void
}) {
    const queryClient = useQueryClient()
    const [openMenu, setOpenMenu] = useState<string | null>(null)
    const [page, setPage] = useState(1)

    const { data, isLoading } = useQuery({
        queryKey: ['webhooks', page],
        queryFn: () => api.getWebhooks({ page }),
    })
    const webhooks = data?.data.webhooks ?? []
    const pagination = data?.data.pagination

    const deleteMutation = useMutation({
        mutationFn: api.deleteWebhook,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            toast.success('Webhook deleted')
        },
        onError: () => toast.error('Failed to delete webhook'),
    })

    const testMutation = useMutation({
        mutationFn: api.testWebhook,
        onSuccess: () => toast.success('Test event sent'),
        onError: () => toast.error('Test delivery failed to send'),
    })

    const pauseMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: 'active' | 'inactive' }) => api.updateWebhook(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhooks'] })
            toast.success('Webhook status updated')
        },
        onError: () => toast.error('Failed to update webhook status'),
    })

    const actionsFor = (webhook: Webhook) => [
        { label: 'Edit Webhook', icon: Edit3, onClick: () => onOpenDialog({ mode: 'edit', webhook }) },
        { label: 'Test Webhook', icon: Send, onClick: () => testMutation.mutate(webhook.id) },
        { label: 'Duplicate Webhook', icon: Copy, onClick: () => onOpenDialog({ mode: 'duplicate', webhook }) },
        {
            label: webhook.status === 'active' ? 'Pause Webhook' : 'Activate Webhook',
            icon: Pause,
            onClick: () => pauseMutation.mutate({ id: webhook.id, status: webhook.status === 'active' ? 'inactive' : 'active' }),
        },
        {
            label: 'Delete Webhook',
            icon: Trash2,
            danger: true,
            onClick: () => {
                if (confirm('Delete this webhook endpoint?')) deleteMutation.mutate(webhook.id)
            },
        },
    ]

    return (
        <section className="relative rounded-2xl bg-white p-5 xl:col-span-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Your Webhooks</h2>
                    <p className="mt-1 text-sm text-slate-500">Manage your webhook endpoints and configurations.</p>
                </div>
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
                        {isLoading ? (
                            <tr><td colSpan={6} className="py-10 text-center text-slate-400">Loading…</td></tr>
                        ) : webhooks.length === 0 ? (
                            <tr><td colSpan={6} className="py-10 text-center text-slate-400">No webhooks registered yet.</td></tr>
                        ) : (
                            webhooks.map((webhook) => (
                                <tr className="cursor-pointer text-slate-600 transition hover:bg-slate-50/70" key={webhook.id} onClick={() => onSelectSecret(webhook)}>
                                    <td className="px-3 py-4">
                                        <p className="font-medium text-slate-900">{webhook.name ?? 'Unnamed Endpoint'}</p>
                                        <p className="mt-1 text-xs text-slate-500">{webhook.url}</p>
                                    </td>
                                    <td className="px-3 py-4">
                                        <Badge className={cn('rounded-md px-2 py-1 text-[11px] font-medium', webhook.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50' : 'bg-slate-100 text-slate-500 hover:bg-slate-100')}>
                                            {webhook.status === 'active' ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td className="px-3 py-4">{webhook.events.length} events</td>
                                    <td className="px-3 py-4">
                                        <p>{webhook.last_delivery_at ? new Date(webhook.last_delivery_at).toLocaleString() : 'Never'}</p>
                                        {webhook.last_delivery_status && (
                                            <p className={cn('mt-1 text-xs', webhook.last_delivery_status === 'delivered' ? 'text-emerald-600' : 'text-rose-600')}>{webhook.last_delivery_status}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-4">
                                        <p className="font-medium text-slate-700">{webhook.success_rate_30d != null ? `${webhook.success_rate_30d}%` : '—'}</p>
                                        {webhook.success_rate_30d != null && (
                                            <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                                                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${webhook.success_rate_30d}%` }} />
                                            </div>
                                        )}
                                    </td>
                                    <td className="relative px-3 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-slate-400"
                                            onClick={() => setOpenMenu(openMenu === String(webhook.id) ? null : String(webhook.id))}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                        {openMenu === String(webhook.id) && (
                                            <div className="absolute right-3 top-12 z-20 w-56 rounded-2xl bg-white p-2 text-sm shadow-lg">
                                                {actionsFor(webhook).map(({ label, icon: Icon, danger, onClick }) => (
                                                    <button
                                                        className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium transition hover:bg-slate-50', danger ? 'text-rose-600' : 'text-slate-700')}
                                                        key={label}
                                                        onClick={() => { setOpenMenu(null); onClick(); }}
                                                        type="button"
                                                    >
                                                        <Icon className="h-4 w-4" /> {label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <TablePager pagination={pagination} onPage={setPage} />
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
            <WebhookReplayHistory />
        </section>
    )
}
function RecentDeliveriesTable() {
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [replayOpen, setReplayOpen] = useState(false)
    const [inspecting, setInspecting] = useState<WebhookDelivery | null>(null)
    const { data, isLoading } = useQuery({
        queryKey: ['webhook-deliveries-all', page],
        queryFn: () => api.getOrgWebhookDeliveries({ page, per_page: 10 }),
    })

    const deliveries = data?.data.deliveries ?? []
    const pagination = data?.data.pagination

    const retryMutation = useMutation({
        mutationFn: ({ endpointId, deliveryId }: { endpointId: number; deliveryId: number }) =>
            api.retryWebhookDelivery(endpointId, deliveryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['webhook-deliveries-all'] })
            toast.success('Delivery queued for retry')
        },
        onError: (error) => toast.error(extractApiError(error, 'Failed to retry delivery')),
    })

    return (
        <section className="rounded-2xl bg-white p-5 xl:col-span-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-900">Recent Deliveries</h2>
                    <p className="mt-1 text-sm text-slate-500">Monitor the delivery status of your webhook events. Select a row for its full attempt history.</p>
                </div>
                <Button
                    className="h-9 rounded-lg text-xs font-medium"
                    onClick={() => setReplayOpen(true)}
                    variant="outline"
                >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Replay Failed
                </Button>
            </div>
            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="text-xs font-medium text-slate-400">
                        <tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Endpoint</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Response</th><th className="px-3 py-3">Duration</th><th className="px-3 py-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={7} className="py-10 text-center text-slate-400">Loading…</td></tr>
                        ) : deliveries.length === 0 ? (
                            <tr><td colSpan={7} className="py-10 text-center text-slate-400">No deliveries yet.</td></tr>
                        ) : (
                            deliveries.map((delivery) => {
                                const isFailed = delivery.status === 'failed'
                                const isDeadLettered = delivery.dead_lettered_at !== null
                                // The API rejects retrying anything already delivered.
                                const canRetry = delivery.status !== 'delivered'
                                const isRetrying =
                                    retryMutation.isPending && retryMutation.variables?.deliveryId === delivery.id
                                return (
                                    <tr
                                        className="cursor-pointer text-slate-600 transition hover:bg-slate-50/70"
                                        key={delivery.id}
                                        onClick={() => setInspecting(delivery)}
                                    >
                                        <td className="px-3 py-4 whitespace-nowrap">{new Date(delivery.created_at).toLocaleString()}</td>
                                        <td className="px-3 py-4"><p className="font-medium text-slate-900">{delivery.event_type}</p></td>
                                        <td className="px-3 py-4">{delivery.endpoint?.name ?? delivery.endpoint?.url ?? '—'}</td>
                                        <td className={cn('px-3 py-4 font-medium', isFailed ? 'text-rose-600' : 'text-emerald-600')}>
                                            {isFailed ? '✕' : '✓'} {delivery.status}
                                            {isDeadLettered && (
                                                <span className="mt-1 block text-[11px] font-medium text-rose-500">
                                                    Dead-lettered · retries exhausted
                                                </span>
                                            )}
                                        </td>
                                        <td className={cn('px-3 py-4', isFailed ? 'text-slate-700' : 'text-emerald-600')}>{delivery.response_code ?? '—'}</td>
                                        <td className="px-3 py-4">{delivery.duration_ms != null ? `${delivery.duration_ms} ms` : '—'}</td>
                                        <td className="px-3 py-4 text-right">
                                            {canRetry && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isRetrying}
                                                    className="h-8 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        retryMutation.mutate({ endpointId: delivery.webhook_endpoint_id, deliveryId: delivery.id })
                                                    }}
                                                >
                                                    <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isRetrying && 'animate-spin')} />
                                                    Retry
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <TablePager pagination={pagination} onPage={setPage} />
            <WebhookDeliveryAttemptsSheet
                delivery={inspecting}
                onOpenChange={(open) => !open && setInspecting(null)}
            />
            <WebhookReplayDialog onOpenChange={setReplayOpen} open={replayOpen} />
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

function WebhooksTabContent({
    dialogState,
    onOpenDialog,
    newSecret,
    onSecretIssued,
}: {
    dialogState: WebhookDialogState
    onOpenDialog: (state: WebhookDialogState) => void
    newSecret: string | null
    onSecretIssued: (secret: string) => void
}) {
    const [selectedWebhook, setSelectedWebhook] = useState<Webhook | undefined>(undefined)
    const { data } = useQuery({ queryKey: ['webhooks-stats'], queryFn: api.getWebhookStats })
    const stats = data?.data

    return (
        <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                <WebhookMetricCard title="Total Webhooks" value={String(stats?.total_webhooks ?? 0)} subtitle={`${stats?.active_webhooks ?? 0} active`} icon={WebhookIcon} tone="bg-violet-50 text-violet-600" />
                <WebhookMetricCard title="Successful Deliveries (30D)" value={(stats?.successful_deliveries_30d ?? 0).toLocaleString()} subtitle={stats?.success_rate_30d != null ? `${stats.success_rate_30d}% success rate` : '—'} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" />
                <WebhookMetricCard title="Failed Deliveries (30D)" value={(stats?.failed_deliveries_30d ?? 0).toLocaleString()} subtitle={stats && stats.deliveries_30d > 0 ? `${(100 - (stats.success_rate_30d ?? 100)).toFixed(1)}% failure rate` : '—'} icon={AlertTriangle} tone="bg-orange-50 text-orange-600" />
                <WebhookMetricCard title="Events Delivered (30D)" value={(stats?.deliveries_30d ?? 0).toLocaleString()} subtitle="Delivery attempts" icon={RefreshCw} tone="bg-blue-50 text-blue-600" />
                <WebhookMetricCard title="Avg. Response Time" value={stats?.avg_response_time_ms != null ? `${Math.round(stats.avg_response_time_ms)} ms` : '—'} subtitle="30-day average" icon={Clock3} tone="bg-indigo-50 text-indigo-600" />
            </section>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <WebhooksTable onSelectSecret={setSelectedWebhook} onOpenDialog={onOpenDialog} />
                <WebhookSecretCard webhook={selectedWebhook} onSecretIssued={onSecretIssued} className="h-fit xl:col-span-4" />
            </section>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12"><RecentDeliveriesTable /><WebhookGuideCard /></section>

            <WebhookFormDialog2
                open={dialogState !== null}
                onOpenChange={(open) => !open && onOpenDialog(null)}
                editing={dialogState?.mode === 'edit' ? dialogState.webhook : null}
                duplicateFrom={dialogState?.mode === 'duplicate' ? dialogState.webhook : null}
                onSecretIssued={onSecretIssued}
            />

            <Dialog open={newSecret !== null} onOpenChange={(open) => !open && onSecretIssued('')}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Webhook secret</DialogTitle>
                        <DialogDescription>Save this now — it won&apos;t be shown again.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <code className="flex-1 truncate font-mono text-sm text-emerald-400">{newSecret}</code>
                        <button onClick={() => { navigator.clipboard.writeText(newSecret ?? ''); toast.info('Copied'); }} className="text-slate-400 hover:text-white">
                            <Copy className="h-4 w-4" />
                        </button>
                    </div>
                    <DialogFooter>
                        <Button className="w-full bg-slate-900" onClick={() => onSecretIssued('')}>I have saved the secret</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
export default function IntegrationsPage() {
    return (
        <Suspense fallback={null}>
            <IntegrationsPageContent />
        </Suspense>
    )
}

function IntegrationsPageContent() {
    const searchParams = useSearchParams()
    const initialTab = searchParams.get('tab') === 'webhooks' ? 'webhooks' : 'api'
    const [activeTab, setActiveTab] = useState<IntegrationTab>(initialTab)
    const [dialogState, setDialogState] = useState<WebhookDialogState>(null)
    const [newSecret, setNewSecret] = useState<string | null>(null)
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
                        <Button
                            className="h-10 w-fit rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                            onClick={() => setDialogState({ mode: 'create', webhook: null })}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Webhook
                        </Button>
                    )}
                </div>
                <IntegrationTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {isWebhooks ? (
                <WebhooksTabContent
                    dialogState={dialogState}
                    onOpenDialog={setDialogState}
                    newSecret={newSecret || null}
                    onSecretIssued={(secret) => setNewSecret(secret || null)}
                />
            ) : (
                <ApiTabContent />
            )}
        </div>
    )
}