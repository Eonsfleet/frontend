'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Vehicle {
    id: string
    reg: string
    status: 'active' | 'idle' | 'offline' | 'maintenance'
    driver: string
    lastUpdate: string
}

const vehicles: Vehicle[] = [
    { id: '1', reg: 'LND-123-XY', status: 'active', driver: 'John Doe', lastUpdate: '2 mins ago' },
    { id: '2', reg: 'ABJ-567-ZZ', status: 'idle', driver: 'Jane Smith', lastUpdate: '15 mins ago' },
    { id: '3', reg: 'KAN-990-BC', status: 'offline', driver: 'Ahmed Ali', lastUpdate: '2 hours ago' },
    { id: '4', reg: 'LAG-101-PA', status: 'maintenance', driver: 'Musa Keita', lastUpdate: '1 day ago' },
    { id: '5', reg: 'OGU-222-RT', status: 'active', driver: 'Seyi Ade', lastUpdate: '5 mins ago' },
]

export function FleetOverviewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
                <DialogHeader className="p-8 bg-slate-900 text-white">
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">
                        Fleet <span className="text-blue-400">Overview</span>
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                        Detailed status distribution and positioning
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-8 bg-white scrollbar-hide">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {['Active', 'Idle', 'Offline', 'Maintenance'].map((status) => (
                            <div key={status} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-100 transition-all pointer-events-none group">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">{status}</p>
                                <p className="text-2xl font-black text-slate-900 mt-1">
                                    {vehicles.filter(v => v.status === status.toLowerCase()).length}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Registration</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Current Driver</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Last Update</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vehicles.map((v) => (
                                    <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-bold text-slate-900">{v.reg}</TableCell>
                                        <TableCell>
                                            <Badge className={cn(
                                                "text-[10px] font-black uppercase tracking-wider px-2",
                                                v.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    v.status === 'idle' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                        v.status === 'offline' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                            'bg-blue-50 text-blue-700 border-blue-100'
                                            )} variant="outline">
                                                {v.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-slate-600">{v.driver}</TableCell>
                                        <TableCell className="text-xs text-slate-400 font-medium italic">{v.lastUpdate}</TableCell>
                                        <TableCell className="text-right">
                                            <button className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest px-2 py-1 rounded transition-colors hover:bg-blue-50">
                                                Track
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
