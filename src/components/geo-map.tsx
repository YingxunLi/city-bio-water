import { useEffect, useMemo, useRef } from "react";
import { ClientOnly, useClientModule } from "./client-only";
import { useFilters } from "@/lib/filter-context";
import { Plus, Minus } from "lucide-react";

export type MapPoint = {
  id: string;
  lat: number;
  lon: number;
  color: string;
  radius?: number;
  /** Pre-rendered HTML for the leaflet tooltip. */
  tooltip?: string;
  /** Weight for heatmap intensity (defaults to 1). */
  weight?: number;
};

type Props = {
  points: MapPoint[];
  height?: number | string;
  /** When true, render a real heatmap layer (leaflet.heat). */
  heat?: boolean;
  baseColor?: string;
  /** Drop rounded border so the map can sit flush as a background. */
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

function GeoMapInner({ points, height = 380, heat = false, flush = false }: Props) {
  const { city, radiusKm, isGesamt } = useFilters();
  const RL = useClientModule(() => import("react-leaflet"));
  const L = useClientModule(() => import("leaflet"));
  const mapRef = useRef<any>(null);

  if (!RL || !L) {
    return (
      <div
        className={flush ? "w-full h-full bg-muted animate-pulse" : "w-full rounded-2xl bg-muted animate-pulse"}
        style={{ height: flush ? "100%" : height }}
      />
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Circle, Tooltip } = RL;
  const initialZoom = isGesamt ? 5 : 11;

  return (
    <div
      className={flush ? "relative w-full h-full" : "relative overflow-hidden rounded-2xl border border-border"}
      style={{ height: flush ? "100%" : height }}
    >
      <MapContainer
        key={`${city.id}-${heat}`}
        center={[city.lat, city.lon]}
        zoom={initialZoom}
        scrollWheelZoom={true}
        zoomControl={false}
        ref={mapRef as any}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {!isGesamt && (
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
        )}
        {heat ? (
          <HeatLayer points={points} />
        ) : (
          points.map((p) => (
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
          ))
        )}
      </MapContainer>

      <MapZoomControls
        onZoomIn={() => mapRef.current?.zoomIn?.()}
        onZoomOut={() => mapRef.current?.zoomOut?.()}
      />
    </div>
  );
}

/** Real heatmap layer using leaflet.heat. */
function HeatLayer({ points }: { points: MapPoint[] }) {
  const RL = useClientModule(() => import("react-leaflet"));
  const heatMod = useClientModule(() => import("leaflet.heat") as any);
  const map = RL?.useMap();
  const layerRef = useRef<any>(null);
  const data = useMemo(
    () =>
      points.map((p) => [p.lat, p.lon, p.weight ?? 1] as [number, number, number]),
    [points],
  );

  useEffect(() => {
    if (!map || !heatMod) return;
    const w = window as any;
    const L = w.L;
    if (!L || !L.heatLayer) return;
    const layer = L.heatLayer(data, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.35,
      gradient: {
        0.0: "#2c7bb6",
        0.25: "#abd9e9",
        0.5: "#ffffbf",
        0.75: "#fdae61",
        1.0: "#d7191c",
      },
    });
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      map.removeLayer(layer);
    };
  }, [map, heatMod, data]);

  return null;
}

function MapZoomControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div
      className="absolute z-[600] right-3 md:right-5 top-3 md:top-5 flex flex-col rounded-2xl border border-border overflow-hidden"
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
