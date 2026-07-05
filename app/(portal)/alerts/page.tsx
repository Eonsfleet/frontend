'use client'

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
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
    Terminal,
    MoreHorizontal,
    ChevronDown,
    ArrowUpRight,
    CheckCircle2,
    Edit2,
    Eye
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { AlertItem } from './AlertsMap'
import TopHeader from '@/components/layout/TopHeader'
import Toolbar from '@/components/alerts/Toolbar'
import KpiCard from '@/components/alerts/KpiCard'

const AlertsMap = dynamic(
    () => import('./AlertsMap'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-xl">
                <span className="text-sm font-medium text-slate-400">Loading Map...</span>
            </div>
        )
    }
)

const AlertMiniMap = dynamic(
    () => import('./AlertMiniMap'),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center rounded-lg">
                <span className="text-[10px] font-medium text-slate-400">Loading Map...</span>
            </div>
        )
    }
)

const SEVERITY_COLORS: Record<string, string> = {
    critical: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
}

const SEVERITY_BG: Record<string, string> = {
    critical: '#fef2f2',
    warning: '#fffbeb',
    info: '#eff6ff',
}

interface RichAlertItem extends AlertItem {
    ackBy?: string
    ackByInitials?: string
    ackRole?: string
    ackAt?: string
    ackNote?: string
    resBy?: string
    resAt?: string
    resNote?: string
    beforeSpeed?: string
    afterSpeed?: string
    relatedAlert?: string
}

