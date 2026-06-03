import { useFilters, type TimeRange } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { Slider } from "@/components/ui/slider";
import { Clock, Radius, MapPin, ChevronRight, X } from "lucide-react";
import { CityCombobox } from "@/components/city-combobox";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ranges: { v: TimeRange; label: string }[] = [
  { v: 7, label: de.filters.last7 },
  { v: 30, label: de.filters.last30 },
  { v: 90, label: de.filters.last90 },
  { v: 365, label: de.filters.last365 },
  { v: 9999, label: de.filters.all },
];

const CoordInput = React.forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; placeholder: string; invalid: boolean }
>(({ value, onChange, placeholder, invalid }, ref) => (
  <input
    ref={ref}
    type="text"
    inputMode="decimal"
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={cn(
      "flex-1 min-w-0 bg-transparent text-sm font-semibold stat-number",
      "border-b pb-0.5 outline-none transition-colors",
      "placeholder:text-muted-foreground placeholder:font-normal placeholder:text-xs",
      invalid
        ? "border-destructive text-destructive"
        : "border-border focus:border-foreground",
    )}
  />
));
CoordInput.displayName = "CoordInput";

function CitySection() {
  const { city, setCity, addCustomCity, cities } = useFilters();

  const [coordOpen, setCoordOpen] = useState(false);
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [touched, setTouched] = useState(false);
  const latRef = useRef<HTMLInputElement>(null);

  // When a city is chosen via combobox, collapse coord panel
  const prevCityId = useRef(city.id);
  useEffect(() => {
    if (city.id !== prevCityId.current) {
      prevCityId.current = city.id;
      // Only collapse if it was a named city selection (not our own coord apply)
      if (!city.id.startsWith("coords-")) {
        setCoordOpen(false);
        setLatStr("");
        setLonStr("");
        setTouched(false);
      }
    }
  }, [city.id]);

  // Focus lat input when panel opens
  useEffect(() => {
    if (coordOpen) {
      setTimeout(() => latRef.current?.focus(), 50);
    }
  }, [coordOpen]);

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  const latValid = !isNaN(lat) && lat >= -90 && lat <= 90;
  const lonValid = !isNaN(lon) && lon >= -180 && lon <= 180;
  const canApply = latValid && lonValid;

  const latInvalid = touched && latStr !== "" && !latValid;
  const lonInvalid = touched && lonStr !== "" && !lonValid;

  function handleOpen() {
    setCoordOpen(true);
    // Pre-fill with current city coords if not already a custom coord city
    if (!city.id.startsWith("coords-")) {
      setLatStr(city.lat.toFixed(4));
      setLonStr(city.lon.toFixed(4));
    }
  }

  function handleClose() {
    setCoordOpen(false);
    setLatStr("");
    setLonStr("");
    setTouched(false);
  }

  function handleApply() {
    if (!canApply) { setTouched(true); return; }
    addCustomCity({
      id: `coords-${lat.toFixed(4)}-${lon.toFixed(4)}`,
      name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      lat,
      lon,
    });
    setCoordOpen(false);
    setTouched(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleApply();
    if (e.key === "Escape") handleClose();
  }

  return (
    <div className="flex items-start gap-3 flex-1 min-w-0">
      {/* Icon */}
      <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <MapPin className="size-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Label */}
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
          {de.filters.city}
        </div>

        {/* Combobox — dimmed when coord panel is open */}
        <div className={cn("transition-opacity", coordOpen && "opacity-40 pointer-events-none")}>
          <CityCombobox
            cities={cities}
            value={city.id}
            onSelect={setCity}
            onCustom={addCustomCity}
          />
        </div>

        {/* Coord toggle / panel */}
        {!coordOpen ? (
          <button
            onClick={handleOpen}
            className="mt-1.5 flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronRight className="size-2.5 transition-transform group-hover:translate-x-0.5" />
            Koordinaten eingeben
          </button>
        ) : (
          <div className="mt-2" onKeyDown={handleKeyDown}>
            {/* Inputs row */}
            <div className="flex items-end gap-3">
              <CoordInput
                value={latStr}
                onChange={(v) => { setLatStr(v); setTouched(false); }}
                placeholder="Breitengrad"
                invalid={latInvalid}
                ref={latRef}
              />
              <CoordInput
                value={lonStr}
                onChange={(v) => { setLonStr(v); setTouched(false); }}
                placeholder="Längengrad"
                invalid={lonInvalid}
              />
            </div>

            {/* Validation hint */}
            {touched && (!latValid || !lonValid) && (
              <p className="mt-1 text-[10px] text-destructive">
                {!latValid && !lonValid
                  ? "Ungültige Koordinaten"
                  : !latValid
                  ? "Breitengrad: −90 bis 90"
                  : "Längengrad: −180 bis 180"}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleApply}
                className={cn(
                  "text-[11px] px-3 py-0.5 rounded-full transition-all",
                  canApply
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                Anwenden
              </button>
              <button
                onClick={handleClose}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
              >
                <X className="size-2.5" />
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function FilterBar({ compact = false }: { compact?: boolean }) {
  const { isGesamt, radiusKm, setRadiusKm, range, setRange } = useFilters();

  const containerCls = compact
    ? "flex flex-col gap-3"
    : "surface-card p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-start md:gap-6";

  return (
    <div className={containerCls}>
      <CitySection />

      {/* Radius */}
      <div className={cn(
        "flex items-center gap-3 flex-1 min-w-0",
        isGesamt && "opacity-40 pointer-events-none",
      )}>
        <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Radius className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {de.filters.radius}
            </div>
            <div className="text-xs font-semibold stat-number">
              {isGesamt ? "—" : `${radiusKm} km`}
            </div>
          </div>
          <Slider
            value={[radiusKm]}
            min={1}
            max={50}
            step={1}
            onValueChange={(v) => setRadiusKm(v[0])}
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Zeitraum */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Clock className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {de.filters.timeRange}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {ranges.map((r) => (
              <button
                key={r.v}
                onClick={() => setRange(r.v)}
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full transition-all",
                  range === r.v
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}