// Greenspace Hack data via the Parkli dashboard API (live import pipeline).
// Endpoint: GET /green-space-hack-live/nearby
//   query: lat, lon, radius_km (required) · days, skip, limit (optional)

import { createServerFn } from "@tanstack/react-start";
import { STADT_TYPES, type StadtPoint, type StadtType } from "./mock-data";

const API_BASE =
  (typeof process !== "undefined" && process.env?.PARKLI_API_BASE) || "https://dash.parkli.de/api";

// One survey as returned by /green-space-hack-live/nearby. Unlike the old
// endpoint/CSV, this doesn't include the weighted sub-scores or an overall
// NEST score — only the categorical NESTLIKERT label and the raw per-question
// answers (AC1…AC10, AM1…AM10, NA1…NA8, NN1a/b, IN1…IN9, SA1…SA3, US1…US11, …).
type GreenspaceObservation = {
  id: number;
  name: string | null;
  town: string | null;
  latitude: number;
  longitude: number;
  gstypology: string | null;
  NESTLIKERT: string | null;
  imported_at: string | null;
  [key: string]: string | number | boolean | null;
};

const TYPE_NORMALIZE: Record<string, StadtType> = {
  "Marine/ coastal": "Marine/coastal",
  "River/stream/canal (linear)": "River/stream/canal",
};

function toStadtPoint(o: GreenspaceObservation): StadtPoint | null {
  if (!Number.isFinite(o.latitude) || !Number.isFinite(o.longitude)) return null;
  const rawType = (o.gstypology || "Civic space").trim();
  const type = (TYPE_NORMALIZE[rawType] ?? (rawType as StadtType)) as StadtType;
  const safeType: StadtType = (STADT_TYPES as readonly string[]).includes(type)
    ? type
    : "Civic space";
  return {
    id: String(o.id),
    lat: o.latitude,
    lon: o.longitude,
    // Not exposed by the live feed (no weighted score yet) — stays null,
    // same as any other "not reported" field.
    nest: null,
    shade: null,
    drinking: null,
    fountains: null,
    biodiversity: null,
    greenCare: null,
    type: safeType,
    name: (o.name || "").trim(),
    gstypology: rawType,
    date: o.imported_at ? new Date(o.imported_at).toISOString() : new Date().toISOString(),
    raw: o,
  };
}

export type StadtQueryParams = {
  lat: number;
  lon: number;
  radiusKm: number;
  days?: number | null;
  max?: number;
};

const PAGE_SIZE = 200;

export const fetchStadtObservations = createServerFn({ method: "GET" })
  .inputValidator((params: StadtQueryParams) => params)
  .handler(async ({ data }): Promise<StadtPoint[]> => {
    const { lat, lon, radiusKm, days, max = 3000 } = data;
    console.log("[stadt] fetch params:", { lat, lon, radiusKm, days });
    const out: StadtPoint[] = [];

    for (let skip = 0; skip < max; skip += PAGE_SIZE) {
      const limit = Math.min(PAGE_SIZE, max - skip);
      const url = new URL(`${API_BASE}/green-space-hack-live/nearby`);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("radius_km", String(radiusKm));
      if (days != null) url.searchParams.set("days", String(days));
      url.searchParams.set("skip", String(skip));
      url.searchParams.set("limit", String(limit));

      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) {
        throw new Error(
          `Greenspace Hack API ${res.status}: ${await res.text().catch(() => res.statusText)}`,
        );
      }
      const batch = (await res.json()) as GreenspaceObservation[];
      for (const o of batch) {
        const p = toStadtPoint(o);
        if (p) out.push(p);
      }
      if (batch.length < limit) break;
    }

    return out;
  });
