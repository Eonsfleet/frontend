import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import * as trackingApi from "@/lib/api/tracking";

interface UsePlaybackDataProps {
  isReplayOpen: boolean;
  selectedVehicleId: string | null;
  playbackType: "trip" | "history";
  ongoingTripsData: any[];
  dateRange: DateRange | undefined;
}

export function usePlaybackData({
  isReplayOpen,
  selectedVehicleId,
  playbackType,
  ongoingTripsData,
  dateRange,
}: UsePlaybackDataProps) {
  const [playbackData, setPlaybackData] = useState<any[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlayingPlayback, setIsPlayingPlayback] = useState(false);
  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);

  useEffect(() => {
    const fetchPlayback = async () => {
      if (!isReplayOpen || !selectedVehicleId) {
        setPlaybackData([]);
        setPlaybackIndex(0);
        setIsPlayingPlayback(false);
        return;
      }

      setIsLoadingPlayback(true);
      try {
        const selectedTrip = ongoingTripsData.find(
          (t) => t.vehicleId === selectedVehicleId,
        );

        if (playbackType === "trip" && selectedTrip) {
          const res = await trackingApi.getTripPlayback(
            selectedVehicleId,
            selectedTrip.id,
          );
          setPlaybackData(res.data?.gps_points || res.gps_points || []);
        } else {
          // GPS history — API enforces 24h max window
          const end = dateRange?.to ?? new Date();
          const maxStart = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          const from = dateRange?.from ?? maxStart;
          const start = from < maxStart ? maxStart : from;
          const res = await trackingApi.getVehiclePlayback(
            selectedVehicleId,
            start.toISOString(),
            end.toISOString(),
          );
          const raw: any[] = res.data || res || [];
          setPlaybackData(
            raw.map((p: any) => ({
              lat: p.latitude ?? p.lat,
              lng: p.longitude ?? p.lng,
              speed: p.speed ?? 0,
              heading: p.heading ?? 0,
              timestamp: p.timestamp ?? p.gps_datetime,
            })),
          );
        }
        setPlaybackIndex(0);
      } catch (err) {
        console.error("Failed to fetch playback telemetry:", err);
      } finally {
        setIsLoadingPlayback(false);
      }
    };
    fetchPlayback();
  }, [isReplayOpen, selectedVehicleId, playbackType, ongoingTripsData]);

  return {
    playbackData,
    playbackIndex,
    setPlaybackIndex,
    isPlayingPlayback,
    setIsPlayingPlayback,
    isLoadingPlayback,
  };
}
