'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, MapPin, Eye, Edit2, Trash2 } from 'lucide-react'
import { getGeofences } from '@/lib/api/geofencing'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export function GeofenceList() {
    const [page, setPage] = React.useState(1)

    const { data, isLoading } = useQuery({
        queryKey: ['geofences', { page }],
        queryFn: () => getGeofences({ page, per_page: 10 }),
    })

    return (
        <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between bg-white border-b border-slate-100">
                <div>
                    <CardTitle className="text-lg">Geofence Areas</CardTitle>
                    <CardDescription>Active boundaries monitored by the system.</CardDescription>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/geofences/new">
                        <Plus className="mr-2 h-4 w-4" /> Create Geofence
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                        <p>Loading geofences...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Name</th>
                                    <th className="px-6 py-4 font-medium">Type</th>
                                    <th className="px-6 py-4 font-medium">Alert Rule</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data?.data?.geofences?.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                                    <MapPin className="h-6 w-6 text-slate-400" />
                                                </div>
                                                <p className="font-medium text-slate-900">No Geofences Created</p>
                                                <p className="text-sm mt-1 mb-4">You have not defined any virtual boundaries yet.</p>
                                                <Button asChild variant="outline">
                                                    <Link href="/geofences/new">Draw First Geofence</Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.data?.geofences?.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{item.attributes.name}</div>
                                                {item.attributes.description && (
                                                    <div className="text-xs text-slate-500 truncate max-w-[250px]">{item.attributes.description}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="capitalize">{item.attributes.type}</Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="capitalize text-slate-700">{item.attributes.alert_type}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={item.attributes.is_active ? 'default' : 'secondary'} className={item.attributes.is_active ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                                                    {item.attributes.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" title="View details" asChild>
                                                        <Link href={`/geofences/${item.id}`}>
                                                            <Eye className="h-4 w-4 text-slate-500" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" title="Edit geofence">
                                                        <Edit2 className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete geofence">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
