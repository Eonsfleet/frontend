"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Network,
  Plus,
  MapPin,
  Users,
  Users2,
  Truck,
  MoreVertical,
  Edit2,
  Trash,
  Loader2,
  Check,
  ChevronsUpDown,
  EyeIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api/settings";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import * as vehicleApi from "@/lib/api/vehicles";
import { Badge } from "@/components/ui/badge";
import { usePaginatedClusters } from "@/hooks/useClusterFleetStats";
import { STALE_TIME_STATIC } from "@/lib/config";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function ClustersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    manager_id: "" as string,
    user_ids: [] as string[],
    vehicle_ids: [] as string[],
  });
  const [managerPopoverOpen, setManagerPopoverOpen] = useState(false);
  const [usersPopoverOpen, setUsersPopoverOpen] = useState(false);
  const [vehiclesPopoverOpen, setVehiclesPopoverOpen] = useState(false);
  const [deletingCluster, setDeletingCluster] = useState<any>(null);
  const [page, setPage] = useState(1);

  const {
    clusters: clusterStats,
    isLoading: isStatsLoading,
    currentPage,
    lastPage,
    total: totalClusters,
  } = usePaginatedClusters(page);

  const { data: userData } = useQuery({
    queryKey: ["users-list-simple"],
    queryFn: () => api.getUsers({ per_page: 100 }),
    staleTime: STALE_TIME_STATIC,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles-list-simple"],
    queryFn: () => vehicleApi.getVehicles({ per_page: 100 }),
    staleTime: STALE_TIME_STATIC,
  });

  const users = userData?.data?.users || [];
  const vehicles = vehiclesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCluster(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clusters-page"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-fleet-stats-clusters"] });
      toast.success("Cluster provisioned successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to create the cluster"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateCluster(editingCluster?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clusters-page"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-fleet-stats-clusters"] });
      toast.success("Cluster updated successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to update the cluster"),
  });

  const handleClose = () => {
    setIsCreateOpen(false);
    setEditingCluster(null);
    setFormData({
      name: "",
      location: "",
      manager_id: "",
      user_ids: [],
      vehicle_ids: [],
    });
  };

  const handleEdit = (cluster: any) => {
    const attr = cluster.attributes || cluster;
    setEditingCluster(cluster);
    setFormData({
      name: attr.name || "",
      location: attr.description || "",
      manager_id: attr.manager_id ? String(attr.manager_id) : "",
      user_ids: (attr.user_ids || []).map(String),
      vehicle_ids: (attr.vehicle_ids || []).map(String),
    });
    setIsCreateOpen(true);
  };

  const toggleSelection = (id: string, field: "user_ids" | "vehicle_ids") => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((item) => item !== id)
        : [...prev[field], id],
    }));
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => api.deleteCluster(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clusters-page"] });
      queryClient.invalidateQueries({ queryKey: ["cluster-fleet-stats-clusters"] });
      toast.success("Cluster deleted successfully");
      setDeletingCluster(null);
    },
    onError: () => toast.error("Failed to delete the cluster"),
  });

  return (
    <div className="p-8 pb-16 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
            Clusters
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
            Fleet Distribution • Cluster Operations Overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingCluster(null);
              setFormData({
                name: "",
                location: "",
                manager_id: "",
                user_ids: [],
                vehicle_ids: [],
              });
              setIsCreateOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Cluster
          </Button>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 border-b border-slate-100">
              <DialogTitle>
                {editingCluster ? "Modify" : "Create"} Vehicle Cluster
              </DialogTitle>
              <DialogDescription>
                {editingCluster
                  ? "Update geographical grouping and regional assignments."
                  : "Add a new geographical or logical grouping for fleet segmentation."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Cluster Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Lagos South Region"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Regional Description</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. Mainland distribution hub"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lead Manager</Label>
                <Popover
                  open={managerPopoverOpen}
                  onOpenChange={setManagerPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal border-slate-200"
                    >
                      {formData.manager_id ? (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>
                            {users.find(
                              (u: any) => String(u.id) === formData.manager_id,
                            )?.attributes?.full_name || "Selected Manager"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">
                          Select a lead manager
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search user..." />
                      <CommandList>
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setFormData({ ...formData, manager_id: "" });
                              setManagerPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !formData.manager_id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            Unassigned
                          </CommandItem>
                          {users.map((user: any) => (
                            <CommandItem
                              key={user.id}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  manager_id: String(user.id),
                                });
                                setManagerPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.manager_id === String(user.id)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{user.attributes?.full_name}</span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase">
                                  {user.attributes?.role}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <Label className="flex justify-between items-center text-slate-900 font-bold">
                    Assign Users
                    <Badge
                      variant="secondary"
                      className="bg-indigo-50 text-indigo-700"
                    >
                      {formData.user_ids.length} selected
                    </Badge>
                  </Label>
                  <Popover
                    open={usersPopoverOpen}
                    onOpenChange={setUsersPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal border-slate-200 min-h-[40px] h-auto py-2"
                      >
                        <div className="flex flex-wrap gap-1 items-center">
                          {formData.user_ids.length > 0 ? (
                            formData.user_ids.slice(0, 2).map((id) => (
                              <Badge
                                key={id}
                                variant="secondary"
                                className="text-[10px] font-medium bg-slate-100 border-slate-200"
                              >
                                {
                                  users
                                    .find((u: any) => String(u.id) === id)
                                    ?.attributes?.full_name?.split(" ")[0]
                                }
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400">
                              Add users to cluster
                            </span>
                          )}
                          {formData.user_ids.length > 2 && (
                            <span className="text-[10px] text-slate-400">
                              +{formData.user_ids.length - 2} more
                            </span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user: any) => (
                              <CommandItem
                                key={user.id}
                                onSelect={() =>
                                  toggleSelection(String(user.id), "user_ids")
                                }
                              >
                                <div
                                  className={cn(
                                    "mr-2 h-4 w-4 rounded border flex items-center justify-center transition-colors",
                                    formData.user_ids.includes(String(user.id))
                                      ? "bg-indigo-600 border-indigo-600"
                                      : "bg-white border-slate-300",
                                  )}
                                >
                                  {formData.user_ids.includes(
                                    String(user.id),
                                  ) && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold">
                                    {user.attributes?.full_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 italic">
                                    {user.attributes?.email}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3">
                  <Label className="flex justify-between items-center text-slate-900 font-bold">
                    Assign Vehicles
                    <Badge
                      variant="secondary"
                      className="bg-amber-50 text-amber-900"
                    >
                      {formData.vehicle_ids.length} selected
                    </Badge>
                  </Label>
                  <Popover
                    open={vehiclesPopoverOpen}
                    onOpenChange={setVehiclesPopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal border-slate-200 min-h-[40px] h-auto py-2"
                      >
                        <div className="flex flex-wrap gap-1 items-center">
                          {formData.vehicle_ids.length > 0 ? (
                            formData.vehicle_ids.slice(0, 2).map((id) => (
                              <Badge
                                key={id}
                                variant="secondary"
                                className="text-[10px] font-medium bg-slate-100 border-slate-200"
                              >
                                {vehicles.find((v: any) => String(v.id) === id)
                                  ?.attributes?.registration_number || id}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400">
                              Add vehicles to cluster
                            </span>
                          )}
                          {formData.vehicle_ids.length > 2 && (
                            <span className="text-[10px] text-slate-400">
                              +{formData.vehicle_ids.length - 2} more
                            </span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Search vehicles..." />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>No vehicles found.</CommandEmpty>
                          <CommandGroup>
                            {vehicles.map((vh: any) => {
                              const isSelected = formData.vehicle_ids.includes(
                                String(vh.id),
                              );
                              const reg =
                                vh.attributes?.registration_number ||
                                vh.registration_number;
                              const make = vh.attributes?.make || vh.make;
                              const model = vh.attributes?.model || vh.model;
                              return (
                                <CommandItem
                                  key={vh.id}
                                  onSelect={() =>
                                    toggleSelection(
                                      String(vh.id),
                                      "vehicle_ids",
                                    )
                                  }
                                >
                                  <div
                                    className={cn(
                                      "mr-2 h-4 w-4 rounded border flex items-center justify-center transition-colors",
                                      isSelected
                                        ? "bg-amber-600 border-amber-600"
                                        : "bg-white border-slate-300",
                                    )}
                                  >
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold leading-tight">
                                      {reg}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium uppercase">
                                      {make} {model}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  !formData.name
                }
                onClick={() => {
                  const payload = {
                    name: formData.name,
                    description: formData.location,
                    manager_id: formData.manager_id
                      ? Number(formData.manager_id)
                      : undefined,
                    users: formData.user_ids.map(Number),
                    vehicles: formData.vehicle_ids.map(Number),
                  };
                  if (editingCluster) updateMutation.mutate(payload);
                  else createMutation.mutate(payload);
                }}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : editingCluster ? (
                  "Save Changes"
                ) : (
                  "Confirm Creation"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isStatsLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Loading clusters...
        </div>
      ) : clusterStats.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-slate-500">
            No clusters defined. All fleet data is globally visible.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clusterStats.map((cluster) => {
            const onlineRate = cluster.total > 0 ? (cluster.online / cluster.total) * 100 : 0;
            return (
              <Card key={cluster.id} className="shadow-sm border-slate-200 hover:border-blue-200 transition-colors">
                <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-start justify-between pb-4">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <Network className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate">{cluster.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1.5 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cluster.manager || "No manager assigned"}</span>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Cluster Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/clusters/${cluster.id}`)}>
                        <EyeIcon className="w-4 h-4 mr-2 text-slate-500" /> View Cluster
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit({ id: cluster.id, attributes: { name: cluster.name, manager: cluster.manager } })}>
                        <Edit2 className="w-4 h-4 mr-2 text-slate-500" /> Edit Metadata
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                        onClick={() => setDeletingCluster({ id: cluster.id, name: cluster.name })}
                      >
                        <Trash className="w-4 h-4 mr-2" /> Delete Cluster
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent
                  className="p-5 cursor-pointer"
                  onClick={() => router.push(`/clusters/${cluster.id}`)}
                >
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 py-2.5">
                      <p className="text-lg font-black text-slate-900 tabular-nums">{cluster.total}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 py-2.5">
                      <p className="text-lg font-black text-emerald-600 tabular-nums">{cluster.online}</p>
                      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Online</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 py-2.5">
                      <p className="text-lg font-black text-blue-600 tabular-nums">{cluster.offline}</p>
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Offline</p>
                    </div>
                  </div>

                  <div className="mt-4 h-1.5 rounded-full bg-blue-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${onlineRate}%` }}
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Users2 className="h-3.5 w-3.5 text-slate-400" />
                      {cluster.totalStaff} Staff
                    </span>
                    <span className="text-slate-400">{onlineRate.toFixed(0)}% online</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isStatsLoading && lastPage > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{clusterStats.length}</span> of{" "}
            <span className="font-medium text-slate-900">{totalClusters}</span> clusters
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setPage(currentPage - 1);
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                let pageNum = i + 1;
                if (lastPage > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > lastPage) pageNum = lastPage - 4 + i;
                }
                if (pageNum <= 0 || pageNum > lastPage) return null;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === pageNum}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(pageNum);
                      }}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < lastPage) setPage(currentPage + 1);
                  }}
                  className={currentPage === lastPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog
        open={!!deletingCluster}
        onOpenChange={(open) => !open && setDeletingCluster(null)}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle>Delete this cluster?</DialogTitle>
                <DialogDescription className="mt-1.5">
                  <span className="font-semibold text-slate-700 capitalize">
                    {deletingCluster?.name || "This cluster"}
                  </span>{" "}
                  will be permanently removed. Vehicles and users assigned to
                  it will become globally visible. This action cannot be
                  undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDeletingCluster(null)}
              disabled={deleteMutation.isPending}
            >
              No, keep cluster
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteMutation.mutate(deletingCluster?.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash className="w-4 h-4 mr-2" />
              )}
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
