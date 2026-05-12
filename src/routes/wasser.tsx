import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, FloatingCard } from "@/components/map-dashboard";
import { ViewToggle } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { BoxRow, RadarBox, computeBox } from "@/components/box-charts";
import { FU_COLORS, fuColor } from "@/lib/mock-data";

export const Route = createFileRoute("/wasser")({
  head: () => ({
    meta: [
      { title: "Wasser – BürgerDaten" },
      { name: "description", content: "EyeOnWater Wasserqualität in Echtzeit." },
    ],
  }),
  component: WasserPage,
});

const WASSER = "#243285";

type Tab = "stats" | "verteilung" | "verlauf";

function WasserPage() {
  const { data, range } = useFilters();
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [boxMode, setBoxMode] = useState<"box" | "radar">("box");
  const [tab, setTab] = useState<Tab>("stats");

  const points: MapPoint[] = data.wasser.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    color: fuColor(p.fu),
    radius: 6,
    tooltip: `<b>FU ${p.fu}</b> · pH ${p.ph} · ${p.transparenz} m`,
  }));

  const ts = bucketByDay(data.wasser, range);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const avgFu = avg(data.wasser.map((d) => d.fu));
  const avgPh = avg(data.wasser.map((d) => d.ph));
  const avgTrans = avg(data.wasser.map((d) => d.transparenz));

  const metrics = useMemo(
    () => [
      { key: de.wasser.fu, values: data.wasser.map((d) => d.fu), domain: [1, 21] as [number, number], unit: "" },
      { key: de.wasser.ph, values: data.wasser.map((d) => d.ph), domain: [6, 9] as [number, number], unit: "" },
      { key: de.wasser.transparenz, values: data.wasser.map((d) => d.transparenz), domain: [0, 6] as [number, number], unit: " m" },
    ],
    [data.wasser],
  );

  return (
    <MapDashboard
      map={<GeoMap points={points} heat={mapMode === "heat"} baseColor={WASSER} flush />}
      overlay={
        <FloatingCard>
          <FilterBar compact />
        </FloatingCard>
      }
      mapControls={
        <FloatingCard className="!p-1">
          <ViewToggle
            value={mapMode}
            onChange={setMapMode}
            options={[
              { v: "points", label: de.wasser.fu },
              { v: "heat", label: de.common.heatmap },
            ]}
          />
        </FloatingCard>
      }
      mapLegend={<FuLegendVertical />}
      panel={
        <>
          <PanelTabs
            value={tab}
            onChange={setTab}
            options={[
              { v: "stats", label: "Statistik" },
              { v: "verteilung", label: "Verteilung" },
              { v: "verlauf", label: de.common.overTime },
            ]}
            right={
              tab === "verteilung" ? (
                <ViewToggle
                  value={boxMode}
                  onChange={setBoxMode}
                  options={[
                    { v: "box", label: de.common.boxplotView },
                    { v: "radar", label: de.common.radarView },
                  ]}
                />
              ) : null
            }
          />

          {tab === "stats" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label={de.common.observations} value={data.wasser.length} accent={WASSER} />
              <Stat
                label={`Ø ${de.wasser.fu}`}
                value={avgFu ? avgFu.toFixed(1) : "—"}
                accent={WASSER}
                swatch={avgFu ? fuColor(avgFu) : undefined}
              />
              <Stat label={`Ø ${de.wasser.ph}`} value={avgPh ? avgPh.toFixed(2) : "—"} accent={WASSER} />
              <Stat
                label={`Ø ${de.wasser.transparenz}`}
                value={avgTrans ? `${avgTrans.toFixed(1)} m` : "—"}
                accent={WASSER}
              />
            </div>
          )}

          {tab === "verteilung" &&
            (data.wasser.length === 0 ? (
              <Empty />
            ) : boxMode === "box" ? (
              <div className="space-y-2.5">
                {metrics.map((m) => (
                  <BoxRow
                    key={m.key}
                    stats={computeBox(m.values, m.key)}
                    domain={m.domain}
                    color={WASSER}
                    unit={m.unit}
                  />
                ))}
              </div>
            ) : (
              <div className="flex justify-center">
                <RadarBox
                  stats={metrics.map((m) => computeBox(m.values, m.key))}
                  domain={[0, 1]}
                  color={WASSER}
                  size={260}
                />
              </div>
            ))}

          {tab === "verlauf" && <TimeSeries data={ts} color={WASSER} height={200} />}
        </>
      }
    />
  );
}

function Stat({
  label,
  value,
  accent,
  swatch,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
  swatch?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
      <div
        className="absolute -top-6 -right-6 size-20 rounded-full opacity-10"
        style={{ background: accent }}
      />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {swatch && (
          <span className="size-3 rounded-full border border-border" style={{ background: swatch }} />
        )}
        <span className="text-xl md:text-2xl font-semibold stat-number">{value}</span>
      </div>
    </div>
  );
}

function FuLegendVertical() {
  return (
    <div
      className="rounded-2xl border border-border p-2 flex items-stretch gap-2"
      style={{
        background: "color-mix(in oklab, white 88%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
      }}
      title="Forel-Ule-Skala (1 klar – 21 trüb)"
    >
      <div className="flex flex-col text-[9px] text-muted-foreground stat-number justify-between py-0.5 leading-none">
        <span>1</span>
        <span>7</span>
        <span>14</span>
        <span>21</span>
      </div>
      <div className="w-2 rounded-full overflow-hidden flex flex-col">
        {FU_COLORS.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} title={`FU ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>
  );
}
