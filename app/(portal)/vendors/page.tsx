"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Mail,
  Loader2,
  Store,
  Star,
  MapPin,
  Tag,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api/vendors";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { RoleGate } from "@/components/shared/RoleGate";
import Link from "next/link";

const inviteSchema = z.object({
  business_name: z.string().min(2, "Required"),
  email: z.string().email("Invalid email format"),
  category: z.enum(["workshop", "fuel_supplier", "parts_dealer", "towing"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function VendorDirectoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ["vendors-directory"],
    queryFn: () => api.getVendors(),
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { business_name: "", email: "", category: "workshop" },
  });

  const inviteMutation = useMutation({
    mutationFn: api.inviteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors-directory"] });
      toast.success("Vendor invitation dispatched.");
      setIsInviteOpen(false);
      reset();
    },
    onError: () => toast.error("Failed to send vendor assignment"),
  });

  const onSubmit = (data: InviteFormValues) => {
    inviteMutation.mutate(data);
  };

  const filteredVendors =
    vendorsData?.data?.filter(
      (v) =>
        v.attributes.business_name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        v.relationships.user?.email
          ?.toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];

  return (
    <RoleGate
      allowedRoles={["administrator", "fleet_manager", "dispatcher"]}
      fallbackMessage="Vendor management is restricted."
    >
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Vendor Directory
            </h1>
            <p className="text-slate-500 mt-1">
              Manage external service providers, repair shops, and suppliers.
            </p>
          </div>

          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Invite Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Register New Vendor</DialogTitle>
                <DialogDescription>
                  They will receive an email instructing them to configure their
                  Workshop Portal.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 pt-4"
              >
                <div className="space-y-2">
                  <Label>
                    Vendor Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input {...register("business_name")} />
                  {errors.business_name && (
                    <p className="text-[10px] text-red-500">
                      {errors.business_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    Business Email Account{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="contact@shop.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-[10px] text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>
                    Provider Type <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="workshop">
                            Repair Workshop / Garage
                          </SelectItem>
                          <SelectItem value="fuel_supplier">
                            Fuel Network Provider
                          </SelectItem>
                          <SelectItem value="parts_dealer">
                            Automotive Parts Dealer
                          </SelectItem>
                          <SelectItem value="towing">
                            Towing & Recovery
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && (
                    <p className="text-[10px] text-red-500">
                      {errors.category.message}
                    </p>
                  )}
                </div>
                <DialogFooter className="pt-4">
                  <Button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="w-full"
                  >
                    {inviteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Dispatch Invitation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Find by business name..."
              className="pl-9 bg-slate-50 border-transparent focus-visible:bg-white focus-visible:border-blue-500 focus-visible:ring-blue-100 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-20 bg-slate-50">
              <Store className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                No active vendors found in the directory.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">
                    Vendor
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">
                    Classification
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">
                    Contact Person
                  </TableHead>
                  <TableHead className="font-bold text-slate-700">
                    Onboarding
                  </TableHead>
                  <TableHead className="text-right font-bold text-slate-700 px-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow
                    key={vendor?.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          {vendor.attributes.avatar ? (
                            <img
                              src={vendor.attributes.avatar}
                              alt=""
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Store className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 leading-none">
                            {vendor?.attributes?.business_name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                            <Mail className="w-3 h-3" />{" "}
                            {vendor?.relationships.user?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 border-blue-100/50 capitalize font-medium"
                      >
                        <Tag className="w-3 h-3 mr-1.5" />
                        {vendor?.attributes?.business_type ||
                          "Service Provider"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        <div className="font-medium">
                          {vendor?.relationships?.user?.f_name}{" "}
                          {vendor?.relationships?.user?.l_name}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {vendor?.relationships?.user?.phone_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${vendor?.attributes?.has_onboarded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {vendor?.attributes?.has_onboarded
                          ? "Onboarded"
                          : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() =>
                            window.open(
                              `mailto:${vendor?.relationships?.user?.email}`,
                            )
                          }
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Link href={`/vendors/${vendor.id}`}>
                          <Button
                            size="sm"
                            className="h-8 bg-blue-600 hover:bg-blue-700 shadow-blue-100 shadow-md"
                          >
                            Details{" "}
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
