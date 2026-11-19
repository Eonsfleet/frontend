import type { MapStyleKey } from "./mapboxStyles";

/**
 * One Google Cloud key powers Map Tiles (live tracking + playback), Geocoding and Street View.
 * With no key, callers fall back to free OpenStreetMap/Esri tiles — nothing errors.
 */
export function getGoogleMapsKey(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || null;
}

const sessions = new Map<string, Promise<string>>();

/** Official Map Tiles API (2D). Sessions are cached per style for the page lifetime. */
export function getGoogleTileSession(styleKey: string, key: string): Promise<string> {
  const style = (["standard", "satellite", "hybrid"].includes(styleKey) ? styleKey : "standard") as MapStyleKey;
  const cacheKey = `${style}:${key}`;
  const cached = sessions.get(cacheKey);
  if (cached) return cached;

  const body = {
    mapType: style === "standard" ? "roadmap" : "satellite",
    language: "en-US",
    region: "NG",
    ...(style === "hybrid" ? { layerTypes: ["layerRoadmap"] } : {}),
  };
  const p = fetch(`https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Google createSession failed (${res.status})`);
      const json = (await res.json()) as { session?: string };
      if (!json.session) throw new Error("Google createSession returned no session");
      return json.session;
    })
    .catch((err) => {
      sessions.delete(cacheKey);
      throw err;
    });
  sessions.set(cacheKey, p);
  return p;
}

export function googleTileUrl(session: string, key: string): string {
  return `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${session}&key=${encodeURIComponent(key)}`;
}
