// Greenspace Hack data via the Parkli dashboard API.
// Endpoint: GET /green-space-hack-live/nearby
//   query: lat, lon, radius_km (required) · skip, limit (optional)
//
// The data owner's team fixed the "-live" feed to also carry the
// server-side NEST weighting (AC_WT/AM_WT/NA_WT/NN_WT/US_WT +
// overall_nest_score), same as "-clean" — so we're back on "-live" for
// its real imported_at timestamps.
// Note: per the data owner, the scoring logic assumes a fully-filled-out
// GSH questionnaire — a partially answered survey can legitimately compute
// to a low/0 score rather than "no data".

import { createServerFn } from "@tanstack/react-start";
import { STADT_TYPES, type StadtPoint, type StadtType } from "./mock-data";

const API_BASE =
  (typeof process !== "undefined" && process.env?.PARKLI_API_BASE) || "https://dash.parkli.de/api";

// One survey as returned by /green-space-hack-live/nearby.
type GreenspaceObservation = {
  id: number;
  name: string | null;
  town: string | null;
  latitude: number;
  longitude: number;
  gstypology: string | null;
  NESTLIKERT: string | null;
  AC_WT: number | null; // access → "fountains" (paths/entry)
  AM_WT: number | null; // amenities → "drinking"
  NA_WT: number | null; // natural area → "biodiversity"
  NN_WT: number | null; // natural notable → "shade"
  US_WT: number | null; // usability → "greenCare"
  overall_nest_score: number | null;
  imported_at: string | null;
  [key: string]: string | number | boolean | null;
};

const TYPE_NORMALIZE: Record<string, StadtType> = {
  "Marine/ coastal": "Marine/coastal",
  "River/stream/canal (linear)": "River/stream/canal",
};

function roundOrNull(v: number | null | undefined): number | null {
  return v != null && Number.isFinite(v) ? Math.round(v) : null;
}

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
    nest: roundOrNull(o.overall_nest_score),
    shade: roundOrNull(o.NN_WT),
    drinking: roundOrNull(o.AM_WT),
    fountains: roundOrNull(o.AC_WT),
    biodiversity: roundOrNull(o.NA_WT),
    greenCare: roundOrNull(o.US_WT),
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
