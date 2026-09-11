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
import { extractApiError } from "@/lib/utils";

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
    dob: "",
  });
  const [errors, setErrors] = useState({
    f_name: "",
    l_name: "",
    email: "",
    phone_number: "",
    dob: "",
  });

  const NAME_PATTERN = /^[A-Za-z\s'-]*$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_PATTERN = /^\+?[0-9\s()-]*$/;
  const PHONE_DIGIT_COUNT = (value: string) =>
    (value.match(/\d/g) || []).length;
  const MIN_DRIVER_AGE = 18;

  const todayISO = () => new Date().toISOString().split("T")[0];

  const getAge = (dob: Date, today: Date) => {
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const validateField = (name: string, value: string) => {
    switch (name) {
      case "f_name":
        return value && !NAME_PATTERN.test(value)
          ? "First name cannot contain numbers or special characters"
          : "";
      case "l_name":
        return value && !NAME_PATTERN.test(value)
          ? "Last name cannot contain numbers or special characters"
          : "";
      case "email":
        return value && !EMAIL_PATTERN.test(value)
          ? "Enter a valid email address"
          : "";
      case "phone_number":
        if (!value) return "";
        if (!PHONE_PATTERN.test(value)) {
          return "Phone number can only contain digits, spaces, and + ( ) -";
        }
        if (PHONE_DIGIT_COUNT(value) < 7) {
          return "Enter a valid phone number";
        }
        return "";
      case "dob": {
        if (!value) return "";
        const dob = new Date(`${value}T00:00:00`);
        if (Number.isNaN(dob.getTime())) {
          return "Enter a valid date";
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dob.getTime() > today.getTime()) {
          return "Date of birth cannot be in the future";
        }
        if (getAge(dob, today) < MIN_DRIVER_AGE) {
          return `Driver must be at least ${MIN_DRIVER_AGE} years old`;
        }
        return "";
      }
      default:
        return "";
    }
  };

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        // Normalize dob to YYYY-MM-DD for <input type="date">
        // API may return "1986/10/02" (slashes) or "1986-10-02T00:00:00Z" (ISO)
        const rawDob = initialData.attributes.date_of_birth || "";
        const dob = rawDob ? rawDob.replace(/\//g, "-").split("T")[0] : "";

        setFormData({
          f_name: initialData.attributes.first_name || "",
          l_name: initialData.attributes.last_name || "",
          email: initialData.attributes.email || "",
          phone_number: initialData.attributes.phone_number || "",
          employee_id: initialData.attributes.employee_id || "",
          dob: dob,
        });
      } else if (mode === "add") {
        setFormData({
          f_name: "",
          l_name: "",
          email: "",
          phone_number: "",
          employee_id: "",
          dob: "",
        });
      }
      setErrors({
        f_name: "",
        l_name: "",
        email: "",
        phone_number: "",
        dob: "",
      });
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
      const msg = extractApiError(error, `Failed to ${mode} driver`);
      toast.error(msg);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = {
      f_name: validateField("f_name", formData.f_name),
      l_name: validateField("l_name", formData.l_name),
      email: validateField("email", formData.email),
      phone_number: validateField("phone_number", formData.phone_number),
      dob: validateField("dob", formData.dob),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    if (mode === "edit") {
      const { dob, ...rest } = formData;
      mutation.mutate({ ...rest, date_of_birth: dob });
    } else {
      mutation.mutate(formData);
    }
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
                  aria-invalid={!!errors.f_name}
                  className={errors.f_name ? "border-red-500" : ""}
                  required
                />
                {errors.f_name && (
                  <p className="text-xs text-red-500">{errors.f_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="l_name">Last Name</Label>
                <Input
                  id="l_name"
                  name="l_name"
                  value={formData.l_name}
                  onChange={handleChange}
                  aria-invalid={!!errors.l_name}
                  className={errors.l_name ? "border-red-500" : ""}
                  required
                />
                {errors.l_name && (
                  <p className="text-xs text-red-500">{errors.l_name}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address{" "}
                  {mode === "edit" && (
                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                      (cannot be changed)
                    </span>
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
                  aria-invalid={!!errors.email}
                  className={
                    mode === "edit"
                      ? "bg-slate-50 text-slate-500"
                      : errors.email
                        ? "border-red-500"
                        : ""
                  }
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  type="date"
                  max={todayISO()}
                  value={formData.dob}
                  onChange={handleChange}
                  aria-invalid={!!errors.dob}
                  className={errors.dob ? "border-red-500" : ""}
                />
                {errors.dob && (
                  <p className="text-xs text-red-500">{errors.dob}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={handleChange}
                  aria-invalid={!!errors.phone_number}
                  className={errors.phone_number ? "border-red-500" : ""}
                />
                {errors.phone_number && (
                  <p className="text-xs text-red-500">{errors.phone_number}</p>
                )}
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
            <Button
              type="submit"
              disabled={
                mutation.isPending || Object.values(errors).some(Boolean)
              }
            >
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
