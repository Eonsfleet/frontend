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
    CircleAlert,
    ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { AlertItem } from './AlertsMap'
import TopHeader from '@/components/layout/TopHeader'
import Toolbar from '@/components/alerts/Toolbar'
import KpiCard from '@/components/alerts/KpiCard'
import { AlertsDrawer, RichAlertItem } from '@/components/alerts/AlertsDrawer'
import AlertsList from '@/components/alerts/AlertsList'
import AlertsTable from '@/components/alerts/AlertsTable'
import AlertsChartSection from '@/components/alerts/AlertsChartSection'

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
    const [isDrawerOpen, setIsDrawerOpen] = useState(true)
    const [selectedCard, setSelectedCard] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
    const [selectedTab, setSelectedTab] = useState<'active' | 'acknowledged' | 'resolved'>('active')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRows, setSelectedRows] = useState<string[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const selectedAlert = useMemo(() => {
        return allAlerts.find(a => a.id === selectedAlertId) || allAlerts[0]
    }, [allAlerts, selectedAlertId])

    const handleSelectAlert = (alert: RichAlertItem) => {
        setSelectedAlertId(alert.id)
        setIsDrawerOpen(true)
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

    const handleSaveNote = (id: string, note: string) => {
        setAllAlerts(prev => prev.map(a => a.id === id ? { ...a, ackNote: note } : a))
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
                    </div>                    {/* Content Area */}
                    <div className="flex-1 flex overflow-hidden min-h-0">
                        {/* ACTIVE TAB VIEW */}
                        {selectedTab === 'active' && (
                            <div className="w-full h-full flex gap-4 overflow-hidden">
                                <AlertsList
                                    filteredAlerts={filteredAlerts}
                                    paginatedAlerts={paginatedAlerts}
                                    selectedAlertId={selectedAlertId}
                                    onSelectAlert={handleSelectAlert}
                                    selectedTab={selectedTab}
                                    setSelectedTab={setSelectedTab}
                                    currentPage={currentPage}
                                    setCurrentPage={setCurrentPage}
                                    totalPages={totalPages}
                                    itemsPerPage={itemsPerPage}
                                    onMarkAllAsRead={handleMarkAllAsRead}
                                />

                                {/* Map + Charts */}
                                <div className="flex-grow flex flex-col h-full gap-3 overflow-hidden">
                                    <div className="flex-1 min-h-[260px] rounded-xl overflow-hidden relative z-0">
                                        <AlertsMap
                                            alerts={filteredAlerts}
                                            selectedAlert={selectedAlert}
                                            onSelectAlert={handleSelectAlert}
                                        />
                                    </div>
                                    <AlertsChartSection donutData={donutData} trendData={trendData} />
                                </div>
                            </div>
                        )}

                        {/* ACKNOWLEDGED / RESOLVED TABLE VIEW */}
                        {(selectedTab === 'acknowledged' || selectedTab === 'resolved') && (
                            <AlertsTable
                                filteredAlerts={filteredAlerts}
                                paginatedAlerts={paginatedAlerts}
                                selectedAlertId={selectedAlertId}
                                onSelectAlert={handleSelectAlert}
                                selectedTab={selectedTab}
                                setSelectedTab={setSelectedTab}
                                currentPage={currentPage}
                                setCurrentPage={setCurrentPage}
                                totalPages={totalPages}
                                itemsPerPage={itemsPerPage}
                                selectedRows={selectedRows}
                                handleSelectAllRows={handleSelectAllRows}
                                handleSelectRow={handleSelectRow}
                                handleBulkResolve={handleBulkResolve}
                                onExportClick={() => toast.success(`Exporting ${selectedRows.length} reports`)}
                            />
                        )}
                    </div>
                </div>

            {/* Right Drawer Panel with slide transition */}
            <AlertsDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                selectedAlert={selectedAlert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onReopen={handleReopen}
                onSaveNote={handleSaveNote}
            />
        </div>
    </div>
  )
}
