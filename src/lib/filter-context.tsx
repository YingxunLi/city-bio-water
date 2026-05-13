import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { CITIES, type City, distanceKm, generateBio, generateStadt, generateWasser } from "./mock-data";
import { realStadtTowns } from "./real-data";

export type TimeRange = 7 | 30 | 90 | 365 | 9999;

type Ctx = {
  city: City;
  setCity: (id: string) => void;
  radiusKm: number;
  setRadiusKm: (n: number) => void;
  range: TimeRange;
  setRange: (r: TimeRange) => void;
  cities: City[];
  data: {
    wasser: ReturnType<typeof generateWasser>;
    stadt: ReturnType<typeof generateStadt>;
    bio: ReturnType<typeof generateBio>;
  };
  // unfiltered counts (for header "live" feel)
  totals: { wasser: number; stadt: number; bio: number };
  lastUpdated: Date;
};

const FilterCtx = createContext<Ctx | null>(null);

const STUTTGART = CITIES[0];

export function FilterProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityId] = useState<string>(STUTTGART.id);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [range, setRange] = useState<TimeRange>(90);
  const [lastUpdated] = useState(new Date());

  const city = useMemo(() => CITIES.find((c) => c.id === cityId) ?? STUTTGART, [cityId]);

  const raw = useMemo(
    () => ({
      wasser: generateWasser(city),
      stadt: generateStadt(city),
      bio: generateBio(city),
    }),
    [city],
  );

  const data = useMemo(() => {
    const cutoff = Date.now() - range * 86400_000;
    const center: [number, number] = [city.lat, city.lon];
    const inside = <T extends { lat: number; lon: number; date: string }>(p: T) =>
      new Date(p.date).getTime() >= cutoff &&
      distanceKm(center, [p.lat, p.lon]) <= radiusKm;
    return {
      wasser: raw.wasser.filter(inside),
      stadt: raw.stadt.filter(inside),
      bio: raw.bio.filter(inside),
    };
  }, [raw, city, radiusKm, range]);

  const totals = {
    wasser: raw.wasser.length,
    stadt: raw.stadt.length,
    bio: raw.bio.length,
  };

  return (
    <FilterCtx.Provider
      value={{
        city,
        setCity: setCityId,
        radiusKm,
        setRadiusKm,
        range,
        setRange,
        cities: CITIES,
        data,
        totals,
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
