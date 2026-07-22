import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { City } from "@/lib/mock-data";

interface CityComboboxProps {
  cities: City[];
  value: string;
  /** Currently active city, used only to render the trigger label when it's
   * a custom/coordinate location that isn't part of `cities`. */
  activeCity?: City;
  onSelect: (id: string) => void;
  onCustom?: (city: City) => void;
}

type GeoStatus = "idle" | "loading" | "error";

/** Nominatim-Geocoding: gibt {lat, lon, displayName} zurück oder null */
async function geocode(query: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("featuretype", "city");

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

export function CityCombobox({ cities, value, activeCity, onSelect, onCustom }: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  // Debounce-Timer für Nominatim-Vorschau (optional, hier nur beim Klick)
  const abortRef = useRef<AbortController | null>(null);

  const current = cities.find((c) => c.id === value) ?? (activeCity?.id === value ? activeCity : undefined);
  const displayName = current?.name ?? value;

  const exactMatch = cities.find(
    (c) => c.name.toLowerCase() === inputValue.toLowerCase(),
  );

  // Popover schließen → Status zurücksetzen
  useEffect(() => {
    if (!open) {
      setGeoStatus("idle");
      setInputValue("");
      abortRef.current?.abort();
    }
  }, [open]);

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
  }

  async function handleCustom() {
    if (!onCustom) return;
    const name = inputValue.trim();

    setGeoStatus("loading");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const result = await geocode(name);

      if (!result) {
        setGeoStatus("error");
        return;
      }

      const city: City = {
        id: `custom-${slugify(result.displayName)}`,
        name: result.displayName,
        lat: result.lat,
        lon: result.lon,
      };
      onCustom(city);
      setOpen(false);
    } catch {
      setGeoStatus("error");
    }
  }

  // Enter im Suchfeld: bei exakter Übereinstimmung diese Stadt übernehmen,
  // sonst den eingegebenen Text geokodieren (Dropdown bleibt beim Tippen verborgen).
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    e.preventDefault();
    if (exactMatch) {
      handleSelect(exactMatch.id);
    } else if (onCustom) {
      void handleCustom();
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex items-center gap-1.5 text-left w-full",
            "border-0 bg-transparent p-0 h-auto",
            "font-semibold text-base leading-tight",
            "focus:outline-none focus-visible:underline",
          )}
        >
          <span className="flex-1 truncate">{displayName}</span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="start" sideOffset={8}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Stadt suchen oder eingeben…"
            value={inputValue}
            onValueChange={(v) => {
              setInputValue(v);
              setGeoStatus("idle");
            }}
            onKeyDown={handleInputKeyDown}
          />
          <CommandList>
            {/* Dropdown nur anzeigen, solange nichts eingetippt wurde.
                Sobald der Nutzer selbst einen Namen eingibt, wird die Liste
                ausgeblendet; Enter übernimmt eine exakte Übereinstimmung
                oder geokodiert die eigene Eingabe. */}
            {inputValue.trim() === "" && (
              <CommandGroup heading="Städte">
                {cities.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.id}
                    onSelect={() => handleSelect(c.id)}
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        value === c.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {inputValue.trim() !== "" && geoStatus !== "idle" && (
              <div className="flex items-center gap-2 px-3 py-4 text-sm">
                {geoStatus === "loading" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <AlertCircle className="size-3.5 shrink-0 text-destructive" />
                )}
                <span className={cn(geoStatus === "error" && "text-destructive")}>
                  {geoStatus === "loading"
                    ? "Koordinaten werden gesucht…"
                    : "Ort nicht gefunden – nochmal versuchen"}
                </span>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}