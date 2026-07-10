"use client";

import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StreetViewModalProps {
  lat: number;
  lng: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StreetViewModal({
  lat,
  lng,
  open,
  onOpenChange,
}: StreetViewModalProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="size-4" />
            Street View
          </DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full bg-slate-100">
          {apiKey ? (
            <iframe
              key={`${lat},${lng}`}
              title="Street View"
              className="h-full w-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}`}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
              Street View is unavailable — set NEXT_PUBLIC_GOOGLE_STREETVIEW_KEY
              to enable it.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
