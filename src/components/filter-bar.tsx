import { useFilters, type TimeRange } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { Slider } from "@/components/ui/slider";
import { Clock, Radius } from "lucide-react";
import { CityCombobox } from "@/components/city-combobox";

const ranges: { v: TimeRange; label: string }[] = [
  { v: 7, label: de.filters.last7 },
  { v: 30, label: de.filters.last30 },
  { v: 90, label: de.filters.last90 },
  { v: 365, label: de.filters.last365 },
  { v: 9999, label: de.filters.all },
];

export function FilterBar({ compact = false }: { compact?: boolean }) {
  const { city, setCity, addCustomCity, cities, radiusKm, setRadiusKm, range, setRange, isGesamt } = useFilters();

  const containerCls = compact
    ? "flex flex-col gap-3"
    : "surface-card p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:gap-6";

  return (
    <div className={containerCls}>
      {/* Stadt-Auswahl: Combobox mit Freitext-Eingabe */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-muted-foreground">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {de.filters.city}
          </div>
          <CityCombobox
            cities={cities}
            value={city.id}
            onSelect={setCity}
            onCustom={addCustomCity}
          />
        </div>
      </div>

      {/* Radius-Slider */}
      <div className={`flex items-center gap-3 flex-1 min-w-0 ${isGesamt ? "opacity-40 pointer-events-none" : ""}`}>
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

      {/* Zeitraum-Auswahl */}
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
                className={`text-[11px] px-2 py-0.5 rounded-full transition-all ${
                  range === r.v
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
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