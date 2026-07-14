// EyeOnWater data via the Parkli dashboard API.
// Endpoint: GET /eyeonwater/nearby
//   query: lat, lon, radius_km (required) · days, skip, limit (optional)

import { createServerFn } from "@tanstack/react-start";
import type { WasserPoint } from "./mock-data";

const API_BASE =
  (typeof process !== "undefined" && process.env?.PARKLI_API_BASE) ||
  "https://dash.parkli.de/api";

type EowObservation = {
  id: number;
  date_photo: string | null;
  latitude: number;
  longitude: number;
  fu_value: number | null;
  p_temperature: number | null;
  p_ph: number | null;
  p_dissolved_oxygen: number | null;
  sd_depth: number | null;
  nickname: string | null;
  image_url: string | null;
};

function toWasserPoint(o: EowObservation): WasserPoint | null {
  if (!Number.isFinite(o.latitude) || !Number.isFinite(o.longitude)) return null;
  // A null field from the API means "not reported" — keep it null so it's
  // excluded from averages instead of pulling them toward 0.
  const fu = o.fu_value != null ? Math.round(Math.abs(o.fu_value)) : null;
  return {
    id: String(o.id),
    lat: o.latitude,
    lon: o.longitude,
    fu: fu == null ? null : fu >= 1 && fu <= 21 ? fu : 10,
    ph: o.p_ph,
    transparenz: o.sd_depth,
    device: o.nickname ?? "EyeOnWater",
    date: o.date_photo
      ? new Date(o.date_photo).toISOString()
      : new Date().toISOString(),
    raw: o,
  };
}

export type WasserQueryParams = {
  lat: number;
  lon: number;
  radiusKm: number;
  days?: number | null;
  max?: number;
};

const PAGE_SIZE = 200;

export const fetchWasserObservations = createServerFn({ method: "GET" })
  .inputValidator((params: WasserQueryParams) => params)
  .handler(async ({ data }): Promise<WasserPoint[]> => {
    const { lat, lon, radiusKm, days, max = 3000 } = data;
    console.log("[wasser] fetch params:", { lat, lon, radiusKm, days });
    const out: WasserPoint[] = [];

    for (let skip = 0; skip < max; skip += PAGE_SIZE) {
      const limit = Math.min(PAGE_SIZE, max - skip);
      const url = new URL(`${API_BASE}/eye-on-water/nearby`);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("radius_km", String(radiusKm));
      if (days != null) url.searchParams.set("days", String(days));
      url.searchParams.set("skip", String(skip));
      url.searchParams.set("limit", String(limit));

      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) {
        throw new Error(
          `EyeOnWater API ${res.status}: ${await res.text().catch(() => res.statusText)}`,
        );
      }
      const batch = (await res.json()) as EowObservation[];
      for (const o of batch) {
        const p = toWasserPoint(o);
        if (p) out.push(p);
      }
      if (batch.length < limit) break;
    }

    return out;
  });
