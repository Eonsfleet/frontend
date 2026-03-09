'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Sparkles, ArrowRight, Zap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InsightItem {
    id: string
    type: 'optimization' | 'risk' | 'efficiency'
    title: string
    description: string
    impact: string
    actionLabel: string
}

const TYPE_CONFIG = {
    optimization: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    risk: { icon: Target, color: 'text-rose-500', bg: 'bg-rose-50' },
    efficiency: { icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-50' }
}

export function AIInsights({ insights = [] }: { insights?: InsightItem[] }) {
    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-full bg-slate-900 border-none">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    <CardTitle className="text-sm font-black text-white uppercase tracking-tight">AI Insights & suggestions</CardTitle>
                </div>
                <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Data-driven operational intelligence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {insights.length === 0 ? (
                    <div className="py-8 text-center bg-slate-800/50 rounded-2xl border border-slate-800">
                        <p className="text-xs font-bold text-slate-500 italic">Analyzing fleet patterns...</p>
                    </div>
                ) : (
                    insights.map((insight) => {
                        const config = TYPE_CONFIG[insight.type]
                        return (
                            <div key={insight.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/50 hover:border-blue-500/50 transition-all group">
                                <div className="flex gap-4">
                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", config.bg)}>
                                        <config.icon className={cn("h-5 w-5", config.color)} />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors uppercase tracking-tight leading-tight">{insight.title}</h4>
                                        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed font-medium">{insight.description}</p>

                                        <div className="mt-4 flex items-center justify-between gap-4">
                                            <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                                                Impact: {insight.impact}
                                            </div>
                                            <button className="flex items-center gap-1 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors">
                                                {insight.actionLabel}
                                                <ArrowRight className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}

                <button className="w-full mt-2 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-all">
                    View Comprehensive Analysis
                </button>
            </CardContent>
        </Card>
    )
}
