import { useMemo } from "react";
import { ClientOnly, useClientModule } from "./client-only";
import { useFilters } from "@/lib/filter-context";

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

function GeoMapInner({ points, height = 380, heat = false, baseColor, flush = false }: Props) {
  const { city, radiusKm } = useFilters();
  const RL = useClientModule(() => import("react-leaflet"));
  const L = useClientModule(() => import("leaflet"));

  const heatGroups = useMemo(() => {
    if (!heat) return [];
    // 0.01° ≈ 1.1 km grid
    const grid = new Map<string, { lat: number; lon: number; n: number }>();
    for (const p of points) {
      const k = `${p.lat.toFixed(2)}_${p.lon.toFixed(2)}`;
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
      className={flush ? "w-full h-full" : "overflow-hidden rounded-2xl border border-border"}
      style={{ height: flush ? "100%" : height }}
    >
      <MapContainer
        key={`${city.id}-${heat}`}
        center={[city.lat, city.lon]}
        zoom={11}
        scrollWheelZoom={false}
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
              return (
                <CircleMarker
                  key={i}
                  center={[g.lat, g.lon]}
                  radius={6 + t * 26}
                  pathOptions={{
                    color: baseColor ?? "var(--primary)",
                    fillColor: baseColor ?? "var(--primary)",
                    fillOpacity: 0.12 + t * 0.45,
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
    </div>
  );
}