const generateMockAlerts = (): RichAlertItem[] => {
    const alerts: RichAlertItem[] = [
        {
            id: '1',
            title: 'Overspeed Alert',
            vehicleName: 'Toyota Hilux',
            vehiclePlate: 'ABC-123-XD',
            severity: 'critical',
            time: '10:47 AM',
            relativeTime: '2 mins ago',
            status: 'active',
            locationName: 'Ikeja, Lagos, Nigeria',
            lat: 6.5920,
            lng: 3.3420,
            ackBy: 'You',
            ackByInitials: 'YO',
            ackRole: 'Fleet Manager',
            ackAt: 'May 20, 2024 10:48 AM',
            ackNote: 'Noted. Driver has been cautioned.',
            resBy: 'You',
            resAt: 'May 20, 2024 10:50 AM',
            resNote: 'Driver decelerated and resumed normal speed limits after verbal caution via terminal. Resolved.',
            beforeSpeed: '98 km/h',
            afterSpeed: '58 km/h',
            relatedAlert: 'Low Fuel Alert (May 20, 2024 10:32 AM)',
            details: {
                speed: 98,
                speedLimit: 60,
                overspeedAmount: '38 km/h',
                overspeedPercent: '63%',
                duration: '2 mins 14 secs',
                distance: '3.2 km',
                direction: 'NE 45°',
                driverName: 'John Doe',
                fleetName: 'Lagos Operations',
                status: 'Moving',
                imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=300'
            },
            timeline: [
                { time: '10:47 AM', title: 'Overspeed started', description: 'Speed: 98 km/h' },
                { time: '10:47 AM', title: 'Speed limit exceeded (60 km/h)' },
                { time: '10:49 AM', title: 'Overspeed ended', description: 'Duration: 2 mins 14 secs, Max Speed: 101 km/h' }
            ]
        },
        {
            id: '2',
            title: 'Geofence Exit',
            vehicleName: 'Iveco Truck',
            vehiclePlate: 'KJA-334-LM',
            severity: 'warning',
            time: '10:43 AM',
            relativeTime: '6 mins ago',
            status: 'active',
            locationName: 'Ojota, Lagos, Nigeria',
            lat: 6.5772,
            lng: 3.3752,
            ackBy: 'You',
            ackByInitials: 'YO',
            ackRole: 'Fleet Manager',
            ackAt: 'May 20, 2024 10:45 AM',
            ackNote: 'Noted exit Ojota boundary.',
            resBy: 'You',
            resAt: 'May 20, 2024 10:46 AM',
            resNote: 'Vehicle exited Ojota Zone on route to mainland warehouse. Expected exit.',
            beforeSpeed: '42 km/h',
            afterSpeed: '45 km/h',
            details: {
                duration: '12 mins',
                driverName: 'Emma Alao',
                fleetName: 'Lagos Operations',
                status: 'Moving',
                imageUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=300'
            },
            timeline: [
                { time: '10:43 AM', title: 'Geofence exit detected', description: 'Exited Ojota Warehouse Boundary' }
            ]
        },
        {
            id: '3',
            title: 'Harsh Braking',
            vehicleName: 'Bus 21',
            vehiclePlate: 'KJA-21-BUS',
            severity: 'warning',
            time: '10:38 AM',
            relativeTime: '11 mins ago',
            status: 'active',
            locationName: 'Yaba, Lagos, Nigeria',
            lat: 6.5164,
            lng: 3.3792,
            ackBy: 'Uche E.',
            ackByInitials: 'UE',
            ackRole: 'Dispatcher',
            ackAt: 'May 20, 2024 10:39 AM',
            ackNote: 'Driver reported sudden hazard avoidance.',
            resBy: 'Uche E.',
            resAt: 'May 20, 2024 10:42 AM',
            resNote: 'Sudden deceleration caused by pedestrian lane breach. Corrective driver action verified.',
            details: {
                speed: 45,
                duration: '3 secs',
                driverName: 'Chidi Okafor',
                fleetName: 'Shuttle Service',
                status: 'Moving'
            },
            timeline: [
                { time: '10:38 AM', title: 'Deceleration limit breached', description: 'Rate of -4.2 m/s² detected' }
            ]
        },
        {
            id: '4',
            title: 'Low Fuel',
            vehicleName: 'Van 18',
            vehiclePlate: 'KRO-18-VD',
            severity: 'info',
            time: '10:32 AM',
            relativeTime: '17 mins ago',
            status: 'active',
            locationName: 'Apapa, Lagos, Nigeria',
            lat: 6.4444,
            lng: 3.3692,
            ackBy: 'You',
            ackByInitials: 'YO',
            ackRole: 'Fleet Manager',
            ackAt: 'May 20, 2024 10:33 AM',
            ackNote: 'Instructed to route to nearest partner station.',
            resBy: 'You',
            resAt: 'May 20, 2024 10:45 AM',
            resNote: 'Driver refueled 45L at Apapa service portal.',
            details: {
                driverName: 'Babajide Cole',
                fleetName: 'Delivery Fleet',
                status: 'Idle'
            },
            timeline: [
                { time: '10:32 AM', title: 'Fuel drops below threshold', description: 'Remaining level: 12%' }
            ]
        },
        {
            id: '5',
            title: 'Ignition Off',
            vehicleName: 'Pickup 12',
            vehiclePlate: 'LSD-12-PK',
            severity: 'info',
            time: '10:30 AM',
            relativeTime: '19 mins ago',
            status: 'active',
            locationName: 'Surulere, Lagos, Nigeria',
            lat: 6.4944,
            lng: 3.3592,
            ackBy: 'Chinedu A.',
            ackByInitials: 'CA',
            ackRole: 'Shift Supervisor',
            ackAt: 'May 20, 2024 10:31 AM',
            ackNote: 'Scheduled maintenance drop-off confirmation.',
            resBy: 'Chinedu A.',
            resAt: 'May 20, 2024 10:35 AM',
            resNote: 'Parked in Surulere depot. Driver shift logged off.',
            details: {
                driverName: 'Sunday Udo',
                fleetName: 'Lagos Operations',
                status: 'Parked'
            },
            timeline: [
                { time: '10:30 AM', title: 'Engine Ignition turned OFF' }
            ]
        },
        {
            id: '6',
            title: 'Battery Disconnected',
            vehicleName: 'Trailer 3',
            vehiclePlate: 'KJA-03-TL',
            severity: 'critical',
            time: '10:28 AM',
            relativeTime: '21 mins ago',
            status: 'active',
            locationName: 'Ikeja, Lagos, Nigeria',
            lat: 6.6120,
            lng: 3.3520,
            ackBy: 'You',
            ackByInitials: 'YO',
            ackRole: 'Fleet Manager',
            ackAt: 'May 20, 2024 10:29 AM',
            ackNote: 'Investigating power loss.',
            resBy: 'You',
            resAt: 'May 20, 2024 10:45 AM',
            resNote: 'Battery terminal re-secured. Connection normal.',
            details: {
                driverName: 'Musa Bello',
                fleetName: 'Heavy Logistics',
                status: 'Stopped'
            },
            timeline: [
                { time: '10:28 AM', title: 'Main terminal disconnected' }
            ]
        },
        {
            id: '7',
            title: 'Geofence Entry',
            vehicleName: 'Car 7',
            vehiclePlate: 'ABC-789-ZX',
            severity: 'info',
            time: '10:22 AM',
            relativeTime: '27 mins ago',
            status: 'active',
            locationName: 'Lagos Island, Lagos, Nigeria',
            lat: 6.4544,
            lng: 3.3992,
            ackBy: 'You',
            ackByInitials: 'YO',
            ackRole: 'Fleet Manager',
            ackAt: 'May 20, 2024 10:23 AM',
            ackNote: 'Confirmed entry HQ area.',
            resBy: 'You',
            resAt: 'May 20, 2024 10:25 AM',
            resNote: 'Arrived at Lagos Island HQ safely. Operational delivery completed.',
            details: {
                driverName: 'Janet Davies',
                fleetName: 'Executive Transport',
                status: 'Moving'
            },
            timeline: [
                { time: '10:22 AM', title: 'Entered Ikeja Zone' }
            ]
        },
        {
            id: '8',
            title: 'Excessive Idling',
            vehicleName: 'Truck 6',
            vehiclePlate: 'KJA-06-TR',
            severity: 'warning',
            time: '10:15 AM',
            relativeTime: '34 mins ago',
            status: 'active',
            locationName: 'Lekki, Lagos, Nigeria',
            lat: 6.4281,
            lng: 3.4219,
            ackBy: 'Uche E.',
            ackByInitials: 'UE',
            ackRole: 'Dispatcher',
            ackAt: 'May 20, 2024 10:16 AM',
            ackNote: 'Idling warning alert dispatched to driver terminal.',
            resBy: 'Uche E.',
            resAt: 'May 20, 2024 10:25 AM',
            resNote: 'Idling terminated. Driver resumed delivery route.',
            details: {
                duration: '28 mins',
                driverName: 'Ibrahim Adamu',
                fleetName: 'Heavy Logistics',
                status: 'Idle'
            },
            timeline: [
                { time: '10:15 AM', title: 'Idling duration exceeded', description: 'Idling for 28 mins' }
            ]
        }
    ]

    const vehicleTypes = ['Toyota Hilux', 'Iveco Truck', 'Bus 21', 'Van 18', 'Pickup 12', 'Trailer 3', 'Car 7', 'Truck 6']
    const plates = ['ABC-123-XD', 'KJA-334-LM', 'KJA-21-BUS', 'KRO-18-VD', 'LSD-12-PK', 'KJA-03-TL', 'ABC-789-ZX', 'KJA-06-TR']
    const alertTypes = ['Overspeed Alert', 'Geofence Exit', 'Harsh Braking', 'Low Fuel', 'Ignition Off', 'Battery Disconnected', 'Geofence Entry', 'Excessive Idling']
    const locations = [
        { name: 'Ikeja, Lagos, Nigeria', lat: 6.5920, lng: 3.3420 },
        { name: 'Ojota, Lagos, Nigeria', lat: 6.5772, lng: 3.3752 },
        { name: 'Yaba, Lagos, Nigeria', lat: 6.5164, lng: 3.3792 },
        { name: 'Apapa, Lagos, Nigeria', lat: 6.4444, lng: 3.3692 },
        { name: 'Surulere, Lagos, Nigeria', lat: 6.4944, lng: 3.3592 },
        { name: 'Lekki, Lagos, Nigeria', lat: 6.4281, lng: 3.4219 },
    ]

    let critCount = 2
    let warnCount = 3
    let infoCount = 3

    for (let i = 9; i <= 128; i++) {
        let severity: 'critical' | 'warning' | 'info' = 'info'
        if (critCount < 23) {
            severity = 'critical'
            critCount++
        } else if (warnCount < 58) {
            severity = 'warning'
            warnCount++
        } else {
            infoCount++
        }

        const typeIdx = i % alertTypes.length
        const loc = locations[i % locations.length]

        const hour = Math.floor(10 - i / 15)
        const minute = (60 - (i * 7) % 60) % 60
        const timeStr = `${hour > 0 ? hour : hour + 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 || hour < 0 ? 'PM' : 'AM'}`

        let status: 'active' | 'acknowledged' | 'resolved' = 'active'
        if (i <= 64) {
            status = 'acknowledged'
        } else {
            status = 'resolved'
        }

        alerts.push({
            id: String(i),
            title: alertTypes[typeIdx],
            vehicleName: vehicleTypes[i % vehicleTypes.length],
            vehiclePlate: plates[i % plates.length],
            severity,
            time: timeStr,
            relativeTime: `${i * 10} mins ago`,
            status,
            locationName: loc.name,
            lat: loc.lat + (Math.random() - 0.5) * 0.01,
            lng: loc.lng + (Math.random() - 0.5) * 0.01,
            ackBy: i % 2 === 0 ? 'You' : 'Uche E.',
            ackByInitials: i % 2 === 0 ? 'YO' : 'UE',
            ackRole: i % 2 === 0 ? 'Fleet Manager' : 'Dispatcher',
            ackAt: `May 20, 2024 ${timeStr}`,
            ackNote: 'Noted. Driver caution logged.',
            resBy: 'You',
            resAt: `May 20, 2024 ${timeStr}`,
            resNote: 'Resumed route within parameters.',
            beforeSpeed: '95 km/h',
            afterSpeed: '55 km/h',
            details: {
                driverName: 'John Doe',
                fleetName: 'Lagos Operations',
                status: 'Moving'
            },
            timeline: [
                { time: timeStr, title: 'Alert triggered', description: 'System event log logged.' }
            ]
        })
    }

    return alerts
}

