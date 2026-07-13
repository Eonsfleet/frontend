'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    Search,
    SlidersHorizontal,
    Calendar,
    Download,
    Settings,
    Bell,
    AlertTriangle,
    Info,
    Sparkles,
    MapPin,
    Clock,
    Compass,
    Route,
    Gauge,
    X,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Check,
    RotateCcw,
    Play,
    Tv,
    Terminal,
    MoreHorizontal,
    Filter,
    ChevronDown,
    Plus,
    Upload,
    ArrowUpRight,
    Trash2,
    CheckCircle2,
    Eye,
    Pencil,
    GripVertical
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'

interface AlertRule {
    id: string
    name: string
    description: string
    category: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    status: 'active' | 'inactive'
    appliesTo: string
    appliesToCount: number
    conditions: {
        parameter: string
        operator: string
        value: string
        unit: string
        duration: string
        durationUnit: string
    }
    channels: {
        inApp: boolean
        email: boolean
        sms: boolean
        push: boolean
    }
    escalationMinutes: string
}

const INITIAL_RULES: AlertRule[] = [
    {
        id: '1',
        name: 'Overspeed Alert',
        description: 'Speed exceeds the defined limit.',
        category: 'Safety & Driving',
        severity: 'critical',
        status: 'active',
        appliesTo: 'All Vehicles',
        appliesToCount: 32,
        conditions: {
            parameter: 'Speed',
            operator: 'Greater than',
            value: '80',
            unit: 'km/h',
            duration: '10',
            durationUnit: 'Seconds'
        },
        channels: { inApp: true, email: true, sms: false, push: true },
        escalationMinutes: '15 Minutes'
    },
    {
        id: '2',
        name: 'Harsh Braking',
        description: 'Hard braking detected.',
        category: 'Safety & Driving',
        severity: 'high',
        status: 'active',
        appliesTo: 'All Vehicles',
        appliesToCount: 32,
        conditions: {
            parameter: 'Deceleration',
            operator: 'Greater than',
            value: '4.2',
            unit: 'm/s²',
            duration: '0',
            durationUnit: 'Seconds'
        },
        channels: { inApp: true, email: false, sms: false, push: true },
        escalationMinutes: '15 Minutes'
    },
    {
        id: '3',
        name: 'Geofence Exit',
        description: 'Vehicle exits a geofence.',
        category: 'Geofence',
        severity: 'high',
        status: 'active',
        appliesTo: 'Specific Vehicles',
        appliesToCount: 28,
        conditions: {
            parameter: 'Geofence Ojota',
            operator: 'Exits',
            value: 'Ojota Warehouse',
            unit: '',
            duration: '0',
            durationUnit: 'Seconds'
        },
        channels: { inApp: true, email: true, sms: true, push: true },
        escalationMinutes: '30 Minutes'
    },
    {
        id: '4',
        name: 'Low Fuel',
        description: 'Fuel level goes below threshold.',
        category: 'Fuel & Energy',
        severity: 'medium',
        status: 'active',
        appliesTo: 'All Vehicles',
        appliesToCount: 32,
        conditions: {
            parameter: 'Fuel Level',
            operator: 'Less than',
            value: '15',
            unit: '%',
            duration: '5',
            durationUnit: 'Minutes'
        },
        channels: { inApp: true, email: true, sms: false, push: false },
        escalationMinutes: '30 Minutes'
    },
    {
        id: '5',
        name: 'Ignition Off',
        description: 'Ignition turned off.',
        category: 'Vehicle Status',
        severity: 'medium',
        status: 'active',
        appliesTo: 'All Vehicles',
        appliesToCount: 32,
        conditions: {
            parameter: 'Engine Status',
            operator: 'Equals',
            value: 'OFF',
            unit: '',
            duration: '0',
            durationUnit: 'Seconds'
        },
        channels: { inApp: true, email: false, sms: false, push: false },
        escalationMinutes: '15 Minutes'
    },
    {
        id: '6',
        name: 'Device Offline',
        description: 'Device not reporting data.',
        category: 'Device & Connectivity',
        severity: 'high',
        status: 'active',
        appliesTo: 'All Devices',
        appliesToCount: 32,
        conditions: {
            parameter: 'Connection Status',
            operator: 'Offline for',
            value: '5',
            unit: 'min',
            duration: '5',
            durationUnit: 'Minutes'
        },
        channels: { inApp: true, email: true, sms: false, push: true },
        escalationMinutes: '45 Minutes'
    },
    {
        id: '7',
        name: 'Battery Disconnected',
        description: 'Device battery disconnected.',
        category: 'Device & Connectivity',
        severity: 'critical',
        status: 'active',
        appliesTo: 'All Devices',
        appliesToCount: 32,
        conditions: {
            parameter: 'Main Battery Status',
            operator: 'Equals',
            value: 'Disconnected',
            unit: '',
            duration: '0',
            durationUnit: 'Seconds'
        },
        channels: { inApp: true, email: true, sms: true, push: true },
        escalationMinutes: '10 Minutes'
    },
    {
        id: '8',
        name: 'Excessive Idling',
        description: 'Engine idling beyond limit.',
        category: 'Driver Behaviour',
        severity: 'medium',
        status: 'active',
        appliesTo: 'All Vehicles',
        appliesToCount: 32,
        conditions: {
            parameter: 'Idling Duration',
            operator: 'Greater than',
            value: '15',
            unit: 'mins',
            duration: '15',
            durationUnit: 'Minutes'
        },
        channels: { inApp: true, email: false, sms: false, push: false },
        escalationMinutes: '60 Minutes'
    }
]

