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
import {
  Network,
  Plus,
  MapPin,
  Users,
  Truck,
  MoreVertical,
  Edit2,
  Trash,
  Loader2,
  Check,
  ChevronsUpDown,
  Search,
  EyeIcon,
  Calendar,
  UserCircle,
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
  DialogTrigger,
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

export default function ClustersManagementPage() {
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
  const [viewingClusterId, setViewingClusterId] = useState<string | null>(
    null,
  );
  const [deletingCluster, setDeletingCluster] = useState<any>(null);

  const { data: clusterData, isLoading } = useQuery({
    queryKey: ["settings-clusters"],
    queryFn: () => api.getClusters(),
  });

  const { data: clusterDetailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["cluster-detail", viewingClusterId],
    queryFn: () => api.getCluster(viewingClusterId!),
    enabled: !!viewingClusterId,
  });

  const { data: userData } = useQuery({
    queryKey: ["settings-users-all"],
    queryFn: () => api.getUsers({ per_page: 100 }),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["settings-vehicles-all"],
    queryFn: () => vehicleApi.getVehicles({ per_page: 100 }),
  });

  const users = userData?.data?.users || [];
  const vehicles = vehiclesData?.data || [];

  // Fallback safely whether list is nested heavily or flat, we will iterate
  const clustersList =
    (clusterData?.data as any)?.clusters ||
    (Array.isArray(clusterData?.data) ? clusterData.data : []);

  // Response shape: { data: { cluster: { id, attributes: {...} } } }
  const viewingCluster = (clusterDetailData?.data as any)?.cluster;
  const viewingAttr = viewingCluster?.attributes || {};

  const formatClusterDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value.replace(" ", "T"));
    if (isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCluster(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-clusters"] });
      toast.success("Cluster provisioned successfully");
      handleClose();
    },
    onError: () => toast.error("Failed to create the cluster"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateCluster(editingCluster?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-clusters"] });
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
      location: attr.description || "", // Mapping description to location field
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
      queryClient.invalidateQueries({ queryKey: ["settings-clusters"] });
      toast.success("Cluster deleted successfully");
      setDeletingCluster(null);
    },
    onError: () => toast.error("Failed to delete the cluster"),
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Vehicle Clusters
          </h1>
          <p className="text-slate-500 mt-1">
            Group vehicles and drivers geographically to restrict manager
            visibility.
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
                    description: formData.location, // Mapping location state to description payload
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : (
          clustersList.map((cluster: any) => (
            <Card key={cluster.id} className="shadow-sm border-slate-200">
              <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-start justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-500" />
                    {cluster.name || cluster.attributes?.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {cluster.attributes?.description || "No description"}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Cluster Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setViewingClusterId(String(cluster.id))}
                    >
                      <EyeIcon className="w-4 h-4 mr-2 text-slate-500" /> View
                      Cluster
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(cluster)}>
                      <Edit2 className="w-4 h-4 mr-2 text-slate-500" /> Edit
                      Metadata
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                      onClick={() => setDeletingCluster(cluster)}
                    >
                      <Trash className="w-4 h-4 mr-2" /> Delete Cluster
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex divide-x divide-slate-100 rounded-b-xl overflow-hidden bg-slate-50">
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                    <Truck className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-2xl font-extrabold text-slate-900">
                      {cluster.attributes?.total_vehicles || 0}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                      Active Vehicles
                    </span>
                  </div>
                  <div className="flex-1 p-4 flex flex-col items-center justify-center text-center bg-white">
                    <Users className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[100px] mt-2">
                      {cluster.attributes?.manager || (
                        <span className="text-slate-400 italic font-normal">
                          Unassigned
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mt-1">
                      Lead Manager
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {!isLoading && clustersList.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-slate-500">
            No clusters defined. All fleet data is globally visible.
          </p>
        </div>
      )}

      <Dialog
        open={!!viewingClusterId}
        onOpenChange={(open) => !open && setViewingClusterId(null)}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {isLoadingDetail ? (
            <>
              <DialogHeader className="p-6 border-b border-slate-100">
                <DialogTitle>Cluster Details</DialogTitle>
                <DialogDescription>
                  Fetching the latest cluster snapshot…
                </DialogDescription>
              </DialogHeader>
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Loading cluster
                </span>
              </div>
            </>
          ) : viewingCluster ? (
            <>
              <DialogHeader className="p-6 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <Network className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-bold text-slate-900 capitalize truncate">
                      {viewingAttr.name || "Untitled Cluster"}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-1.5 mt-0.5 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {viewingAttr.description || "No regional description"}
                    </DialogDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className="ml-auto shrink-0 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider"
                  >
                    Cluster #{viewingCluster.id}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Stat tiles */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-2">
                      <Truck className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900 leading-none">
                      {viewingAttr.total_vehicles ?? 0}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1.5">
                      Vehicles
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-2xl font-extrabold text-slate-900 leading-none">
                      {viewingAttr.total_users ?? 0}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1.5">
                      Users
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mb-2">
                      <UserCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span
                      className="text-sm font-bold text-slate-900 leading-tight truncate max-w-full mt-1"
                      title={viewingAttr.manager || undefined}
                    >
                      {viewingAttr.manager || (
                        <span className="text-slate-400 italic font-normal">
                          Unassigned
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-1.5">
                      Lead Manager
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Cluster Record
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-500 flex items-center gap-2">
                        <Network className="w-3.5 h-3.5 text-slate-400" />
                        Cluster Name
                      </span>
                      <span className="text-sm font-semibold text-slate-900 capitalize">
                        {viewingAttr.name || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-500 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Regional Description
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {viewingAttr.description || (
                          <span className="text-slate-400 italic font-normal">
                            Not provided
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-500 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Created
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatClusterDate(viewingAttr.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-500 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Last Updated
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatClusterDate(viewingAttr.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {(viewingAttr.total_vehicles ?? 0) === 0 &&
                  (viewingAttr.total_users ?? 0) === 0 && (
                    <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                      <p className="text-xs text-slate-400">
                        This cluster is empty. Edit it to assign vehicles and
                        users.
                      </p>
                    </div>
                  )}
              </div>

              <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setViewingClusterId(null)}
                >
                  Close
                </Button>
                <Button
                  className="bg-slate-900 hover:bg-slate-800"
                  onClick={() => {
                    setViewingClusterId(null);
                    handleEdit(viewingCluster);
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Cluster
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader className="p-6 border-b border-slate-100">
                <DialogTitle>Cluster Details</DialogTitle>
                <DialogDescription>
                  Something went wrong while loading this cluster.
                </DialogDescription>
              </DialogHeader>
              <div className="text-center py-12 text-sm text-slate-500">
                Failed to load cluster details. Please try again.
              </div>
              <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => setViewingClusterId(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
                    {deletingCluster?.name ||
                      deletingCluster?.attributes?.name ||
                      "This cluster"}
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
