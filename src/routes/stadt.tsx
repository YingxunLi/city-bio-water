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
import { STADT_TYPES, nestColor } from "@/lib/mock-data";

export const Route = createFileRoute("/stadt")({
  head: () => ({
    meta: [
      { title: "Stadt – BürgerDaten" },
      { name: "description", content: "Greenspace Hack NEST-Bewertung in Echtzeit." },
    ],
  }),
  component: StadtPage,
});

const STADT = "#F0A08C";

type Tab = "stats" | "verteilung" | "typen" | "verlauf";

function StadtPage() {
  const { data, range } = useFilters();
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [boxMode, setBoxMode] = useState<"box" | "radar">("radar");
  const [tab, setTab] = useState<Tab>("stats");

  const points: MapPoint[] = data.stadt.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    color: nestColor(p.nest),
    radius: 6,
    tooltip: `<b>NEST ${p.nest}</b> · ${p.type}`,
  }));

  const ts = bucketByDay(data.stadt, range);
  const avgNest = data.stadt.length
    ? Math.round(data.stadt.reduce((a, b) => a + b.nest, 0) / data.stadt.length)
    : 0;

  const catMetrics = useMemo(() => {
    if (data.stadt.length === 0) return [];
    return [
      { key: de.stadt.categories.shade, values: data.stadt.map((d) => d.shade) },
      { key: de.stadt.categories.drinking, values: data.stadt.map((d) => d.drinking) },
      { key: de.stadt.categories.fountains, values: data.stadt.map((d) => d.fountains) },
      { key: de.stadt.categories.biodiversity, values: data.stadt.map((d) => d.biodiversity) },
      { key: de.stadt.categories.green, values: data.stadt.map((d) => d.greenCare) },
    ];
  }, [data.stadt]);

  const byType = useMemo(
    () =>
      STADT_TYPES.map((t) => {
        const subset = data.stadt.filter((p) => p.type === t);
        const avg = subset.length ? subset.reduce((a, b) => a + b.nest, 0) / subset.length : 0;
        return { type: t, count: subset.length, score: Math.round(avg) };
      }),
    [data.stadt],
  );
  const maxCount = Math.max(1, ...byType.map((b) => b.count));

  return (
    <MapDashboard
      map={<GeoMap points={points} heat={mapMode === "heat"} baseColor={STADT} flush />}
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
              { v: "points", label: de.stadt.nest },
              { v: "heat", label: de.common.heatmap },
            ]}
          />
        </FloatingCard>
      }
      mapLegend={<NestLegendVertical />}
      panel={
        <>
          <PanelTabs
            value={tab}
            onChange={setTab}
            options={[
              { v: "stats", label: "Statistik" },
              { v: "verteilung", label: "Score-Kategorien" },
              { v: "typen", label: de.stadt.sources },
              { v: "verlauf", label: de.common.overTime },
            ]}
            right={
              tab === "verteilung" ? (
                <ViewToggle
                  value={boxMode}
                  onChange={setBoxMode}
                  options={[
                    { v: "radar", label: de.common.radarView },
                    { v: "box", label: de.common.boxplotView },
                  ]}
                />
              ) : null
            }
          />

          {tab === "stats" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label={de.common.observations} value={data.stadt.length} accent={STADT} />
              <Stat label={`Ø ${de.stadt.nest}`} value={avgNest || "—"} accent={STADT} />
              <Stat
                label="Beste Fläche"
                value={data.stadt.length ? Math.max(...data.stadt.map((d) => d.nest)) : "—"}
                accent={STADT}
              />
              <Stat
                label="Flächentypen"
                value={new Set(data.stadt.map((d) => d.type)).size}
                accent={STADT}
              />
            </div>
          )}

          {tab === "verteilung" &&
            (catMetrics.length === 0 ? (
              <Empty />
            ) : boxMode === "radar" ? (
              <div className="flex justify-center">
                <RadarBox
                  stats={catMetrics.map((m) => computeBox(m.values, m.key))}
                  domain={[0, 100]}
                  color={STADT}
                  size={260}
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                {catMetrics.map((m) => (
                  <BoxRow key={m.key} stats={computeBox(m.values, m.key)} domain={[0, 100]} color={STADT} />
                ))}
              </div>
            ))}

          {tab === "typen" && (
            <div className="space-y-2">
              {byType.map((b) => (
                <div
                  key={b.type}
                  className="grid grid-cols-[160px_1fr_60px] items-center gap-3"
                  title={`${b.type}: ${b.count} Flächen, Ø Score ${b.score}`}
                >
                  <div className="text-xs truncate">{b.type}</div>
                  <div className="h-5 bg-muted rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{
                        width: `${(b.count / maxCount) * 100}%`,
                        background: `color-mix(in oklab, ${STADT} ${30 + (b.score / 100) * 60}%, white)`,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground stat-number text-right">
                    {b.count} · {b.score || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "verlauf" && <TimeSeries data={ts} color={STADT} height={200} />}
        </>
      }
    />
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
      <div
        className="absolute -top-6 -right-6 size-20 rounded-full opacity-10"
        style={{ background: accent }}
      />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-1 text-xl md:text-2xl font-semibold stat-number">{value}</div>
    </div>
  );
}

function NestLegendVertical() {
  return (
    <div
      className="rounded-2xl border border-border p-2 flex items-stretch gap-2"
      style={{
        background: "color-mix(in oklab, white 88%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
      }}
      title="NEST Score 0–100"
    >
      <div className="flex flex-col text-[9px] text-muted-foreground stat-number justify-between py-0.5 leading-none">
        <span>100</span>
        <span>50</span>
        <span>0</span>
      </div>
      <div className="w-2 rounded-full overflow-hidden flex flex-col">
        {Array.from({ length: 20 }, (_, i) => {
          const v = ((19 - i) / 19) * 100;
          return <div key={i} className="flex-1" style={{ background: nestColor(v) }} />;
        })}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>;
}
