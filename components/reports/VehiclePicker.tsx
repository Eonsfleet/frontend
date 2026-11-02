"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVehiclesDropdown } from "@/hooks/useVehiclesDropdown";
import { fieldClass } from "./ui";

/** Searchable multi-select of the organisation's vehicles, with the choice shown as removable tags. */
export function VehiclePicker({ ids, onChange, id = "vehicle-picker" }: { ids: number[]; onChange: (next: number[]) => void; id?: string }) {
  const { data: vehicles } = useVehiclesDropdown(true);
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => (vehicles?.data ?? []).map((v: { id: number | string; attributes: { registration_number?: string } }) => ({
      id: Number(v.id),
      label: v.attributes.registration_number?.toUpperCase() ?? `#${v.id}`,
    })),
    [vehicles],
  );
  const toggle = (vid: number) => onChange(ids.includes(vid) ? ids.filter((x) => x !== vid) : [...ids, vid]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-label="Vehicles"
            className={`${fieldClass} flex items-center justify-between text-left cursor-pointer`}
          >
            <span className={ids.length ? "text-slate-900" : "text-slate-500"}>
              {ids.length === 0 ? "Select vehicles…" : `${ids.length} ${ids.length === 1 ? "vehicle" : "vehicles"} selected`}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search vehicles…" />
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-xs">
              <button type="button" onClick={() => onChange(options.map((v: { id: number }) => v.id))} className="font-semibold text-blue-600 hover:underline cursor-pointer">Select all</button>
              <button type="button" onClick={() => onChange([])} disabled={ids.length === 0} className="font-semibold text-slate-500 hover:underline disabled:opacity-40 cursor-pointer">Clear</button>
            </div>
            <CommandList id={`${id}-list`} className="max-h-64">
              <CommandEmpty>No vehicles found.</CommandEmpty>
              <CommandGroup>
                {options.map((v: { id: number; label: string }) => {
                  const selected = ids.includes(v.id);
                  return (
                    <CommandItem key={v.id} value={`${v.label} ${v.id}`} onSelect={() => toggle(v.id)} className="gap-2">
                      <Checkbox checked={selected} className="shadow-none pointer-events-none" aria-hidden tabIndex={-1} />
                      <span className="flex-1 text-sm">{v.label}</span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((vid) => {
            const label = options.find((v: { id: number }) => v.id === vid)?.label ?? `#${vid}`;
            return (
              <span key={vid} className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-1 pl-2 pr-1 text-[11px] font-semibold text-slate-700">
                {label}
                <button type="button" aria-label={`Remove ${label}`} onClick={() => toggle(vid)} className="rounded-sm p-0.5 hover:bg-slate-200 cursor-pointer"><X className="h-3 w-3" /></button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
