"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Pause, Play, Search, Download, Copy, ChevronDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePacketStreamStore } from "@/store/packetStreamStore";
import type { PacketType, PacketStreamEntry } from "@/lib/packetStream";
import { toast } from "sonner";

const PACKET_TYPES: (PacketType | "all")[] = ["all", "Location", "Status", "Fuel", "Device", "Alarm"];

const TYPE_BADGE: Record<PacketType, string> = {
  Location: "bg-blue-50 text-blue-700 border-blue-200",
  Status: "bg-slate-100 text-slate-600 border-slate-200",
  Fuel: "bg-amber-50 text-amber-700 border-amber-200",
  Device: "bg-purple-50 text-purple-700 border-purple-200",
  Alarm: "bg-rose-50 text-rose-700 border-rose-200",
};

function PacketRow({ entry, isExpanded, onToggle }: { entry: PacketStreamEntry; isExpanded: boolean; onToggle: () => void }) {
  const relativeTime = new Date(entry.receivedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(entry.raw, null, 2));
    toast.success("Packet JSON copied");
  };

  return (
    <div className="border-b border-slate-50 last:border-0 animate-in slide-in-from-top-2 duration-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-[9px] font-bold text-slate-400 font-mono w-16 shrink-0">{relativeTime}</span>
        <span
          className={cn(
            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 w-16 text-center",
            TYPE_BADGE[entry.type],
          )}
        >
          {entry.type}
        </span>
        <span className="text-[10px] text-slate-600 flex-1 truncate">{entry.summary}</span>
        <ChevronDown className={cn("h-3 w-3 text-slate-300 shrink-0 transition-transform", isExpanded && "rotate-180")} />
      </button>
      {isExpanded && (
        <div className="px-2 pb-3 pl-18">
          <div className="relative bg-slate-900 rounded-lg p-3">
            <button
              onClick={copyJson}
              className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Copy JSON"
            >
              <Copy className="h-3 w-3" />
            </button>
            <pre className="text-[9px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(entry.raw, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

interface PacketStreamTabProps {
  vehicleId: string;
  plate?: string;
}

export function PacketStreamTab({ vehicleId, plate }: PacketStreamTabProps) {
  const buffer = usePacketStreamStore((s) => s.buffers[vehicleId]) ?? [];
  const isPaused = usePacketStreamStore((s) => s.isPaused);
  const maxRows = usePacketStreamStore((s) => s.maxRows);
  const droppedCount = usePacketStreamStore((s) => s.droppedWhilePaused[vehicleId]) ?? 0;
  const setPaused = usePacketStreamStore((s) => s.setPaused);

  const [typeFilter, setTypeFilter] = useState<PacketType | "all">("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return buffer.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (search) {
        const haystack = `${entry.summary} ${JSON.stringify(entry.raw)}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [buffer, typeFilter, search]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const exportPackets = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `packet-stream-${plate ?? vehicleId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-slate-100">
        <button
          onClick={() => setPaused(!isPaused)}
          className={cn(
            "h-8 px-3 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-colors",
            isPaused ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700",
          )}
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {isPaused ? "Resume" : "Live"}
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packets..."
            className="w-full h-8 pl-7 pr-2 text-[10px] bg-slate-50 border border-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <button
          onClick={exportPackets}
          disabled={filtered.length === 0}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-30 transition-colors"
          title="Export visible packets"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-1.5 px-2 py-2 overflow-x-auto no-scrollbar border-b border-slate-100">
        {PACKET_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap border transition-colors",
              typeFilter === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100 hover:border-slate-200",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {isPaused && droppedCount > 0 && (
        <div className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[9px] font-bold text-center">
          Paused — {droppedCount} event{droppedCount === 1 ? "" : "s"} not shown
        </div>
      )}

      {buffer.length >= maxRows && (
        <div className="px-3 py-1.5 bg-slate-50 text-slate-500 text-[9px] font-bold text-center">
          Showing last {maxRows} events — older events are no longer available.
        </div>
      )}

      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Radio className="h-8 w-8 text-slate-200 mx-auto mb-3" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {buffer.length === 0 ? "Waiting for packets..." : "No packets match your filters"}
            </p>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = filtered[virtualRow.index];
              return (
                <div
                  key={entry.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <PacketRow
                    entry={entry}
                    isExpanded={expandedId === entry.id}
                    onToggle={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
