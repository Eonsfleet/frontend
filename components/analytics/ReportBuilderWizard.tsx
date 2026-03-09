'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileText, CheckCircle2, ChevronRight, ChevronLeft, Calendar, BarChart3, Users } from 'lucide-react'

// Note: Using a custom modal layout since I'm not sure if the UI Dialog is fully exported/available
export function ReportBuilderWizard({
    isOpen,
    onClose
}: {
    isOpen: boolean
    onClose: () => void
}) {
    const [step, setStep] = useState(1)
    const [reportType, setReportType] = useState('')

    if (!isOpen) return null

    const steps = [
        { id: 1, label: 'Type', icon: FileText },
        { id: 2, label: 'Scope', icon: Users },
        { id: 3, label: 'Metrics', icon: BarChart3 },
        { id: 4, label: 'Delivery', icon: Calendar },
    ]

    const reportTypes = [
        { id: 'fuel', title: 'Fuel Analysis', desc: 'Consumption, theft detection, and cost/km', icon: '⛽' },
        { id: 'maint', title: 'Maintenance Forecast', desc: 'Upcoming services and parts availability', icon: '🔧' },
        { id: 'driver', title: 'Driver Performance', desc: 'Safety scores, harsh braking, and idle time', icon: '👤' },
        { id: 'util', title: 'Fleet Utilization', desc: 'Distance, time-in-motion, and efficiency', icon: '📊' },
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                            Create <span className="text-blue-600">Custom</span> Report
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Step {step} of 4 • Report Builder Wizard
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Progress Stepper */}
                <div className="px-8 py-6 bg-slate-50/50 flex items-center justify-between border-b border-slate-100">
                    {steps.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <div className="flex flex-col items-center gap-2">
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                                    step >= s.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-white text-slate-300 border border-slate-200"
                                )}>
                                    {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest",
                                    step >= s.id ? "text-blue-600" : "text-slate-400"
                                )}>{s.label}</span>
                            </div>
                            {i < steps.length - 1 && (
                                <div className={cn(
                                    "h-[2px] flex-1 mx-2 rounded-full",
                                    step > s.id ? "bg-blue-600" : "bg-slate-200"
                                )} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {step === 1 && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Choose Report Type</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {reportTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => {
                                            setReportType(type.id)
                                            setStep(2)
                                        }}
                                        className={cn(
                                            "flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-left group",
                                            reportType === type.id ? "border-blue-600 bg-blue-50/50" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                                        )}
                                    >
                                        <span className="text-2xl mb-3">{type.icon}</span>
                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{type.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{type.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Define Scope</h3>
                            <div className="space-y-3">
                                <label className="flex items-center p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input type="radio" name="scope" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" defaultChecked />
                                    <div className="ml-4">
                                        <div className="text-sm font-bold text-slate-900">Entire Fleet</div>
                                        <div className="text-xs text-slate-500 font-medium">Include data for all 124 vehicles</div>
                                    </div>
                                </label>
                                <label className="flex items-center p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input type="radio" name="scope" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                                    <div className="ml-4">
                                        <div className="text-sm font-bold text-slate-900">Specific Cluster</div>
                                        <div className="text-xs text-slate-500 font-medium">Select by Lagos, Abuja, or Port Harcourt regions</div>
                                    </div>
                                </label>
                                <label className="flex items-center p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input type="radio" name="scope" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300" />
                                    <div className="ml-4">
                                        <div className="text-sm font-bold text-slate-900">Individual Assets</div>
                                        <div className="text-xs text-slate-500 font-medium">Pick specific registration numbers</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    {step > 2 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Almost There!</h3>
                            <p className="text-sm text-slate-500 mt-2 max-w-sm">This step would involve complex metric selections and delivery schedules.</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            step === 1 ? "text-slate-300" : "text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </button>
                    <button
                        onClick={() => {
                            if (step === 4) onClose()
                            else setStep(s => Math.min(4, s + 1))
                        }}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all"
                    >
                        {step === 4 ? 'Generate Report' : 'Continue'}
                        {step < 4 && <ChevronRight className="h-4 w-4" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
