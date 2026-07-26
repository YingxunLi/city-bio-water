import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/mock-data";

interface CityInputProps {
  cities: City[];
  activeCity: City;
  onSelect: (id: string) => void;
  onCustom: (city: City) => void;
}

type GeoStatus = "idle" | "loading" | "error";

/** Nominatim-Geocoding: gibt {lat, lon, displayName} zurück oder null */
async function geocode(query: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "de", "User-Agent": "city-bio-water-app" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    displayName: data[0].display_name.split(",")[0].trim(),
  };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Freitext-Eingabe für den Ort — kein Dropdown, nur Tippen + Enter. */
export function CityInput({ cities, activeCity, onSelect, onCustom }: CityInputProps) {
  const [value, setValue] = useState(activeCity.name);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  // Keep the field in sync when the active city changes elsewhere (coord panel, etc.)
  useEffect(() => {
    setValue(activeCity.name);
    setStatus("idle");
  }, [activeCity.id, activeCity.name]);

  async function apply() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === activeCity.name) return;

    const exact = cities.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      onSelect(exact.id);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const result = await geocode(trimmed);
      if (!result) {
        setStatus("error");
        return;
      }
      onCustom({
        id: `custom-${slugify(result.displayName)}`,
        name: result.displayName,
        lat: result.lat,
        lon: result.lon,
      });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void apply();
    }
    if (e.key === "Escape") {
      setValue(activeCity.name);
      setStatus("idle");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setStatus("idle"); }}
          onKeyDown={handleKeyDown}
          onBlur={() => void apply()}
          placeholder="Stadt eingeben…"
          className={cn(
            "flex-1 min-w-0 bg-transparent p-0 h-auto",
            "font-semibold text-base leading-tight",
            "border-0 border-b border-transparent outline-none",
            "focus:border-foreground transition-colors",
            status === "error" && "text-destructive",
          )}
        />
        {status === "loading" && (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>
      {status === "error" && (
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-destructive">
          <AlertCircle className="size-3 shrink-0" />
          Ort nicht gefunden – nochmal versuchen
        </p>
      )}
    </div>
  );
}