// Severity icon component matching the UI screenshot
function SeverityIcon({ severity, className = '' }: { severity: string; className?: string }) {
    if (severity === 'critical') {
        return (
            <div className={`w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0 ${className}`}>
                <CircleAlert className="w-4 h-4 text-red-500" />
            </div>
        )
    }
    if (severity === 'warning') {
        return (
            <div className={`w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 ${className}`}>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
        )
    }
    return (
        <div className={`w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 ${className}`}>
            <Info className="w-4 h-4 text-blue-500" />
        </div>
    )
}

export default function AlertsPage() {
    const router = useRouter()
    const { user } = useAuthStore()

    const [allAlerts, setAllAlerts] = useState<RichAlertItem[]>(() => generateMockAlerts())
    const [selectedAlertId, setSelectedAlertId] = useState<string>('1')
    const [selectedCard, setSelectedCard] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
    const [selectedTab, setSelectedTab] = useState<'active' | 'acknowledged' | 'resolved'>('active')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRows, setSelectedRows] = useState<string[]>([])
    const [isEditingNote, setIsEditingNote] = useState(false)
    const [editNoteText, setEditNoteText] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const selectedAlert = useMemo(() => {
        return allAlerts.find(a => a.id === selectedAlertId) || allAlerts[0]
    }, [allAlerts, selectedAlertId])

    React.useEffect(() => {
        if (selectedAlert) {
            setEditNoteText(selectedAlert.ackNote || '')
            setIsEditingNote(false)
        }
    }, [selectedAlert])

    const handleSelectAlert = (alert: RichAlertItem) => {
        setSelectedAlertId(alert.id)
    }

    const handleAcknowledge = (id: string) => {
        setAllAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged', ackAt: 'May 20, 2024 10:48 AM', ackBy: 'You', ackRole: 'Fleet Manager', ackNote: 'Acknowledged via dashboard.' } : a))
        toast.success('Alert acknowledged successfully')
    }

    const handleResolve = (id: string) => {
        setAllAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved', resAt: 'May 20, 2024 10:50 AM', resBy: 'You', resNote: 'Alert resolved.' } : a))
        toast.success('Alert marked as resolved')
    }

    const handleReopen = (id: string) => {
        setAllAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a))
        toast.success('Alert reopened')
    }

    const handleBulkResolve = () => {
        if (selectedRows.length === 0) return
        setAllAlerts(prev => prev.map(a => selectedRows.includes(a.id) ? { ...a, status: 'resolved', resAt: 'May 20, 2024 10:50 AM', resBy: 'You', resNote: 'Bulk resolved.' } : a))
        setSelectedRows([])
        toast.success(`${selectedRows.length} alerts marked as resolved`)
    }

    const handleMarkAllAsRead = () => {
        toast.success('All alerts marked as read')
    }

    const handleSaveNote = () => {
        setAllAlerts(prev => prev.map(a => a.id === selectedAlert.id ? { ...a, ackNote: editNoteText } : a))
        setIsEditingNote(false)
        toast.success('Acknowledgement note updated')
    }

    const handleSelectAllRows = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRows(filteredAlerts.map(a => a.id))
        } else {
            setSelectedRows([])
        }
    }

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedRows(prev => [...prev, id])
        } else {
            setSelectedRows(prev => prev.filter(rowId => rowId !== id))
        }
    }

    const stats = useMemo(() => {
        const activeAlerts = allAlerts.filter(a => a.status === 'active')
        return {
            total: activeAlerts.length,
            critical: activeAlerts.filter(a => a.severity === 'critical').length,
            warning: activeAlerts.filter(a => a.severity === 'warning').length,
            info: activeAlerts.filter(a => a.severity === 'info').length
        }
    }, [allAlerts])

    const filteredAlerts = useMemo(() => {
        return allAlerts.filter(a => {
            if (a.status !== selectedTab) return false
            if (selectedCard !== 'all' && a.severity !== selectedCard) return false
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase()
                return (
                    a.title.toLowerCase().includes(query) ||
                    a.vehicleName.toLowerCase().includes(query) ||
                    a.vehiclePlate.toLowerCase().includes(query) ||
                    a.locationName.toLowerCase().includes(query)
                )
            }
            return true
        })
    }, [allAlerts, selectedTab, selectedCard, searchQuery])

    const paginatedAlerts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return filteredAlerts.slice(startIndex, startIndex + itemsPerPage)
    }, [filteredAlerts, currentPage])

    const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage)

    const donutData = [
        { name: 'Overspeed', value: 23, color: '#ef4444' },
        { name: 'Geofence', value: 25, color: '#f59e0b' },
        { name: 'Harsh Driving', value: 28, color: '#ff7849' },
        { name: 'Ignition / Power', value: 18, color: '#3b82f6' },
        { name: 'Fuel', value: 12, color: '#06b6d4' },
        { name: 'Others', value: 22, color: '#94a3b8' }
    ]

    const trendData = [
        { time: '12 AM', alerts: 5 },
        { time: '4 AM', alerts: 8 },
        { time: '8 AM', alerts: 12 },
        { time: '10 AM', alerts: 18 },
        { time: '12 PM', alerts: 15 },
        { time: '4 PM', alerts: 10 },
        { time: '8 PM', alerts: 6 }
    ]

    return (
        <div className="flex flex-col h-full overflow-hidden">


            {/* Page Header */}
            <div className="flex flex-col">
                <TopHeader
                    title="Alerts"
                    subtitle="Manage and respond to vehicle alerts"
                />

                {/* toolbar */}
                <Toolbar
                    dateRange={{ start: new Date(), end: new Date() }}
                    onDateRangeChange={(range) => console.log(range)}
                    activeFilterCount={2}
                    onFiltersClick={() => console.log('filters clicked')}
                    onExportClick={() => console.log('export clicked')}
                    exportDisabled={false}
                />


            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden min-h-0">

                {/* Left + Center Content */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 p-5 gap-4">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-4 gap-3 shrink-0">
                        <KpiCard
                            label="AI Alerts"
                            value={stats.total}
                            description="Total alerts"
                            icon={Sparkles}
                            active={selectedCard === 'all'}
                            variant="blue"
                            onClick={() => { setSelectedCard('all'); setCurrentPage(1) }}
                        />

                        <KpiCard
                            label="Critical"
                            value={stats.critical}
                            description="Requires immediate attention"
                            icon={CircleAlert}
                            active={selectedCard === 'critical'}
                            variant="red"
                            onClick={() => { setSelectedCard('critical'); setCurrentPage(1) }}
                        />

                        <KpiCard
                            label="Warning"
                            value={stats.warning}
                            description="Needs attention"
                            icon={AlertTriangle}
                            active={selectedCard === 'warning'}
                            variant="amber"
                            onClick={() => { setSelectedCard('warning'); setCurrentPage(1) }}
                        />

                        <KpiCard
                            label="Information"
                            value={stats.info}
                            description="For awareness"
                            icon={Info}
                            active={selectedCard === 'info'}
                            variant="blue"
                            onClick={() => { setSelectedCard('info'); setCurrentPage(1) }}
                        />
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex overflow-hidden min-h-0">

                        {/* ACTIVE TAB VIEW */}
                        {selectedTab === 'active' && (
                            <div className="w-full h-full flex gap-4 overflow-hidden">
                                {/* Alert List */}
                                <div className="w-[42%] flex flex-col h-full bg-white rounded-xl overflow-hidden shrink-0">
                                    {/* Tabs */}
                                    <div className="px-4 pt-3 flex gap-5 border-b border-slate-100 shrink-0">
                                        {(['active', 'acknowledged', 'resolved'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => {
                                                    setSelectedTab(tab)
                                                    setCurrentPage(1)
                                                    setSelectedRows([])
                                                }}
                                                className={`pb-2.5 text-[13px] font-medium capitalize relative transition-colors ${selectedTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {tab}
                                                {selectedTab === tab && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* List controls */}
                                    <div className="px-4 py-3 flex items-center justify-between shrink-0">
                                        <span className="text-[13px] font-semibold text-slate-800">
                                            {filteredAlerts.length} Alerts
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleMarkAllAsRead}
                                                className="text-[12px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                                Mark all as read
                                            </button>
                                            <div className="flex items-center gap-1 text-[12px] text-slate-500 cursor-pointer select-none">
                                                <span>Sort by:</span>
                                                <span className="font-medium text-slate-700">Newest First</span>
                                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Alert items */}
                                    <div className="flex-1 overflow-y-auto">
                                        {paginatedAlerts.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                                <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
                                                <p className="text-sm font-medium text-slate-600">No active alerts</p>
                                                <p className="text-xs text-slate-400 mt-1">All clean! No alerts match your filters.</p>
                                            </div>
                                        ) : (
                                            paginatedAlerts.map((alert) => {
                                                const isSelected = alert.id === selectedAlertId
                                                return (
                                                    <div
                                                        key={alert.id}
                                                        onClick={() => handleSelectAlert(alert)}
                                                        className={`cursor-pointer px-4 py-3 flex items-start gap-3 border-b border-slate-50 transition-colors ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}
                                                    >
                                                        <SeverityIcon severity={alert.severity} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <h4 className="text-[13px] font-semibold text-slate-900 leading-tight">{alert.title}</h4>
                                                                    <p className="text-[12px] text-slate-500 mt-0.5">
                                                                        {alert.vehicleName} • {alert.vehiclePlate}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-col items-end shrink-0">
                                                                    <Badge
                                                                        style={{
                                                                            color: SEVERITY_COLORS[alert.severity],
                                                                            backgroundColor: SEVERITY_BG[alert.severity]
                                                                        }}
                                                                        className="text-[10px] font-medium border-none px-2 py-0.5 rounded capitalize"
                                                                    >
                                                                        {alert.severity}
                                                                    </Badge>
                                                                    <span className="text-[11px] text-slate-400 mt-1">{alert.time}</span>
                                                                </div>
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-0.5">{alert.relativeTime}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 shrink-0 bg-white">
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 rounded-md border-slate-200"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </Button>
                                            {[...Array(totalPages)].map((_, idx) => {
                                                const page = idx + 1
                                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                                    return (
                                                        <Button
                                                            key={page}
                                                            variant={currentPage === page ? 'default' : 'outline'}
                                                            className={`h-7 w-7 rounded-md text-xs ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200'}`}
                                                            onClick={() => setCurrentPage(page)}
                                                        >
                                                            {page}
                                                        </Button>
                                                    )
                                                }
                                                if (page === currentPage - 2 || page === currentPage + 2) {
                                                    return <span key={page} className="text-slate-400 px-0.5 text-xs">...</span>
                                                }
                                                return null
                                            })}
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 rounded-md border-slate-200"
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                            <span>Showing {filteredAlerts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} alerts</span>
                                            <div className="flex items-center gap-1 cursor-pointer select-none">
                                                <span>{itemsPerPage} / page</span>
                                                <ChevronDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Map + Charts */}
                                <div className="flex-1 flex flex-col h-full gap-3 overflow-hidden">
                                    <div className="flex-1 min-h-[260px] rounded-xl overflow-hidden relative z-0">
                                        <AlertsMap
                                            alerts={filteredAlerts}
                                            selectedAlert={selectedAlert}
                                            onSelectAlert={handleSelectAlert}
                                        />
                                    </div>

                                    {/* Charts */}
                                    <div className="grid grid-cols-2 gap-3 h-[220px] shrink-0">
                                        {/* Donut */}
                                        <div className="bg-white rounded-xl p-4 flex flex-col h-full overflow-hidden">
                                            <span className="text-[13px] font-semibold text-slate-800 mb-2">Alerts by Type</span>
                                            <div className="flex-grow flex items-center justify-between min-h-0">
                                                <div className="h-full w-[42%] shrink-0">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={donutData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={40}
                                                                outerRadius={56}
                                                                paddingAngle={2}
                                                                dataKey="value"
                                                                strokeWidth={0}
                                                            >
                                                                {donutData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                                ))}
                                                            </Pie>
                                                            <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="text-base font-semibold fill-slate-800">
                                                                128
                                                            </text>
                                                            <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-medium fill-slate-400">
                                                                Total
                                                            </text>
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="flex-1 overflow-y-auto pl-3 space-y-2 scrollbar-none text-[11px] text-slate-500">
                                                    {donutData.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <span style={{ backgroundColor: item.color }} className="w-2 h-2 rounded-full shrink-0" />
                                                                <span>{item.name}</span>
                                                            </div>
                                                            <span className="text-slate-700 font-medium">{item.value} ({Math.round(item.value / 1.28)}%)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trend */}
                                        <div className="bg-white rounded-xl p-4 flex flex-col h-full overflow-hidden">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[13px] font-semibold text-slate-800">Alerts Trend</span>
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer select-none">
                                                    <span>Today</span>
                                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-h-0 w-full relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                        <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                        <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0' }} />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="alerts"
                                                            stroke="#3b82f6"
                                                            strokeWidth={2}
                                                            dot={{ r: 2.5, stroke: '#3b82f6', strokeWidth: 1.5, fill: '#fff' }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                                <div className="absolute top-[26%] left-[52%] bg-slate-800 text-[10px] text-white px-2 py-1 rounded-md font-medium leading-tight select-none pointer-events-none">
                                                    <div>10:00 AM</div>
                                                    <div className="text-blue-300 text-[9px]">18 Alerts</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACKNOWLEDGED / RESOLVED TABLE VIEW */}
                        {(selectedTab === 'acknowledged' || selectedTab === 'resolved') && (
                            <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden">
                                {/* Tabs */}
                                <div className="px-4 pt-3 flex gap-5 border-b border-slate-100 shrink-0">
                                    {(['active', 'acknowledged', 'resolved'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => {
                                                setSelectedTab(tab)
                                                setCurrentPage(1)
                                                setSelectedRows([])
                                            }}
                                            className={`pb-2.5 text-[13px] font-medium capitalize relative transition-colors ${selectedTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {tab}
                                            {selectedTab === tab && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Table controls */}
                                <div className="px-4 py-3 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-blue-600 focus:ring-0"
                                            checked={filteredAlerts.length > 0 && selectedRows.length === filteredAlerts.length}
                                            onChange={handleSelectAllRows}
                                        />
                                        {selectedTab === 'acknowledged' ? (
                                            <Button
                                                onClick={handleBulkResolve}
                                                disabled={selectedRows.length === 0}
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-7 disabled:opacity-40"
                                            >
                                                Mark as Resolved
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => toast.success(`Exporting ${selectedRows.length} resolved reports`)}
                                                disabled={selectedRows.length === 0}
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-7 disabled:opacity-40"
                                            >
                                                Bulk Export
                                            </Button>
                                        )}
                                        <div className="flex items-center gap-1 text-[12px] text-slate-500 cursor-pointer select-none">
                                            <span>Sort by:</span>
                                            <span className="font-medium text-slate-700">Newest First</span>
                                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">{selectedRows.length} selected</span>
                                </div>

                                {/* Table */}
                                <div className="flex-grow overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-medium uppercase text-slate-400 tracking-wider sticky top-0">
                                            <tr>
                                                <th className="w-10 py-3 pl-4"></th>
                                                <th className="py-3">Alert</th>
                                                <th className="py-3">Vehicle / Asset</th>
                                                <th className="py-3">Alert Time</th>
                                                {selectedTab === 'acknowledged' ? (
                                                    <>
                                                        <th className="py-3">Acknowledged By</th>
                                                        <th className="py-3">Acknowledged At</th>
                                                    </>
                                                ) : (
                                                    <>
                                                        <th className="py-3">Resolved By</th>
                                                        <th className="py-3">Resolved At</th>
                                                    </>
                                                )}
                                                <th className="w-10 py-3 pr-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-[13px] text-slate-700">
                                            {paginatedAlerts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                                        <div className="flex flex-col items-center justify-center p-4">
                                                            <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2" />
                                                            <p className="text-sm font-medium text-slate-600">No {selectedTab} alerts found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedAlerts.map((alert) => {
                                                    const isChecked = selectedRows.includes(alert.id)
                                                    const isSelected = alert.id === selectedAlertId
                                                    return (
                                                        <tr
                                                            key={alert.id}
                                                            onClick={() => handleSelectAlert(alert)}
                                                            className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}
                                                        >
                                                            <td className="py-2.5 pl-4" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                                                                    checked={isChecked}
                                                                    onChange={(e) => handleSelectRow(alert.id, e.target.checked)}
                                                                />
                                                            </td>
                                                            <td className="py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }} className="w-1.5 h-1.5 rounded-full shrink-0" />
                                                                    <div>
                                                                        <div className="text-slate-800 font-medium text-[13px] leading-tight">{alert.title}</div>
                                                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                                                            {alert.details.speed ? `Speed: ${alert.details.speed} km/h (Limit: ${alert.details.speedLimit} km/h)` : 'Alert rule breach'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-6 bg-slate-100 rounded overflow-hidden shrink-0">
                                                                        <img src={alert.details.imageUrl || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=100"} className="w-full h-full object-cover" alt="" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-slate-700 font-medium leading-tight">{alert.vehicleName}</div>
                                                                        <div className="font-mono text-[10px] text-slate-400">{alert.vehiclePlate}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 text-slate-500">{alert.time}</td>
                                                            {selectedTab === 'acknowledged' ? (
                                                                <>
                                                                    <td className="py-2.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-5 h-5 rounded-full bg-blue-50 text-[9px] font-medium text-blue-600 flex items-center justify-center">
                                                                                {alert.ackByInitials || 'YO'}
                                                                            </span>
                                                                            <span className="font-medium">{alert.ackBy || 'You'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2.5 text-slate-500">{alert.ackAt || 'May 20, 2024'}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="py-2.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-medium text-slate-500 flex items-center justify-center">
                                                                                {alert.ackByInitials || 'YO'}
                                                                            </span>
                                                                            <span className="font-medium">{alert.resBy || 'You'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2.5 text-slate-500">{alert.resAt || 'May 20, 2024'}</td>
                                                                </>
                                                            )}
                                                            <td className="py-2.5 pr-4" onClick={(e) => e.stopPropagation()}>
                                                                <button
                                                                    onClick={() => handleSelectAlert(alert)}
                                                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50"
                                                                >
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="px-4 py-3 flex items-center justify-between border-t border-slate-100 shrink-0 bg-white">
                                    <div className="flex items-center gap-1.5">
                                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-md border-slate-200" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </Button>
                                        {[...Array(Math.min(totalPages, 5))].map((_, idx) => {
                                            const page = idx + 1
                                            return (
                                                <Button
                                                    key={page}
                                                    variant={currentPage === page ? 'default' : 'outline'}
                                                    className={`h-7 w-7 rounded-md text-xs ${currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200'}`}
                                                    onClick={() => setCurrentPage(page)}
                                                >
                                                    {page}
                                                </Button>
                                            )
                                        })}
                                        {totalPages > 5 && <span className="text-slate-400 px-0.5 text-xs">...</span>}
                                        {totalPages > 5 && (
                                            <Button variant="outline" className="h-7 w-7 rounded-md text-xs border-slate-200" onClick={() => setCurrentPage(totalPages)}>
                                                {totalPages}
                                            </Button>
                                        )}
                                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-md border-slate-200" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        Showing {filteredAlerts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredAlerts.length)} of {filteredAlerts.length} {selectedTab} alerts
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Drawer */}
                <div className="w-[320px] border-l border-slate-100 bg-white h-full overflow-y-auto flex flex-col shrink-0">

                    {/* Drawer Header */}
                    <div className="px-5 py-4 flex items-start justify-between shrink-0 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <SeverityIcon severity={selectedAlert.severity} />
                            <div>
                                <h3 className="text-[15px] font-semibold text-slate-900 leading-tight">{selectedAlert.title}</h3>
                                <Badge
                                    style={{
                                        color: SEVERITY_COLORS[selectedAlert.severity],
                                        backgroundColor: SEVERITY_BG[selectedAlert.severity]
                                    }}
                                    className="text-[10px] font-medium border-none px-2 py-0 rounded capitalize mt-1"
                                >
                                    {selectedAlert.severity}
                                </Badge>
                            </div>
                        </div>
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-grow overflow-y-auto">
                        {/* Vehicle Info */}
                        <div className="px-5 py-4 flex gap-3 border-b border-slate-50">
                            <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                <img
                                    className="w-full h-full object-cover"
                                    src={selectedAlert.details.imageUrl || "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=300"}
                                    alt="Vehicle"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[13px] font-semibold text-slate-900 leading-tight">{selectedAlert.vehicleName}</h4>
                                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        {selectedAlert.details.status || 'Moving'}
                                    </span>
                                </div>
                                <p className="font-mono text-[12px] text-slate-500 mt-0.5">{selectedAlert.vehiclePlate}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    Fleet: {selectedAlert.details.fleetName || 'Lagos Operations'}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    Driver: {selectedAlert.details.driverName || 'John Doe'}
                                </p>
                            </div>
                        </div>

                        {/* Telemetry Key-Value Rows */}
                        <div className="px-5 py-4 space-y-3 border-b border-slate-50">
                            <DetailRow label="Time" value={`May 20, 2024 ${selectedAlert.time}`} />
                            <DetailRow label="Location" value={selectedAlert.locationName} valueIcon={<MapPin className="w-3 h-3 text-blue-500 shrink-0" />} />
                            <DetailRow label="Speed" value={`${selectedAlert.details.speed || 0} km/h`} />
                            <DetailRow label="Speed Limit" value={`${selectedAlert.details.speedLimit || 60} km/h`} />
                            {selectedAlert.details.overspeedAmount && (
                                <DetailRow
                                    label="Overspeed"
                                    value={selectedAlert.details.overspeedAmount}
                                    valueClass="text-red-500"
                                    suffix={`(${selectedAlert.details.overspeedPercent})`}
                                />
                            )}
                            <DetailRow label="Duration" value={selectedAlert.details.duration || 'N/A'} />
                            <DetailRow label="Distance" value={selectedAlert.details.distance || 'N/A'} />
                            <DetailRow label="Direction" value={selectedAlert.details.direction || 'N/A'} />
                        </div>

                        {/* Active drawer */}
                        {selectedAlert.status === 'active' && (
                            <>
                                <div className="px-5 py-4 grid grid-cols-2 gap-2 border-b border-slate-50">
                                    <Button
                                        onClick={() => handleAcknowledge(selectedAlert.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium h-9 text-[13px]"
                                    >
                                        Acknowledge
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleResolve(selectedAlert.id)}
                                        className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium h-9 text-[13px]"
                                    >
                                        Resolve
                                    </Button>
                                </div>

                                <div className="px-5 py-4">
                                    <h4 className="text-[13px] font-semibold text-slate-800 mb-3">Alert Timeline</h4>
                                    <div className="relative pl-5 space-y-4 border-l border-slate-200 ml-1.5">
                                        {selectedAlert.timeline.map((node, idx) => (
                                            <div key={idx} className="relative">
                                                <div
                                                    style={{ backgroundColor: idx === 0 ? SEVERITY_COLORS[selectedAlert.severity] : '#cbd5e1' }}
                                                    className="absolute -left-[23px] top-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                                                />
                                                <div className="text-[11px] text-slate-400">{node.time}</div>
                                                <div className="text-[13px] font-medium text-slate-800 mt-0.5 leading-snug">{node.title}</div>
                                                {node.description && (
                                                    <div className="text-[12px] text-slate-500 mt-0.5">{node.description}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => toast.info('Opening full timeline log')}
                                        className="w-full mt-4 flex items-center justify-between text-[12px] font-medium text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50/50 transition-colors cursor-pointer"
                                    >
                                        <span>View Full History</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Acknowledged drawer */}
                        {selectedAlert.status === 'acknowledged' && (
                            <>
                                <div className="px-5 py-4 border-b border-slate-50">
                                    <div className="rounded-lg overflow-hidden h-[160px] relative">
                                        <AlertMiniMap
                                            lat={selectedAlert.lat}
                                            lng={selectedAlert.lng}
                                            severity={selectedAlert.severity}
                                        />
                                        <button
                                            onClick={() => toast.info('Centering main tracker map on coordinates')}
                                            className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-medium text-blue-600 hover:bg-white transition-colors cursor-pointer"
                                        >
                                            View on Map
                                        </button>
                                    </div>
                                </div>

                                <div className="px-5 py-4 border-b border-slate-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-[13px] font-semibold text-slate-800">Acknowledgement Details</h4>
                                        <button
                                            onClick={() => setIsEditingNote(!isEditingNote)}
                                            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            {isEditingNote ? 'Cancel' : 'Edit Note'}
                                        </button>
                                    </div>
                                    <div className="space-y-2.5">
                                        <DetailRow label="Acknowledged By" value={selectedAlert.ackBy || 'You'} />
                                        <DetailRow label="Role" value={selectedAlert.ackRole || 'Fleet Manager'} />
                                        <DetailRow label="Acknowledged At" value={selectedAlert.ackAt || 'May 20, 2024'} />
                                        <div>
                                            <span className="text-[12px] text-slate-400">Note (Optional)</span>
                                            {isEditingNote ? (
                                                <div className="mt-1.5 space-y-2">
                                                    <textarea
                                                        className="w-full p-2 border border-slate-200 rounded-lg text-[12px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
                                                        rows={3}
                                                        value={editNoteText}
                                                        onChange={(e) => setEditNoteText(e.target.value)}
                                                    />
                                                    <Button
                                                        onClick={handleSaveNote}
                                                        size="sm"
                                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-7 text-[11px]"
                                                    >
                                                        Save Note
                                                    </Button>
                                                </div>
                                            ) : (
                                                <p className="text-[12px] text-slate-600 mt-1 italic">
                                                    &ldquo;{selectedAlert.ackNote || 'No notes added.'}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 py-4 grid grid-cols-2 gap-2">
                                    <Button
                                        onClick={() => handleResolve(selectedAlert.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium h-9 text-[12px] gap-1.5"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Mark as Resolved
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleReopen(selectedAlert.id)}
                                        className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium h-9 text-[12px] gap-1.5"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Reopen Alert
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* Resolved drawer */}
                        {selectedAlert.status === 'resolved' && (
                            <>
                                <div className="px-5 py-4 border-b border-slate-50">
                                    <h4 className="text-[13px] font-semibold text-slate-800 mb-3">Before vs After Comparison</h4>
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div className="bg-red-50 rounded-lg p-3">
                                            <div className="text-[10px] font-medium text-red-500 uppercase">Before Event</div>
                                            <div className="text-base font-semibold text-red-700 mt-1">{selectedAlert.beforeSpeed || '98 km/h'}</div>
                                        </div>
                                        <div className="bg-emerald-50 rounded-lg p-3">
                                            <div className="text-[10px] font-medium text-emerald-500 uppercase">After Resolution</div>
                                            <div className="text-base font-semibold text-emerald-700 mt-1">{selectedAlert.afterSpeed || '58 km/h'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-5 py-4 border-b border-slate-50">
                                    <div className="rounded-lg overflow-hidden h-[160px] relative">
                                        <AlertMiniMap
                                            lat={selectedAlert.lat}
                                            lng={selectedAlert.lng}
                                            severity={selectedAlert.severity}
                                        />
                                        <button
                                            onClick={() => toast.info('Centering playback path')}
                                            className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-medium text-blue-600 hover:bg-white transition-colors cursor-pointer"
                                        >
                                            View in Playback
                                        </button>
                                    </div>
                                </div>

                                <div className="px-5 py-4 border-b border-slate-50">
                                    <h4 className="text-[13px] font-semibold text-slate-800 mb-3">Resolution Details</h4>
                                    <div className="space-y-2.5">
                                        <DetailRow label="Resolved By" value={selectedAlert.resBy || 'You'} />
                                        <DetailRow label="Resolved At" value={selectedAlert.resAt || 'May 20, 2024'} />
                                        <div>
                                            <span className="text-[12px] text-slate-400">Resolution Notes</span>
                                            <p className="text-[12px] text-slate-600 mt-1 italic leading-relaxed">
                                                &ldquo;{selectedAlert.resNote || 'No resolution notes provided.'}&rdquo;
                                            </p>
                                        </div>
                                        {selectedAlert.relatedAlert && (
                                            <div>
                                                <span className="text-[12px] text-slate-400">Related Alerts</span>
                                                <p className="text-[12px] text-slate-600 mt-1 flex items-center gap-1.5">
                                                    <AlertTriangle className="w-3 h-3 text-slate-400" />
                                                    {selectedAlert.relatedAlert}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-5 py-4 grid grid-cols-2 gap-2">
                                    <Button
                                        onClick={() => handleReopen(selectedAlert.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium h-9 text-[12px] gap-1.5"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Reopen Alert
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => toast.success('Downloading incident reports')}
                                        className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium h-9 text-[12px] gap-1.5"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download PDF
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions Footer */}
                    <div className="px-5 py-4 border-t border-slate-100 shrink-0">
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-2.5">Actions</span>
                        <div className="grid grid-cols-5 gap-1.5">
                            {[
                                { icon: MapPin, label: 'Live Track', action: () => toast.success(`Tracking ${selectedAlert.vehiclePlate} in real-time`) },
                                { icon: Play, label: 'Playback', action: () => router.push('/tracking') },
                                { icon: Route, label: 'Route History', action: () => toast.success('Loading historical route patterns') },
                                { icon: Terminal, label: 'Send Command', action: () => toast.info(`Command Terminal opened for ${selectedAlert.vehiclePlate}`) },
                                { icon: MoreHorizontal, label: 'More', action: () => toast.info('Opening contextual menu options') },
                            ].map(({ icon: Icon, label, action }) => (
                                <button
                                    key={label}
                                    onClick={action}
                                    className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 transition-colors group cursor-pointer"
                                >
                                    <Icon className="w-4 h-4 mb-1 group-hover:scale-105 transition-transform" />
                                    <span className="text-[9px] font-medium leading-tight text-center">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

/** Simple key-value row component for the drawer details */
function DetailRow({ label, value, valueClass = '', valueIcon, suffix }: {
    label: string
    value: string
    valueClass?: string
    valueIcon?: React.ReactNode
    suffix?: string
}) {
    return (
        <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-slate-400">{label}</span>
            <span className={`text-[13px] font-medium text-slate-800 text-right flex items-center gap-1 ${valueClass}`}>
                {valueIcon}
                {value}
                {suffix && <span className="text-[11px] text-slate-400 ml-0.5">{suffix}</span>}
            </span>
        </div>
    )
}
