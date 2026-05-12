import { useFilters, type TimeRange } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MapPin, Clock, Radius } from "lucide-react";

const ranges: { v: TimeRange; label: string }[] = [
  { v: 7, label: de.filters.last7 },
  { v: 30, label: de.filters.last30 },
  { v: 90, label: de.filters.last90 },
  { v: 365, label: de.filters.last365 },
  { v: 9999, label: de.filters.all },
];

export function FilterBar({ compact = false }: { compact?: boolean }) {
  const { city, setCity, cities, radiusKm, setRadiusKm, range, setRange } = useFilters();

  const containerCls = compact
    ? "flex flex-col gap-3"
    : "surface-card p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:gap-6";

  return (
    <div className={containerCls}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <MapPin className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {de.filters.city}
          </div>
          <Select value={city.id} onValueChange={setCity}>
            <SelectTrigger className="border-0 shadow-none p-0 h-auto font-semibold text-base focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Radius className="size-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {de.filters.radius}
            </div>
            <div className="text-xs font-semibold stat-number">{radiusKm} km</div>
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