const CATEGORIES = [
    { name: 'All Categories', count: 32 },
    { name: 'Safety & Driving', count: 12 },
    { name: 'Vehicle Status', count: 8 },
    { name: 'Geofence', count: 6 },
    { name: 'Fuel & Energy', count: 4 },
    { name: 'Device & Connectivity', count: 4 },
    { name: 'Driver Behaviour', count: 5 },
    { name: 'AI & Anomaly', count: 3 }
]

export default function ConfigurePage() {
    const router = useRouter()
    const { user } = useAuthStore()

    // Interactive Alert Rules State
    const [rules, setRules] = useState<AlertRule[]>(INITIAL_RULES)
    const [selectedRuleId, setSelectedRuleId] = useState<string>('1')
    const [selectedCategory, setSelectedCategory] = useState<string>('All Categories')
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    // Form Editor State
    const [editorForm, setEditorForm] = useState<AlertRule>(INITIAL_RULES[0])

    const selectedRule = useMemo(() => {
        return rules.find(r => r.id === selectedRuleId) || rules[0]
    }, [rules, selectedRuleId])

    // Update editor form when selected rule changes
    React.useEffect(() => {
        if (selectedRule) {
            setEditorForm(JSON.parse(JSON.stringify(selectedRule)))
        }
    }, [selectedRule])

    // Filter rules
    const filteredRules = useMemo(() => {
        return rules.filter(r => {
            // Category filter
            if (selectedCategory !== 'All Categories' && r.category !== selectedCategory) return false

            // Status filter
            if (statusFilter !== 'all' && r.status !== statusFilter) return false

            // Search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase()
                return (
                    r.name.toLowerCase().includes(query) ||
                    r.description.toLowerCase().includes(query) ||
                    r.category.toLowerCase().includes(query)
                )
            }

            return true
        })
    }, [rules, selectedCategory, statusFilter, searchQuery])

    // Paginate rules
    const paginatedRules = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return filteredRules.slice(startIndex, startIndex + itemsPerPage)
    }, [filteredRules, currentPage])

    const totalPages = Math.ceil(filteredRules.length / itemsPerPage)

    // Save configuration updates
    const handleSaveChanges = () => {
        setRules(prev => prev.map(r => r.id === editorForm.id ? editorForm : r))
        toast.success(`Configuration for "${editorForm.name}" updated successfully`)
    }

    // Toggle rule status in list
    const handleToggleStatus = (id: string, current: 'active' | 'inactive') => {
        const nextStatus = current === 'active' ? 'inactive' : 'active'
        setRules(prev => prev.map(r => r.id === id ? { ...r, status: nextStatus } : r))
        
        if (editorForm.id === id) {
            setEditorForm(prev => ({ ...prev, status: nextStatus }))
        }
        
        toast.success(`Rule turned ${nextStatus === 'active' ? 'ON' : 'OFF'}`)
    }

    // Delete rule
    const handleDeleteRule = (id: string) => {
        setRules(prev => prev.filter(r => r.id !== id))
        toast.success("Alert rule deleted successfully")
        
        // Select another rule
        const remaining = rules.filter(r => r.id !== id)
        if (remaining.length > 0) {
            setSelectedRuleId(remaining[0].id)
        }
    }

    // Create New Custom Alert
    const handleCreateCustomAlert = () => {
        const newId = String(rules.length + 1)
        const newRule: AlertRule = {
            id: newId,
            name: 'New Custom Alert',
            description: 'Monitor customized fleet behavior.',
            category: 'Safety & Driving',
            severity: 'medium',
            status: 'active',
            appliesTo: 'All Vehicles',
            appliesToCount: 32,
            conditions: {
                parameter: 'Speed',
                operator: 'Greater than',
                value: '100',
                unit: 'km/h',
                duration: '5',
                durationUnit: 'Seconds'
            },
            channels: { inApp: true, email: true, sms: false, push: false },
            escalationMinutes: '15 Minutes'
        }

        setRules(prev => [...prev, newRule])
        setSelectedRuleId(newId)
        toast.success("New custom alert rule created")
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
            {/* Top Navigation Header */}
            <header className="h-16 flex items-center justify-between border-b bg-white px-6 shrink-0 z-10">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span 
                            onClick={() => router.push('/alerts')}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                        >
                            Alerts
                        </span>
                        <span className="text-xs text-slate-300">/</span>
                        <span className="text-xs font-bold text-slate-800">Alerts Configuration</span>
                    </div>
                    <h1 className="text-base font-black text-slate-800 leading-tight">Alerts Configuration</h1>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-xl mx-8 relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search vehicles, locations, thresholds..."
                        className="w-full pl-10 pr-4 h-10 bg-slate-50 border-slate-200 focus:bg-white rounded-xl text-sm"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1)
                        }}
                    />
                </div>

                {/* Right Top Header Profile */}
                <div className="flex items-center gap-3">
                    <button className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors">
                        <Bell className="w-5 h-5 text-slate-600" />
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white">12</span>
                    </button>
                    
                    <div className="flex items-center gap-3 pl-1 border-l border-slate-200">
                        <div className="h-9 w-9 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm shrink-0">
                            <img
                                className="h-full w-full object-cover"
                                src={user?.attributes?.avatar ?? "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                                alt="User avatar"
                            />
                        </div>
                        <div className="hidden lg:block text-left shrink-0">
                            <p className="text-xs font-black text-slate-900 leading-tight">Idris Okafor</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Fleet Manager</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Config Nav Tabs Bar */}
            <div className="border-b bg-white px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex gap-6">
                    {(['Alert Rules', 'Notification Settings', 'Escalation Rules', 'Quiet Hours', 'Users & Roles']).map((tab) => (
                        <button
                            key={tab}
                            className={`pb-1 font-bold text-xs uppercase tracking-wider relative transition-colors ${tab === 'Alert Rules' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
                        >
                            {tab}
                            {tab === 'Alert Rules' && (
                                <div className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="border-slate-200 text-slate-600 rounded-xl gap-2 font-semibold h-10 shadow-sm">
                        <Upload className="w-4 h-4" />
                        Import Configuration
                    </Button>
                    <Button 
                        onClick={handleCreateCustomAlert}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 font-semibold h-10 shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Create Custom Alert
                    </Button>
                </div>
            </div>

            {/* Three-Column Workspace Layout */}
            <main className="flex-1 flex overflow-hidden min-h-0 bg-slate-50 p-6 gap-6">
                
                {/* Column 1: Categories (Left) */}
                <div className="w-[18%] flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
                    {/* Categories card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-2 mb-2 block">Categories</span>
                        <div className="space-y-1">
                            {CATEGORIES.map((cat) => {
                                const isSelected = selectedCategory === cat.name
                                return (
                                    <button
                                        key={cat.name}
                                        onClick={() => {
                                            setSelectedCategory(cat.name)
                                            setCurrentPage(1)
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all font-semibold text-xs text-left ${isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <span>{cat.name}</span>
                                        <Badge className={`border-none rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {cat.count}
                                        </Badge>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Help card */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
                        <span className="text-[11px] font-black text-blue-900 leading-none">Need help setting up alerts?</span>
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                            Learn how to configure alert thresholds, geofencing rules and notification rules effectively.
                        </p>
                        <button className="flex items-center justify-between text-[10px] font-black text-blue-600 hover:text-blue-700 bg-white border border-blue-100 rounded-xl px-3 py-2 shadow-sm transition-all cursor-pointer">
                            <span>View Help Guide</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                    </div>
                </div>

                {/* Column 2: Alert Rules Table (Middle) */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                    
                    {/* Filter controls */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 gap-4">
                        <div className="relative flex-grow max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search alert rules..."
                                className="w-full pl-9 pr-3 h-8.5 bg-slate-50 border-slate-200 focus:bg-white rounded-lg text-xs"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setCurrentPage(1)
                                }}
                            />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 select-none">
                            <span>Status:</span>
                            <select 
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as any)
                                    setCurrentPage(1)
                                }}
                                className="bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="flex-grow overflow-y-auto">
                        <table className="w-full text-left border-collapse font-sans">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider sticky top-0 shrink-0">
                                <tr>
                                    <th className="w-8 py-3.5 pl-4 text-center"></th>
                                    <th className="py-3.5">Alert Name</th>
                                    <th className="py-3.5">Category</th>
                                    <th className="py-3.5 text-center">Severity</th>
                                    <th className="py-3.5 text-center">Status</th>
                                    <th className="py-3.5">Applies To</th>
                                    <th className="w-16 py-3.5 pr-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedRules.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center p-4">
                                                <CircleAlert className="w-8 h-8 text-slate-300 mb-2" />
                                                <p className="text-xs font-bold text-slate-600">No alert rules found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRules.map((rule) => {
                                        const isSelected = rule.id === selectedRuleId
                                        return (
                                            <tr
                                                key={rule.id}
                                                onClick={() => setSelectedRuleId(rule.id)}
                                                className={`cursor-pointer hover:bg-slate-50/40 transition-colors ${isSelected ? 'bg-blue-50/20' : ''}`}
                                            >
                                                <td className="py-3 pl-4 text-center">
                                                    <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-grab" />
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rule.severity === 'critical' ? 'bg-red-50 text-red-600' : rule.severity === 'high' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'}`}>
                                                            {rule.category === 'Safety & Driving' ? (
                                                                <Gauge className="w-4 h-4" />
                                                            ) : rule.category === 'Geofence' ? (
                                                                <MapPin className="w-4 h-4" />
                                                            ) : rule.category === 'Fuel & Energy' ? (
                                                                <SlidersHorizontal className="w-4 h-4" />
                                                            ) : (
                                                                <AlertTriangle className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black text-slate-800 leading-snug">{rule.name}</div>
                                                            <div className="text-[10px] text-slate-400 font-semibold">{rule.description}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-xs font-bold text-slate-500">{rule.category}</td>
                                                <td className="py-3 text-center">
                                                    <Badge className={`border-none rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                                                        rule.severity === 'critical' ? 'bg-red-100 text-red-700' : rule.severity === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {rule.severity}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleToggleStatus(rule.id, rule.status)}
                                                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer inline-flex items-center ${rule.status === 'active' ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${rule.status === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </td>
                                                <td className="py-3 text-xs font-bold text-slate-600">{rule.appliesTo} ({rule.appliesToCount} Vehicles)</td>
                                                <td className="py-3 text-center pr-4">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedRuleId(rule.id); }}
                                                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                                                            className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer */}
                    <div className="border-t border-slate-100 p-4 flex items-center justify-between shrink-0 bg-white">
                        <span className="text-[11px] font-semibold text-slate-500">
                            Showing {filteredRules.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredRules.length)} of {filteredRules.length} alert rules
                        </span>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            {[...Array(totalPages)].map((_, idx) => (
                                <Button
                                    key={idx}
                                    variant={currentPage === idx + 1 ? 'default' : 'outline'}
                                    className={`h-8 w-8 rounded-lg text-xs font-bold ${currentPage === idx + 1 ? 'bg-blue-600 text-white' : ''}`}
                                    onClick={() => setCurrentPage(idx + 1)}
                                >
                                    {idx + 1}
                                </Button>
                            ))}
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                disabled={currentPage === totalPages || totalPages === 0}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Column 3: Rule Editor Form (Right) */}
                <div className="w-[30%] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden shrink-0">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="font-black text-sm text-slate-800 leading-tight">{editorForm.name}</h3>
                            <span className="text-[10px] text-slate-400 font-semibold">{editorForm.category}</span>
                        </div>
                        <button
                            onClick={() => {
                                const nextStatus = editorForm.status === 'active' ? 'inactive' : 'active'
                                setEditorForm(prev => ({ ...prev, status: nextStatus }))
                            }}
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer inline-flex items-center shrink-0 ${editorForm.status === 'active' ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${editorForm.status === 'active' ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {/* Editor Fields Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                        
                        {/* Name & description */}
                        <div className="space-y-3">
                            <div>
                                <label className="font-bold text-slate-500 block mb-1">Alert Rule Name</label>
                                <Input
                                    type="text"
                                    className="h-9 border-slate-200 rounded-lg text-xs"
                                    value={editorForm.name}
                                    onChange={(e) => setEditorForm({ ...editorForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-500 block mb-1">Description</label>
                                <Input
                                    type="text"
                                    className="h-9 border-slate-200 rounded-lg text-xs"
                                    value={editorForm.description}
                                    onChange={(e) => setEditorForm({ ...editorForm, description: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Category & severity */}
                        <div className="grid grid-cols-2 gap-3.5">
                            <div>
                                <label className="font-bold text-slate-500 block mb-1">Category</label>
                                <select
                                    value={editorForm.category}
                                    onChange={(e) => setEditorForm({ ...editorForm, category: e.target.value })}
                                    className="w-full h-9 border border-slate-200 rounded-lg bg-white px-2.5 text-xs text-slate-700 focus:outline-none"
                                >
                                    <option value="Safety & Driving">Safety & Driving</option>
                                    <option value="Vehicle Status">Vehicle Status</option>
                                    <option value="Geofence">Geofence</option>
                                    <option value="Fuel & Energy">Fuel & Energy</option>
                                    <option value="Device & Connectivity">Device & Connectivity</option>
                                    <option value="Driver Behaviour">Driver Behaviour</option>
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-500 block mb-1">Severity</label>
                                <select
                                    value={editorForm.severity}
                                    onChange={(e) => setEditorForm({ ...editorForm, severity: e.target.value as any })}
                                    className="w-full h-9 border border-slate-200 rounded-lg bg-white px-2.5 text-xs text-slate-700 focus:outline-none"
                                >
                                    <option value="critical">🔴 Critical</option>
                                    <option value="high">🟠 High</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="low">🔵 Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Conditions builder */}
                        <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                            <span className="font-black text-slate-800 text-[11px] block uppercase tracking-tight">Conditions</span>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-400 block mb-1">When</label>
                                    <select
                                        value={editorForm.conditions.parameter}
                                        onChange={(e) => setEditorForm({
                                            ...editorForm,
                                            conditions: { ...editorForm.conditions, parameter: e.target.value }
                                        })}
                                        className="w-full h-8.5 border border-slate-200 rounded-lg bg-white px-2 text-xs text-slate-700 focus:outline-none"
                                    >
                                        <option value="Speed">Speed</option>
                                        <option value="Deceleration">Deceleration</option>
                                        <option value="Fuel Level">Fuel Level</option>
                                        <option value="Engine Status">Engine Status</option>
                                        <option value="Connection Status">Connection Status</option>
                                        <option value="Idling Duration">Idling Duration</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-400 block mb-1">Operator</label>
                                    <select
                                        value={editorForm.conditions.operator}
                                        onChange={(e) => setEditorForm({
                                            ...editorForm,
                                            conditions: { ...editorForm.conditions, operator: e.target.value }
                                        })}
                                        className="w-full h-8.5 border border-slate-200 rounded-lg bg-white px-2 text-xs text-slate-700 focus:outline-none"
                                    >
                                        <option value="Greater than">Greater than</option>
                                        <option value="Less than">Less than</option>
                                        <option value="Equals">Equals</option>
                                        <option value="Exits">Exits</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-400 block mb-1">Value</label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            className="h-8.5 border-slate-200 rounded-lg text-xs pr-12"
                                            value={editorForm.conditions.value}
                                            onChange={(e) => setEditorForm({
                                                ...editorForm,
                                                conditions: { ...editorForm.conditions, value: e.target.value }
                                            })}
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                            {editorForm.conditions.unit}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-400 block mb-1">For more than</label>
                                    <div className="flex gap-1">
                                        <Input
                                            type="text"
                                            className="h-8.5 border-slate-200 rounded-lg text-xs flex-1"
                                            value={editorForm.conditions.duration}
                                            onChange={(e) => setEditorForm({
                                                ...editorForm,
                                                conditions: { ...editorForm.conditions, duration: e.target.value }
                                            })}
                                        />
                                        <select
                                            value={editorForm.conditions.durationUnit}
                                            onChange={(e) => setEditorForm({
                                                ...editorForm,
                                                conditions: { ...editorForm.conditions, durationUnit: e.target.value }
                                            })}
                                            className="w-[70px] h-8.5 border border-slate-200 bg-white rounded-lg px-1 text-[10px] text-slate-700 focus:outline-none shrink-0"
                                        >
                                            <option value="Seconds">Secs</option>
                                            <option value="Minutes">Mins</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Applies to vehicles */}
                        <div className="space-y-2">
                            <span className="font-bold text-slate-500 block">Applies To</span>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-1.5 font-semibold text-slate-600 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="appliesTo" 
                                        checked={editorForm.appliesTo === 'All Vehicles'}
                                        onChange={() => setEditorForm({ ...editorForm, appliesTo: 'All Vehicles', appliesToCount: 32 })}
                                        className="text-blue-600 focus:ring-0" 
                                    />
                                    <span>All Vehicles</span>
                                </label>
                                <label className="flex items-center gap-1.5 font-semibold text-slate-600 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="appliesTo"
                                        checked={editorForm.appliesTo === 'Specific Vehicles'}
                                        onChange={() => setEditorForm({ ...editorForm, appliesTo: 'Specific Vehicles', appliesToCount: 28 })}
                                        className="text-blue-600 focus:ring-0" 
                                    />
                                    <span>Specific</span>
                                </label>
                                <label className="flex items-center gap-1.5 font-semibold text-slate-600 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="appliesTo"
                                        checked={editorForm.appliesTo === 'All Devices'}
                                        onChange={() => setEditorForm({ ...editorForm, appliesTo: 'All Devices', appliesToCount: 32 })}
                                        className="text-blue-600 focus:ring-0" 
                                    />
                                    <span>Devices</span>
                                </label>
                            </div>
                        </div>

                        {/* Notification Channels */}
                        <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 space-y-3">
                            <span className="font-black text-slate-800 text-[11px] block uppercase tracking-tight">Notification Channels</span>
                            
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-semibold text-slate-600">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editorForm.channels.inApp}
                                        onChange={(e) => setEditorForm({
                                            ...editorForm,
                                            channels: { ...editorForm.channels, inApp: e.target.checked }
                                        })}
                                        className="rounded text-blue-600 focus:ring-0"
                                    />
                                    <span>In-app</span>
                                </label>
                                
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editorForm.channels.email}
                                        onChange={(e) => setEditorForm({
                                            ...editorForm,
                                            channels: { ...editorForm.channels, email: e.target.checked }
                                        })}
                                        className="rounded text-blue-600 focus:ring-0"
                                    />
                                    <span>Email</span>
                                </label>
                                
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editorForm.channels.sms}
                                        onChange={(e) => setEditorForm({
                                            ...editorForm,
                                            channels: { ...editorForm.channels, sms: e.target.checked }
                                        })}
                                        className="rounded text-blue-600 focus:ring-0"
                                    />
                                    <span>SMS</span>
                                </label>
                                
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editorForm.channels.push}
                                        onChange={(e) => setEditorForm({
                                            ...editorForm,
                                            channels: { ...editorForm.channels, push: e.target.checked }
                                        })}
                                        className="rounded text-blue-600 focus:ring-0"
                                    />
                                    <span>Push Notifications</span>
                                </label>
                            </div>

                            <div className="pt-2">
                                <label className="font-bold text-slate-500 block mb-1">Escalate if not acknowledged in</label>
                                <select
                                    value={editorForm.escalationMinutes}
                                    onChange={(e) => setEditorForm({ ...editorForm, escalationMinutes: e.target.value })}
                                    className="w-full h-8.5 border border-slate-200 rounded-lg bg-white px-2 text-xs text-slate-700 focus:outline-none"
                                >
                                    <option value="10 Minutes">10 Minutes</option>
                                    <option value="15 Minutes">15 Minutes</option>
                                    <option value="30 Minutes">30 Minutes</option>
                                    <option value="45 Minutes">45 Minutes</option>
                                    <option value="60 Minutes">60 Minutes</option>
                                </select>
                            </div>
                        </div>

                        {/* Status notification */}
                        <div className="flex items-start gap-2 bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-100 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-black">Active:</span> Alert rule is active and will trigger notifications.
                            </div>
                        </div>

                    </div>

                    {/* Actions Panel Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 shrink-0">
                        <Button 
                            variant="outline"
                            onClick={() => setEditorForm(JSON.parse(JSON.stringify(selectedRule)))}
                            className="flex-1 h-9 rounded-lg font-bold border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleDeleteRule(editorForm.id)}
                            className="h-9 w-9 p-0 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                            title="Delete Rule"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button 
                            onClick={handleSaveChanges}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 rounded-lg text-xs"
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>

            </main>
        </div>
    )
}
