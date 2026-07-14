// Real iNaturalist data via the Parkli dashboard API.
// Runs server-side (TanStack Start server fn) so there is no CORS issue and it
// works identically in dev (vite dev server) and prod (Cloudflare Worker).
//
// Endpoint: GET /inaturalist/nearby (InaturalistObservationSlimSchema[])
//   query: lat, lon, radius_km (required) · days, skip, limit (optional)

import { createServerFn } from "@tanstack/react-start";
import { type BioCategory, type BioPoint, BIO_CATEGORIES } from "./mock-data";

const API_BASE =
  (typeof process !== "undefined" && process.env?.PARKLI_API_BASE) || "https://dash.parkli.de/api";

// One observation as returned by /inaturalist/nearby.
type SlimObservation = {
  id: number | null;
  observed_on: string | null;
  quality_grade: string | null;
  latitude: number | null;
  longitude: number | null;
  place_guess: string | null;
  species_guess: string | null;
  taxon_name: string | null;
  taxon_rank: string | null;
  taxon_preferred_common_name: string | null;
  taxon_iconic_taxon_name: string | null;
  taxon_native: boolean | null;
  taxon_introduced: boolean | null;
  taxon_endemic: boolean | null;
  taxon_threatened: boolean | null;
  taxon_default_photo_square_url: string | null;
  user_login: string | null;
};

const KNOWN_CATEGORIES = new Set<string>(BIO_CATEGORIES);

// Map the API's iconic taxon name onto our category union; unknown iconic
// taxa (e.g. Chromista, Protozoa) fall back to the generic "Animalia".
function toCategory(iconic: string | null): BioCategory {
  if (iconic && KNOWN_CATEGORIES.has(iconic)) return iconic as BioCategory;
  return "Animalia";
}

function toBioPoint(o: SlimObservation): BioPoint | null {
  const lat = o.latitude;
  const lon = o.longitude;
  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null;
  }
  const species = (
    o.taxon_name ||
    o.species_guess ||
    o.taxon_preferred_common_name ||
    "Unbekannt"
  ).trim();
  const date = o.observed_on ? new Date(o.observed_on).toISOString() : new Date().toISOString();
  return {
    id: String(o.id ?? `${lat},${lon}`),
    lat,
    lon,
    category: toCategory(o.taxon_iconic_taxon_name),
    species,
    invasive: o.taxon_introduced === true,
    threatened: o.taxon_threatened === true,
    date,
    commonName: o.taxon_preferred_common_name || undefined,
    place: o.place_guess || undefined,
    photo: o.taxon_default_photo_square_url || undefined,
    quality: o.quality_grade || undefined,
    native: o.taxon_native ?? undefined,
    observer: o.user_login || undefined,
    raw: o,
  };
}

export type BioQueryParams = {
  lat: number;
  lon: number;
  radiusKm: number;
  /** Time filter in days. `null`/omitted = all time. */
  days?: number | null;
  /** Hard cap on how many observations to pull (paginated). */
  max?: number;
};

const PAGE_SIZE = 200;

// Server fn: fetch nearby observations, paginating up to `max`, mapped to BioPoint[].
export const fetchBioObservations = createServerFn({ method: "GET" })
  .inputValidator((params: BioQueryParams) => params)
  .handler(async ({ data }): Promise<BioPoint[]> => {
    const { lat, lon, radiusKm, days, max = 3000 } = data;
    console.log("[bio] fetch params:", { lat, lon, radiusKm, days });
    const out: BioPoint[] = [];

    for (let skip = 0; skip < max; skip += PAGE_SIZE) {
      const limit = Math.min(PAGE_SIZE, max - skip);
      const url = new URL(`${API_BASE}/inaturalist/nearby`);
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));
      url.searchParams.set("radius_km", String(radiusKm));
      if (days != null) url.searchParams.set("days", String(days));
      url.searchParams.set("skip", String(skip));
      url.searchParams.set("limit", String(limit));

      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) {
        throw new Error(
          `iNaturalist API ${res.status}: ${await res.text().catch(() => res.statusText)}`,
        );
      }
      const batch = (await res.json()) as SlimObservation[];
      for (const o of batch) {
        const p = toBioPoint(o);
        if (p) out.push(p);
      }
      if (batch.length < limit) break; // last page
    }

    return out;
  });
