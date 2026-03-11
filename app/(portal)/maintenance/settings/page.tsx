'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWorkflowSettings, updateWorkflowSettings } from '@/lib/api/maintenance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ChevronLeft, Loader2, Save, ShieldCheck, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function MaintenanceSettingsPage() {
    const queryClient = useQueryClient()
    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['workflow-settings', 'maintenance'],
        queryFn: () => getWorkflowSettings('maintenance')
    })

    const { mutate: update, isPending } = useMutation({
        mutationFn: (data: any) => updateWorkflowSettings('maintenance', data),
        onSuccess: () => {
            toast.success('Settings updated successfully')
            queryClient.invalidateQueries({ queryKey: ['workflow-settings', 'maintenance'] })
        },
        onError: () => toast.error('Failed to update settings')
    })

    const settings = settingsData?.data?.settings

    const [form, setForm] = React.useState({
        finance_threshold_enabled: true,
        cost_threshold: 100000,
        minimum_approvals: 1,
        required_role: 'finance'
    })

    React.useEffect(() => {
        if (settings) {
            setForm({
                finance_threshold_enabled: settings.finance_threshold_enabled,
                cost_threshold: settings.cost_threshold,
                minimum_approvals: settings.minimum_approvals,
                required_role: settings.required_role
            })
        }
    }, [settings])

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading settings...</div>
    }

    return (
        <div className="p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Button variant="ghost" size="sm" asChild className="rounded-xl -ml-2">
                            <Link href="/maintenance/jobs">
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Back to Theater
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">
                        Workflow <span className="text-[#0055FF]">Settings</span>
                    </h1>
                    <p className="text-slate-400 font-bold italic text-[11px] uppercase tracking-widest flex items-center gap-2">
                        <span className="h-1 w-8 bg-[#0055FF] rounded-full" />
                        Configure Approvals & Thresholds
                    </p>
                </div>
                <Button 
                    onClick={() => update(form)} 
                    disabled={isPending}
                    className="bg-[#0055FF] hover:bg-blue-700 shadow-xl shadow-blue-100 rounded-2xl px-8 font-black uppercase text-[10px] tracking-widest h-12"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-50 rounded-2xl text-[#0055FF]">
                                    <DollarSign className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tight">Finance Authorization</CardTitle>
                                    <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Control spending thresholds</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-8">
                            <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                                <div className="space-y-1">
                                    <Label className="text-sm font-black uppercase text-slate-900">Enable Finance Routing</Label>
                                    <p className="text-[11px] text-slate-500 font-medium">Automatically route high-cost repairs to financial controllers.</p>
                                </div>
                                <Switch 
                                    checked={form.finance_threshold_enabled}
                                    onCheckedChange={(checked) => setForm(f => ({ ...f, finance_threshold_enabled: checked }))}
                                />
                            </div>

                            {form.finance_threshold_enabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cost Threshold (₦)</Label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₦</span>
                                            <Input 
                                                type="number"
                                                value={form.cost_threshold}
                                                onChange={(e) => setForm(f => ({ ...f, cost_threshold: parseFloat(e.target.value) }))}
                                                className="h-14 pl-12 rounded-[18px] border-slate-100 bg-slate-50 font-black text-sm px-6 focus:ring-[#0055FF]"
                                                placeholder="100,000"
                                            />
                                        </div>
                                        <p className="text-[10px] italic font-bold text-slate-400">Jobs above this amount will require Finance approval.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Approval Requirements</Label>
                                        <div className="h-14 flex items-center gap-4 px-6 bg-slate-50 border border-slate-100 rounded-[18px]">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black uppercase text-slate-900">{form.minimum_approvals} Approval Needed</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Role: {form.required_role}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white opacity-50 cursor-not-allowed">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black uppercase italic tracking-tight">Incident Escalation</CardTitle>
                                    <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Coming Soon</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 pt-4">
                            <p className="text-sm text-slate-400 italic">Advanced workflow rules for incident management are being finalized.</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card className="border-none shadow-xl shadow-blue-900/[0.02] rounded-[32px] overflow-hidden bg-slate-900 text-white p-8 relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0055FF]/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="relative z-10 space-y-6">
                            <div className="h-12 w-12 rounded-2xl bg-[#0055FF] flex items-center justify-center shadow-lg shadow-[#0055FF]/20">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter">Workflow Guard</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed tracking-wider">
                                    Ensuring organizational compliance through automated gatekeeping.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-white/5">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#0055FF]">
                                    <span>Status</span>
                                    <span>Active</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
