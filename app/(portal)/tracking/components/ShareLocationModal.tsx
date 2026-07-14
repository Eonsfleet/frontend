"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Mail, MessageCircle, MessageSquare, MapPin } from "lucide-react";

interface ShareLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Vehicle label shown in the share message (e.g. registration number). */
  label: string;
  lat: number;
  lng: number;
}

export function ShareLocationModal({ open, onOpenChange, label, lat, lng }: ShareLocationModalProps) {
  const [copied, setCopied] = useState(false);

  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const message = `Location of ${label}: ${mapUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(mapUrl);
      setCopied(true);
      toast.success("Location link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const channels = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      iconClass: "bg-emerald-50 text-emerald-600",
      onClick: () => openExternal(`https://wa.me/?text=${encodeURIComponent(message)}`),
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      iconClass: "bg-blue-50 text-blue-600",
      onClick: () =>
        openExternal(
          `mailto:?subject=${encodeURIComponent(`Location of ${label}`)}&body=${encodeURIComponent(message)}`,
        ),
    },
    {
      key: "sms",
      label: "SMS",
      icon: MessageSquare,
      iconClass: "bg-purple-50 text-purple-600",
      onClick: () => openExternal(`sms:?&body=${encodeURIComponent(message)}`),
    },
    {
      key: "maps",
      label: "Open in Maps",
      icon: MapPin,
      iconClass: "bg-amber-50 text-amber-600",
      onClick: () => openExternal(mapUrl),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Location</DialogTitle>
          <DialogDescription>
            Share {label}&apos;s current location via a channel below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {channels.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onClick}
              className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.iconClass}`}>
                <c.icon className="h-4.5 w-4.5" />
              </span>
              <span className="text-[13px] font-semibold text-slate-800">{c.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-1">
          <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">Location link</label>
          <div className="flex items-center gap-2">
            <Input readOnly value={mapUrl} className="h-9 border-slate-200 text-[13px]" onFocus={(e) => e.target.select()} />
            <Button type="button" variant="outline" className="h-9 shrink-0 gap-2" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
