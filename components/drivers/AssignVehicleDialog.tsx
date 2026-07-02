"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVehicles, assignDriver } from "@/lib/api/vehicles";
import { toast } from "sonner";
import { Car, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn, extractApiError } from "@/lib/utils";

interface AssignVehicleDialogProps {
  driverId: string | number;
  driverName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignVehicleDialog({
  driverId,
  driverName,
  isOpen,
  onClose,
}: AssignVehicleDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>("");
  const queryClient = useQueryClient();

  const { data: vehiclesResponse, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles-list-simple"],
    queryFn: () => getVehicles({ per_page: 100 }),
    enabled: isOpen,
  });

  const { mutate: doAssign, isPending: isAssigning } = useMutation({
    mutationFn: () => assignDriver(selectedVehicleId, driverId),
    onSuccess: (data) => {
      toast.success(data.message || "Vehicle assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(extractApiError(error, "Failed to assign vehicle"));
    },
  });

  const handleAssign = () => {
    if (!selectedVehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    doAssign();
  };

  const selectedVehicle = vehiclesResponse?.data.find(
    (v) => v.id.toString() === selectedVehicleId,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Assign Vehicle</DialogTitle>
          <DialogDescription>
            Select a vehicle to assign to driver{" "}
            <span className="font-bold text-slate-900">{driverName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Available Vehicles
            </label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between font-normal border-slate-200 h-10"
                  disabled={isLoadingVehicles || isAssigning}
                >
                  {selectedVehicle ? (
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-slate-400" />
                      <span>
                        {selectedVehicle.attributes.registration_number} -{" "}
                        {selectedVehicle.attributes.make}{" "}
                        {selectedVehicle.attributes.model}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">
                      {isLoadingVehicles
                        ? "Loading vehicles..."
                        : "Select a vehicle"}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search vehicle..." />
                  <CommandList className="max-h-50">
                    <CommandEmpty>No vehicle found.</CommandEmpty>
                    <CommandGroup>
                      {vehiclesResponse?.data
                        ?.filter(
                          (v) =>
                            (v?.attributes as any)?.is_assigned_to_driver !==
                            true,
                        )
                        ?.map((vehicle) => (
                          <CommandItem
                            key={vehicle.id}
                            value={`${vehicle.attributes.registration_number} ${vehicle.attributes.make} ${vehicle.attributes.model}`}
                            onSelect={() => {
                              setSelectedVehicleId(vehicle.id.toString());
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedVehicleId === vehicle.id.toString()
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span>
                                {vehicle.attributes.registration_number}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono italic">
                                {vehicle.attributes.make}{" "}
                                {vehicle.attributes.model} (
                                {vehicle.attributes.year})
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedVehicleId || isAssigning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
