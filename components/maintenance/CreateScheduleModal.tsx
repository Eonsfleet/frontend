"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import {
  CalendarIcon,
  Car,
  Wrench,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSchedule,
  getChecklistTemplates,
  createChecklistItem,
} from "@/lib/api/maintenance";
import { getVehicles } from "@/lib/api/vehicles";
import { getVendors } from "@/lib/api/vendors";
import { toast } from "sonner";
import { cn, extractApiError } from "@/lib/utils";
import { Plus, X } from "lucide-react";

interface CreateMaintenanceScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedVehicleId?: string;
  preselectedVehicleReg?: string;
}

const SERVICE_TYPES = [
  { value: "preventive", label: "Preventive" },
  { value: "corrective", label: "Corrective" },
];

export function CreateMaintenanceScheduleModal({
  open,
  onOpenChange,
  preselectedVehicleId,
  preselectedVehicleReg,
}: CreateMaintenanceScheduleModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(1);
  const [checklistSearch, setChecklistSearch] = React.useState("");
  const [showCreateChecklistModal, setShowCreateChecklistModal] =
    React.useState(false);
  const [serviceCategoryOpen, setServiceCategoryOpen] = React.useState(false);
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = React.useState(false);
  const [unitDropdownOpen, setUnitDropdownOpen] = React.useState(false);
  const [vendorDropdownOpen, setVendorDropdownOpen] = React.useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = React.useState(false);
  const [newChecklistForm, setNewChecklistForm] = React.useState({
    name: "",
    description: "",
  });

  // Form State
  const [formData, setFormData] = React.useState({
    vehicle_id: preselectedVehicleId ?? "",
    service_type: "",
    schedule_type: "time" as "time" | "mileage",
    interval_value: "",
    interval_unit: "months" as "days" | "weeks" | "months",
    schedule_date: undefined as Date | undefined,
    is_recurring: false,
    priority: "normal",
    description: "",
    vendor_id: "",
    turn_on_notification: true,
    checklists: [] as number[],
    note: "",
  });

  // Sync vehicle_id if preselectedVehicleId changes (e.g. modal reused)
  React.useEffect(() => {
    if (preselectedVehicleId) {
      setFormData((prev) => ({ ...prev, vehicle_id: preselectedVehicleId }));
    }
  }, [preselectedVehicleId]);

  // Queries
  const { data: vehicleData } = useQuery({
    queryKey: ["vehicles-lite"],
    queryFn: () => getVehicles({ per_page: 100 }),
    enabled: open,
  });

  const { data: vendorData } = useQuery({
    queryKey: ["vendors-lite"],
    queryFn: () => getVendors(),
    enabled: open,
  });

  const { data: checklistData } = useQuery({
    queryKey: ["checklists-templates"],
    queryFn: () => getChecklistTemplates(),
    enabled: open,
  });

  // Mutation
  const { mutate: handleCreate, isPending } = useMutation({
    mutationFn: (data: any) => createSchedule(data),
    onSuccess: () => {
      toast.success("Maintenance schedule created successfully");
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error(extractApiError(error, "Failed to create schedule"));
    },
  });

  const { mutate: handleCreateChecklist, isPending: isCreatingChecklist } =
    useMutation({
      mutationFn: (data: { name: string; description: string }) =>
        createChecklistItem(data),
      onSuccess: (response) => {
        toast.success("Checklist created successfully");
        queryClient.invalidateQueries({ queryKey: ["checklists-templates"] });
        // Auto-add the newly created checklist to the form
        const newChecklistId = response?.data?.id ? Number(response.data.id) : null;
        if (newChecklistId) {
          setFormData((prev) => ({
            ...prev,
            checklists: [...prev.checklists, newChecklistId],
          }));
        }
        setShowCreateChecklistModal(false);
        setNewChecklistForm({ name: "", description: "" });
        setChecklistSearch("");
      },
      onError: (error: unknown) => {
        toast.error(extractApiError(error, "Failed to create checklist"));
      },
    });

  const resetForm = () => {
    setStep(1);
    setFormData({
      vehicle_id: preselectedVehicleId ?? "",
      service_type: "",
      schedule_type: "time",
      interval_value: "",
      interval_unit: "months",
      schedule_date: undefined,
      is_recurring: false,
      priority: "normal",
      description: "",
      vendor_id: "",
      turn_on_notification: true,
      checklists: [],
      note: "",
    });
  };

  const onSubmit = () => {
    handleCreate({
      ...formData,
      interval_value: formData.interval_value
        ? parseInt(formData.interval_value)
        : undefined,
      schedule_date: formData.schedule_date
        ? format(formData.schedule_date, "yyyy-MM-dd")
        : undefined,
      vendor_id: formData.vendor_id || undefined,
    });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const renderStepIndicators = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            step === s
              ? "w-8 bg-slate-900"
              : s < step
                ? "w-4 bg-emerald-500"
                : "w-4 bg-slate-200",
          )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-900 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Wrench className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight italic">
                Plan Asset Cycle
              </DialogTitle>
              <DialogDescription className="text-white/50 text-xs font-bold uppercase tracking-widest">
                {step === 1 && "Vehicle & Service Type"}
                {step === 2 && "Scheduling Parameters"}
                {step === 3 && "Venders & Checklists"}
                {step === 4 && "Review & Notifications"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 bg-white">
          {renderStepIndicators()}

          {/* Step 1: Vehicle & Service */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Target Vehicle
                </Label>
                {preselectedVehicleId ? (
                  // Locked — vehicle is pre-selected from context
                  <div className="flex items-center gap-3 h-12 px-4 rounded-xl border border-slate-100 bg-slate-50/50">
                    <Car className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-bold uppercase text-xs tracking-tight text-slate-800 flex-1">
                      {preselectedVehicleReg ?? preselectedVehicleId}
                    </span>
                    <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-black uppercase tracking-widest">
                      Selected
                    </Badge>
                  </div>
                ) : (
                  <Popover open={vehicleDropdownOpen} onOpenChange={setVehicleDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-slate-900 font-bold uppercase text-xs tracking-tight px-4"
                      >
                        {formData.vehicle_id ? (
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-slate-400" />
                            <span>
                              {
                                vehicleData?.data?.find(
                                  (v: any) =>
                                    v.id.toString() === formData.vehicle_id,
                                )?.attributes.registration_number
                              }
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            Select an Asset
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Search registration number..." />
                        <CommandList className="max-h-[250px]">
                          <CommandEmpty>No asset found.</CommandEmpty>
                          <CommandGroup>
                            {vehicleData?.data?.map((v: any) => (
                              <CommandItem
                                key={v.id}
                                value={v.attributes.registration_number}
                                onSelect={() => {
                                  setFormData({
                                    ...formData,
                                    vehicle_id: v.id.toString(),
                                  });
                                  setVehicleDropdownOpen(false);
                                }}
                                className="font-bold uppercase text-[10px] tracking-tight py-3 px-4"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.vehicle_id === v.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>
                                    {v.attributes.registration_number}
                                  </span>
                                  <span className="text-[9px] text-slate-400 italic">
                                    {v.attributes.make} {v.attributes.model}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Service Category
                </Label>
                <Popover open={serviceCategoryOpen} onOpenChange={setServiceCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-12 rounded-xl border-slate-100 bg-slate-50/50 focus:ring-slate-900 font-bold uppercase text-xs tracking-tight px-4"
                    >
                      {formData.service_type ? (
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-slate-400" />
                          <span>
                            {
                              SERVICE_TYPES.find(
                                (t) => t.value === formData.service_type,
                              )?.label
                            }
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">
                          What kind of service?
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl"
                    align="start"
                  >
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {SERVICE_TYPES.map((t) => (
                            <CommandItem
                              key={t.value}
                              value={t.label}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  service_type: t.value,
                                });
                                setServiceCategoryOpen(false);
                              }}
                              className="font-bold uppercase text-[10px] tracking-tight py-3 px-4"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.service_type === t.value
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {t.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Brief Description
                </Label>
                <Textarea
                  className="rounded-xl border-slate-100 bg-slate-50/50 min-h-[100px] font-medium text-sm focus:ring-slate-900"
                  placeholder="Enter any specific details about this service cycle..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Step 2: Schedule Params */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                <div className="flex gap-2">
                  <button
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.schedule_type === "time"
                        ? "bg-slate-900 text-white shadow-xl"
                        : "bg-white text-slate-400 border border-slate-100",
                    )}
                    onClick={() =>
                      setFormData({ ...formData, schedule_type: "time" })
                    }
                  >
                    Time Based
                  </button>
                  <button
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.schedule_type === "mileage"
                        ? "bg-slate-900 text-white shadow-xl"
                        : "bg-white text-slate-400 border border-slate-100",
                    )}
                    onClick={() =>
                      setFormData({ ...formData, schedule_type: "mileage" })
                    }
                  >
                    Mileage Based
                  </button>
                </div>
              </div>

              {formData.schedule_type === "time" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Every
                      </Label>
                      <Input
                        type="number"
                        className="h-12 rounded-xl border-slate-100 bg-slate-50"
                        placeholder="e.g. 3"
                        value={formData.interval_value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            interval_value: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Unit
                      </Label>
                      <Popover open={unitDropdownOpen} onOpenChange={setUnitDropdownOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold uppercase text-xs tracking-tight px-4"
                          >
                            {formData.interval_unit
                              ? formData.interval_unit
                              : "Select Unit"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl"
                          align="start"
                        >
                          <Command>
                            <CommandList>
                              <CommandGroup>
                                {[
                                  { value: "days", label: "Days" },
                                  { value: "weeks", label: "Weeks" },
                                  { value: "months", label: "Months" },
                                ].map((unit) => (
                                  <CommandItem
                                    key={unit.value}
                                    value={unit.label}
                                    onSelect={() => {
                                      setFormData({
                                        ...formData,
                                        interval_unit: unit.value as any,
                                      });
                                      setUnitDropdownOpen(false);
                                    }}
                                    className="font-bold uppercase text-[10px] tracking-tight py-3 px-4"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.interval_unit === unit.value
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {unit.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Initial Date
                    </Label>
                    <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full h-12 justify-start text-left font-bold uppercase text-xs tracking-tight rounded-xl border-slate-100 bg-slate-50",
                            !formData.schedule_date && "text-slate-400",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.schedule_date
                            ? format(formData.schedule_date, "PPP")
                            : "Pick a start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 rounded-2xl border-slate-100"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={formData.schedule_date}
                          onSelect={(d) => {
                            setFormData({ ...formData, schedule_date: d });
                            setDatePopoverOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Interval (KM)
                    </Label>
                    <Input
                      type="number"
                      className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold uppercase text-xs"
                      placeholder="e.g. 5000"
                      value={formData.interval_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interval_value: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-tight text-slate-900 italic">
                    Recurring Cycle
                  </Label>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    Auto-schedule next occurrence
                  </p>
                </div>
                <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, is_recurring: c })
                  }
                />
              </div>
            </div>
          )}

          {/* Step 3: Vendors & Checklists */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Service Provider
                  </Label>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Optional — assign later
                  </span>
                </div>
                <Popover open={vendorDropdownOpen} onOpenChange={setVendorDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold uppercase text-xs tracking-tight px-4"
                    >
                      {formData.vendor_id ? (
                        <span>
                          {
                            vendorData?.data?.find(
                              (v: any) =>
                                v.id.toString() === formData.vendor_id,
                            )?.attributes.business_name
                          }
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Select Preferred Vendor
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search vendor..." />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>No vendor found.</CommandEmpty>
                        <CommandGroup>
                          {formData.vendor_id && (
                            <CommandItem
                              value="__clear__"
                              onSelect={() => {
                                setFormData({ ...formData, vendor_id: "" });
                                setVendorDropdownOpen(false);
                              }}
                              className="font-bold uppercase text-[10px] tracking-tight py-3 px-4 text-slate-400"
                            >
                              Clear selection
                            </CommandItem>
                          )}
                          {vendorData?.data?.map((v: any) => (
                            <CommandItem
                              key={v.id}
                              value={v.attributes.business_name}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  vendor_id: v.id.toString(),
                                });
                                setVendorDropdownOpen(false);
                              }}
                              className="font-bold uppercase text-[10px] tracking-tight py-3 px-4"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.vendor_id === v.id.toString()
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {v.attributes.business_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Standard Checklists
                </Label>

                {/* Selected Checklists Display */}
                {formData.checklists.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.checklists.map((checklistId) => {
                      const checklistName =
                        (
                          checklistData?.data?.checklists?.find(
                            (c: any) => Number(c.id) === checklistId,
                          ) as any
                        )?.attributes?.name || "Checklist";
                      return (
                        <Badge
                          key={checklistId}
                          className="bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] uppercase tracking-tight py-1.5 px-2.5 flex items-center gap-1.5"
                        >
                          {checklistName}
                          <button
                            onClick={() => {
                              setFormData({
                                ...formData,
                                checklists: formData.checklists.filter(
                                  (id) => id !== checklistId,
                                ),
                              });
                            }}
                            className="ml-1 hover:text-blue-900 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Searchable Dropdown */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold uppercase text-xs tracking-tight px-4"
                    >
                      {formData.checklists.length > 0 ? (
                        <span className="text-slate-700">
                          {formData.checklists.length} selected
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Search & Select Checklists
                        </span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="Search checklists..."
                        value={checklistSearch}
                        onValueChange={setChecklistSearch}
                      />
                      <CommandList className="max-h-[300px]">
                        {checklistData?.data?.checklists &&
                        checklistData.data.checklists.filter((c: any) =>
                          c?.attributes?.name
                            ?.toLowerCase()
                            .includes(checklistSearch.toLowerCase()),
                        ).length > 0 ? (
                          <CommandGroup>
                            {checklistData.data.checklists
                              .filter((c: any) =>
                                c?.attributes?.name
                                  ?.toLowerCase()
                                  .includes(checklistSearch.toLowerCase()),
                              )
                              .map((c: any) => (
                                <CommandItem
                                  key={c.id}
                                  value={c.attributes.name}
                                  onSelect={() => {
                                    const numId = Number(c.id);
                                    const isSelected =
                                      formData.checklists.includes(numId);
                                    if (isSelected) {
                                      setFormData({
                                        ...formData,
                                        checklists: formData.checklists.filter(
                                          (id) => id !== numId,
                                        ),
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        checklists: [
                                          ...formData.checklists,
                                          numId,
                                        ],
                                      });
                                    }
                                  }}
                                  className="font-bold uppercase text-[10px] tracking-tight py-3 px-4 cursor-pointer"
                                >
                                  <Checkbox
                                    checked={formData.checklists.includes(Number(c.id))}
                                    onCheckedChange={() => {}}
                                    className="mr-2"
                                  />
                                  <div className="flex-1">
                                    <p className="font-bold">
                                      {c.attributes.name}
                                    </p>
                                    {c.attributes.description && (
                                      <p className="text-[9px] text-slate-500 font-normal">
                                        {c.attributes.description}
                                      </p>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        ) : (
                          <CommandEmpty>
                            <div className="p-4 text-center space-y-3">
                              <p className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                                No Checklist Found
                              </p>
                              <p className="text-[10px] text-slate-500 mb-3">
                                "{checklistSearch}" is not available
                              </p>
                              <Button
                                onClick={() => {
                                  setShowCreateChecklistModal(true);
                                }}
                                size="sm"
                                className="w-full bg-slate-900 hover:bg-slate-800 font-black uppercase text-[10px] tracking-tight h-9"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Create
                                New
                              </Button>
                            </div>
                          </CommandEmpty>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Step 4: Finalize */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-slate-900 rounded-2xl text-white space-y-4">
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                      Schedule Summary
                    </p>
                    <h3 className="text-lg font-black italic uppercase tracking-tight leading-none">
                      {SERVICE_TYPES.find(
                        (t) => t.value === formData.service_type,
                      )?.label || "Maintenance"}
                    </h3>
                  </div>
                  <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-black uppercase text-[9px]">
                    {formData.schedule_type}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                      Asset ID
                    </p>
                    <p className="text-xs font-bold italic">
                      {preselectedVehicleReg ??
                        vehicleData?.data?.find(
                          (v: any) => v.id.toString() === formData.vehicle_id,
                        )?.attributes?.registration_number ??
                        "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                      Interval
                    </p>
                    <p className="text-xs font-bold italic">
                      {formData.interval_value}{" "}
                      {formData.schedule_type === "time"
                        ? formData.interval_unit
                        : "KM"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-xs font-black uppercase tracking-tight text-slate-900 italic">
                    Push Notifications
                  </Label>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    Notify when cycle approaches
                  </p>
                </div>
                <Switch
                  checked={formData.turn_on_notification}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, turn_on_notification: c })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Internal Audit Note
                </Label>
                <Input
                  className="h-12 rounded-xl border-slate-100 bg-slate-50 font-medium text-sm"
                  placeholder="Optional note for maintenance logs..."
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 bg-slate-50/80 border-t border-slate-100 sm:justify-between flex-row gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={step === 1 ? () => onOpenChange(false) : prevStep}
            className="font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900"
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={step === 4 ? onSubmit : nextStep}
            disabled={
              isPending ||
              (step === 1 && (!formData.vehicle_id || !formData.service_type))
            }
            className={cn(
              "px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all",
              step === 4
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-slate-900 hover:bg-slate-800",
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : step === 4 ? (
              "Authorize Plan"
            ) : (
              <>
                {step === 1 ? "Configure Logic" : "Continue"}{" "}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Create Checklist Modal */}
      <Dialog
        open={showCreateChecklistModal}
        onOpenChange={setShowCreateChecklistModal}
      >
        <DialogContent className="sm:max-w-[400px] rounded-2xl border-none shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-black uppercase tracking-tight italic">
              Create New Checklist
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              Add a standard checklist to your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Checklist Name
              </Label>
              <Input
                className="h-10 rounded-lg border-slate-100 bg-slate-50/50 font-medium text-sm focus:ring-slate-900"
                placeholder="e.g., Oil Change Kit"
                value={newChecklistForm.name}
                onChange={(e) =>
                  setNewChecklistForm({
                    ...newChecklistForm,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Description
              </Label>
              <Textarea
                className="rounded-lg border-slate-100 bg-slate-50/50 min-h-[80px] font-medium text-sm focus:ring-slate-900"
                placeholder="Brief description of this checklist..."
                value={newChecklistForm.description}
                onChange={(e) =>
                  setNewChecklistForm({
                    ...newChecklistForm,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowCreateChecklistModal(false);
                setNewChecklistForm({ name: "", description: "" });
              }}
              className="flex-1 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!newChecklistForm.name.trim()) {
                  toast.error("Please enter a checklist name");
                  return;
                }
                handleCreateChecklist({
                  name: newChecklistForm.name,
                  description: newChecklistForm.description,
                });
              }}
              disabled={isCreatingChecklist || !newChecklistForm.name.trim()}
              className="flex-1 bg-slate-900 hover:bg-slate-800 font-black uppercase text-[10px] tracking-widest"
            >
              {isCreatingChecklist ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" /> Create
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
