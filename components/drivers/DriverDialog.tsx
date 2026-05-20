"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDriver, updateDriver } from "@/lib/api/drivers";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { UserProfile } from "@/types";

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "add" | "edit";
  initialData?: UserProfile | null;
}

export function DriverDialog({
  open,
  onOpenChange,
  mode = "add",
  initialData,
}: DriverDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    f_name: "",
    l_name: "",
    email: "",
    phone_number: "",
    employee_id: "",
    date_of_birth: "",
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        // Normalize date_of_birth to YYYY-MM-DD for <input type="date">
        // API may return "1986/10/02" (slashes) or "1986-10-02T00:00:00Z" (ISO)
        const rawDob = initialData.attributes.date_of_birth || "";
        const dob = rawDob
          ? rawDob.replace(/\//g, "-").split("T")[0]
          : "";

        setFormData({
          f_name: initialData.attributes.first_name || "",
          l_name: initialData.attributes.last_name || "",
          email: initialData.attributes.email || "",
          phone_number: initialData.attributes.phone_number || "",
          employee_id: initialData.attributes.employee_id || "",
          date_of_birth: dob,
        });
      } else if (mode === "add") {
        setFormData({
          f_name: "",
          l_name: "",
          email: "",
          phone_number: "",
          employee_id: "",
          date_of_birth: "",
        });
      }
    }
  }, [open, mode, initialData]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      mode === "edit" && initialData
        ? updateDriver(initialData.id, data)
        : createDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      if (mode === "edit" && initialData) {
        queryClient.invalidateQueries({
          queryKey: ["driver", initialData.id.toString()],
        });
      }
      toast.success(
        mode === "edit"
          ? "Driver updated successfully"
          : "Driver created successfully",
      );
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || `Failed to ${mode} driver`;
      toast.error(msg);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-137.5">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Edit Driver" : "Add New Driver"}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Update the driver details in the system."
                : "Enter the driver's details to register them in the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="f_name">First Name</Label>
                <Input
                  id="f_name"
                  name="f_name"
                  value={formData.f_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l_name">Last Name</Label>
                <Input
                  id="l_name"
                  name="l_name"
                  value={formData.l_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address{" "}
                  {mode === "edit" && (
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(cannot be changed)</span>
                  )}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={mode === "edit"}
                  className={mode === "edit" ? "bg-slate-50 text-slate-500" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : mode === "edit" ? (
                "Save Changes"
              ) : (
                "Save Driver"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
