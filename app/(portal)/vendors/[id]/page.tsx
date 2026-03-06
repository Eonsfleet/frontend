'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api/vendors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Mail, Phone, Calendar, ShieldCheck, MapPin, Store, Loader2, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function VendorDetailPage() {
    const params = useParams()
    const router = useRouter()
    const vendorId = params.id as string

    const { data: vendorData, isLoading, error } = useQuery({
        queryKey: ['vendor-detail', vendorId],
        queryFn: () => api.getVendorById(vendorId),
        enabled: !!vendorId
    })

    if (isLoading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error || !vendorData) {
        return (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
                <p className="text-slate-500">Failed to load vendor details.</p>
                <Button variant="link" onClick={() => router.back()} className="mt-4 text-blue-600">Go Back</Button>
            </div>
        )
    }

    const vendor = vendorData.data
    const attr = vendor.attributes

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 lg:p-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-blue-50 text-blue-600">
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{attr.business_name}</h1>
                    <p className="text-sm text-slate-500">Vendor ID: {vendor.id}</p>
                </div>
                <Badge className={`ml-auto uppercase tracking-wider text-[10px] font-bold ${attr.has_onboarded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {attr.has_onboarded ? 'Onboarded' : 'Pending'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="lg:col-span-1 border-slate-200 overflow-hidden shadow-sm">
                    <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-400" />
                    <CardContent className="-mt-12 space-y-4">
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-md mb-3">
                                <div className="w-full h-full rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                                    {attr.avatar ? (
                                        <img src={attr.avatar} alt={attr.business_name} className="w-full h-full object-cover rounded-xl" />
                                    ) : (
                                        <Store className="w-10 h-10 text-blue-600" />
                                    )}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{attr.business_name}</h2>
                            <p className="text-sm text-blue-600 font-semibold capitalize">{attr.business_type || 'Service Provider'}</p>
                        </div>

                        <div className="pt-4 space-y-3.5 border-t border-slate-100">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600">{vendor.relationships.user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600">{vendor.relationships.user.phone_number || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <ShieldCheck className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-600">Contact: {vendor.relationships.user.f_name} {vendor.relationships.user.l_name}</span>
                            </div>
                        </div>

                        <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4 shadow-blue-100 shadow-lg">
                            <Mail className="w-4 h-4 mr-2" /> Message Vendor
                        </Button>
                        {attr.website && (
                            <Button variant="outline" className="w-full mt-2 border-blue-200 text-blue-600 transition-all" onClick={() => window.open(attr.website, '_blank')}>
                                Visit Website <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Details Section */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <Tabs defaultValue="overview" className="w-full">
                        <CardHeader className="pb-0">
                            <TabsList className="bg-slate-100 p-1 w-max">
                                <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Overview</TabsTrigger>
                                <TabsTrigger value="jobs" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Recent Jobs</TabsTrigger>
                                <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Compliance</TabsTrigger>
                            </TabsList>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <TabsContent value="overview" className="space-y-6 mt-0">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Performance</p>
                                        <p className="text-2xl font-black text-slate-900">4.8 <span className="text-sm font-normal text-slate-500">/ 5.0</span></p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Jobs</p>
                                        <p className="text-2xl font-black text-slate-900">142</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                                        Verification Status
                                    </h3>
                                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-900">Business License</p>
                                            <p className="text-xs text-slate-500">Verified until Dec 2026</p>
                                        </div>
                                        <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="jobs" className="mt-0">
                                <div className="text-center py-12">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                        <ArrowRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 text-sm">No recent job history found in the system.</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="documents" className="mt-0">
                                <div className="space-y-3">
                                    {['Tax Clearance', 'Insurance Certificate', 'Operational Permit'].map(doc => (
                                        <div key={doc} className="p-3 border border-slate-100 rounded-lg flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <span className="text-sm font-medium text-slate-700">{doc}</span>
                                            <Button variant="ghost" size="sm" className="text-blue-600 font-bold h-7 py-0">View</Button>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                        </CardContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    )
}
