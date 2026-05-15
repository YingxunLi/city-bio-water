import { useMemo, useRef } from "react";
import { ClientOnly, useClientModule } from "./client-only";
import { useFilters } from "@/lib/filter-context";
import { Plus, Minus } from "lucide-react";

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  color: string;
  radius?: number;
  tooltip?: string;
};

type Props = {
  points: MapPoint[];
  height?: number | string;
  /** When true, render a heat-like density layer using grouped circles. */
  heat?: boolean;
  baseColor?: string;
  /** Drop the rounded border so the map can sit flush as a background. */
  flush?: boolean;
};

// Standard heatmap-style ramp: cool → warm
const HEAT_RAMP = [
  { t: 0.0, c: "#2c7bb6" },
  { t: 0.25, c: "#abd9e9" },
  { t: 0.5, c: "#ffffbf" },
  { t: 0.75, c: "#fdae61" },
  { t: 1.0, c: "#d7191c" },
];
function heatColor(t: number) {
  for (let i = 1; i < HEAT_RAMP.length; i++) {
    const a = HEAT_RAMP[i - 1];
    const b = HEAT_RAMP[i];
    if (t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      return mixHex(a.c, b.c, k);
    }
  }
  return HEAT_RAMP[HEAT_RAMP.length - 1].c;
}
function mixHex(a: string, b: string, k: number) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const m = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

export function GeoMap(props: Props) {
  return (
    <ClientOnly
      fallback={
        <div
          className={props.flush ? "w-full h-full bg-muted animate-pulse" : "w-full rounded-2xl bg-muted animate-pulse"}
          style={{ height: props.flush ? "100%" : (props.height ?? 380) }}
        />
      }
    >
      {() => <GeoMapInner {...props} />}
    </ClientOnly>
  );
}

function GeoMapInner({ points, height = 380, heat = false, baseColor: _baseColor, flush = false }: Props) {
  const { city, radiusKm } = useFilters();
  const RL = useClientModule(() => import("react-leaflet"));
  const L = useClientModule(() => import("leaflet"));
  const mapRef = useRef<any>(null);

  const heatGroups = useMemo(() => {
    if (!heat) return [] as { lat: number; lon: number; n: number }[];
    // ~0.005° ≈ 0.5 km grid for finer blended look
    const grid = new Map<string, { lat: number; lon: number; n: number }>();
    for (const p of points) {
      const k = `${(Math.round(p.lat * 200) / 200).toFixed(3)}_${(Math.round(p.lon * 200) / 200).toFixed(3)}`;
      const g = grid.get(k);
      if (g) {
        g.n += 1;
        g.lat += (p.lat - g.lat) / g.n;
        g.lon += (p.lon - g.lon) / g.n;
      } else {
        grid.set(k, { lat: p.lat, lon: p.lon, n: 1 });
      }
    }
    return Array.from(grid.values());
  }, [points, heat]);

  if (!RL || !L) {
    return (
      <div
        className={flush ? "w-full h-full bg-muted animate-pulse" : "w-full rounded-2xl bg-muted animate-pulse"}
        style={{ height: flush ? "100%" : height }}
      />
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Circle, Tooltip } = RL;
  const maxN = Math.max(1, ...heatGroups.map((g) => g.n));

  return (
    <div
      className={flush ? "relative w-full h-full" : "relative overflow-hidden rounded-2xl border border-border"}
      style={{ height: flush ? "100%" : height }}
    >
      <MapContainer
        key={`${city.id}-${heat}`}
        center={[city.lat, city.lon]}
        zoom={11}
        scrollWheelZoom={true}
        zoomControl={false}
        ref={mapRef as any}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Circle
          center={[city.lat, city.lon]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "var(--foreground)",
            weight: 1,
            opacity: 0.25,
            fillOpacity: 0.03,
            dashArray: "4 6",
          }}
        />
        {heat
          ? heatGroups.map((g, i) => {
              const t = g.n / maxN;
              const color = heatColor(t);
              return (
                <CircleMarker
                  key={i}
                  center={[g.lat, g.lon]}
                  radius={18 + t * 38}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.18 + t * 0.32,
                    weight: 0,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                    <span className="text-xs">{g.n} Beobachtungen</span>
                  </Tooltip>
                </CircleMarker>
              );
            })
          : points.map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lon]}
                radius={p.radius ?? 5}
                pathOptions={{
                  color: p.color,
                  fillColor: p.color,
                  fillOpacity: 0.75,
                  weight: 1,
                  opacity: 0.9,
                }}
              >
                {p.tooltip && (
                  <Tooltip direction="top" offset={[0, -2]} opacity={1}>
                    <span
                      className="text-xs"
                      dangerouslySetInnerHTML={{ __html: p.tooltip }}
                    />
                  </Tooltip>
                )}
              </CircleMarker>
            ))}
      </MapContainer>

      <MapZoomControls
        onZoomIn={() => mapRef.current?.zoomIn?.()}
        onZoomOut={() => mapRef.current?.zoomOut?.()}
      />
    </div>
  );
}

function MapZoomControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div
      className="absolute z-[500] right-3 md:right-5 bottom-3 md:bottom-[calc(36vh+44px)] flex flex-col rounded-2xl border border-border overflow-hidden"
      style={{
        background: "color-mix(in oklab, white 92%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
      }}
    >
      <button
        onClick={onZoomIn}
        aria-label="Vergrößern"
        className="size-9 grid place-items-center hover:bg-muted/60 transition-colors"
      >
        <Plus className="size-4" />
      </button>
      <div className="h-px bg-border" />
      <button
        onClick={onZoomOut}
        aria-label="Verkleinern"
        className="size-9 grid place-items-center hover:bg-muted/60 transition-colors"
      >
        <Minus className="size-4" />
      </button>
    </div>
  );
}
