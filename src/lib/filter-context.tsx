import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CITIES, type BioPoint, type City, type WasserPoint, distanceKm, generateStadt } from "./mock-data";
import { fetchBioObservations } from "./inaturalist-api";
import { fetchWasserObservations } from "./eyeonwater-api";
import { realStadtTowns } from "./real-data";

export type TimeRange = 7 | 30 | 90 | 365 | 9999;

// "Gesamt" has no real center → use a wide radius covering the German bbox.
const GESAMT_RADIUS_KM = 800;

type Ctx = {
  city: City;
  setCity: (id: string) => void;
  addCustomCity: (c: City) => void;
  radiusKm: number;
  setRadiusKm: (n: number) => void;
  range: TimeRange;
  setRange: (r: TimeRange) => void;
  cities: City[];
  isGesamt: boolean;
  data: {
    wasser: WasserPoint[];
    stadt: ReturnType<typeof generateStadt>;
    bio: BioPoint[];
  };
  totals: { wasser: number; stadt: number; bio: number };
  bioStatus: { loading: boolean; error: boolean };
  wasserStatus: { loading: boolean; error: boolean };
  lastUpdated: Date;
};

const FilterCtx = createContext<Ctx | null>(null);

// Synthetic "Gesamt" city centered on Europe (filter bypasses distance).
const GESAMT_CITY: City = { id: "gesamt", name: "Gesamt", lat: 50.8, lon: 8.5 };

const ALL_CITIES: City[] = [
  GESAMT_CITY,
  ...CITIES,
  ...realStadtTowns().filter((t) => !CITIES.some((c) => c.id === t.id)),
];
const STUTTGART = ALL_CITIES.find((c) => c.id === "stuttgart") ?? ALL_CITIES[1];

export function FilterProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityId] = useState<string>(STUTTGART.id);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [range, setRange] = useState<TimeRange>(90);
  const [lastUpdated] = useState(new Date());
  const [extraCities, setExtraCities] = useState<City[]>([]);

  function addCustomCity(c: City) {
    setExtraCities((prev) => {
      if (prev.some((x) => x.id === c.id)) return prev;
      return [...prev, c];
    });
    setCityId(c.id);
  }

  const allCities = useMemo(
    () => [...ALL_CITIES, ...extraCities.filter((c) => !ALL_CITIES.some((x) => x.id === c.id))],
    [extraCities],
  );

  const city = useMemo(() => allCities.find((c) => c.id === cityId) ?? STUTTGART, [allCities, cityId]);
  const isGesamt = city.id === "gesamt";

  const raw = useMemo(
    () => ({
      stadt: generateStadt(city),
    }),
    [city],
  );

  // Bio comes from the live iNaturalist API, already filtered server-side by
  // the active center, radius and time range.
  const effRadius = isGesamt ? GESAMT_RADIUS_KM : radiusKm;
  const days = range === 9999 ? null : range;
  const bioQuery = useQuery({
    queryKey: ["bio", city.lat, city.lon, effRadius, days],
    queryFn: () =>
      fetchBioObservations({
        data: { lat: city.lat, lon: city.lon, radiusKm: effRadius, days },
      }),
  });
  const bio = bioQuery.data ?? [];

  const wasserQuery = useQuery({
    queryKey: ["wasser", city.lat, city.lon, effRadius, days],
    queryFn: () =>
      fetchWasserObservations({
        data: { lat: city.lat, lon: city.lon, radiusKm: effRadius, days },
      }),
  });
  const wasserRaw = wasserQuery.data ?? [];
  console.log("[wasser] status:", wasserQuery.status, "data:", wasserQuery.data?.length, "error:", wasserQuery.error);

  // Stadt is CSV → filtered client-side; Wasser is now server-filtered via API.
  const filtered = useMemo(() => {
    const cutoff = Date.now() - range * 86400_000;
    const center: [number, number] = [city.lat, city.lon];
    const inside = <T extends { lat: number; lon: number; date: string }>(p: T) => {
      if (new Date(p.date).getTime() < cutoff) return false;
      if (isGesamt) return true;
      return distanceKm(center, [p.lat, p.lon]) <= radiusKm;
    };
    return {
      wasser: wasserRaw,
      stadt: raw.stadt.filter(inside),
    };
  }, [raw, wasserRaw, city, radiusKm, range, isGesamt]);

  const data = { ...filtered, bio };

  const totals = {
    wasser: wasserRaw.length,
    stadt: raw.stadt.length,
    bio: bio.length,
  };

  const bioStatus = { loading: bioQuery.isLoading, error: bioQuery.isError };

  return (
    <FilterCtx.Provider
      value={{
        city,
        setCity: setCityId,
        addCustomCity,
        radiusKm,
        setRadiusKm,
        range,
        setRange,
        cities: allCities,
        isGesamt,
        data,
        totals,
        bioStatus,
        lastUpdated,
      }}
    >
      {children}
    </FilterCtx.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterCtx);
  if (!ctx) throw new Error("useFilters must be inside FilterProvider");
  return ctx;
}
