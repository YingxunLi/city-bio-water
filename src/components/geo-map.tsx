import { useEffect, useMemo, useRef, useState } from "react";
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
  weight?: number;
};

type Props = {
  points: MapPoint[];
  height?: number | string;
  heat?: boolean;
  baseColor?: string;
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

      {/* Zoom controls: bottom-right, desktop only */}
      <MapZoomControls
        onZoomIn={() => mapRef.current?.zoomIn?.()}
        onZoomOut={() => mapRef.current?.zoomOut?.()}
      />
    </div>
  );
}

/** Real heatmap layer using leaflet.heat. Loads leaflet first and binds to window.L. */
function HeatLayer({ points }: { points: MapPoint[] }) {
  const RL = useClientModule(() => import("react-leaflet"));
  const map = RL?.useMap();
  const [ready, setReady] = useState(false);
  const data = useMemo(
    () =>
      points.map((p) => [p.lat, p.lon, p.weight ?? 0.6] as [number, number, number]),
    [points],
  );

  // Initialise leaflet.heat exactly once on the client. It is a side-effect
  // plugin that expects a global window.L to already exist.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const Lmod: any = await import("leaflet");
        const Lns = Lmod.default ?? Lmod;
        (window as any).L = Lns;
        if (!Lns.heatLayer) {
          await import("leaflet.heat");
        }
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error("leaflet.heat init failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map) return;
    const Lns: any = (window as any).L;
    if (!Lns?.heatLayer) return;
    const layer = Lns.heatLayer(data, {
      radius: 25,
      blur: 18,
      maxZoom: 17,
      minOpacity: 0.25,
      gradient: {
        0.0: "rgba(44,123,182,0)",
        0.2: "#2c7bb6",
        0.4: "#abd9e9",
        0.6: "#ffffbf",
        0.8: "#fdae61",
        1.0: "#d7191c",
      },
    });
    layer.addTo(map);
    return () => {
      try { map.removeLayer(layer); } catch { /* noop */ }
    };
  }, [ready, map, data]);

  return null;
}

function MapZoomControls({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div
      className="hidden md:flex absolute z-[600] right-5 bottom-[calc(38vh+24px)] flex-col rounded-2xl border border-border overflow-hidden"
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
        type="button"
      >
        <Plus className="size-4" />
      </button>
      <div className="h-px bg-border" />
      <button
        onClick={onZoomOut}
        aria-label="Verkleinern"
        className="size-9 grid place-items-center hover:bg-muted/60 transition-colors"
        type="button"
      >
        <Minus className="size-4" />
      </button>
    </div>
  );
}
