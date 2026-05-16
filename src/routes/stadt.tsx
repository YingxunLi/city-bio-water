import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, PanelBody, FloatingCard } from "@/components/map-dashboard";
import { ViewToggle } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { BoxRow, RadarBox, computeBox } from "@/components/box-charts";
import { MetricChart, type Point } from "@/components/metric-chart";
import { Treemap } from "@/components/treemap";
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

type Tab = "stats" | "kategorien" | "typen" | "verlauf";
type TypView = "anzahl" | "score" | "tree";

function StadtPage() {
  const { data, range } = useFilters();
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [tab, setTab] = useState<Tab>("stats");
  const [typView, setTypView] = useState<TypView>("anzahl");

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
      { key: de.common.gesamt, values: data.stadt.map((d) => d.nest) },
      { key: de.stadt.categories.shade, values: data.stadt.map((d) => d.shade) },
      { key: de.stadt.categories.drinking, values: data.stadt.map((d) => d.drinking) },
      { key: de.stadt.categories.fountains, values: data.stadt.map((d) => d.fountains) },
      { key: de.stadt.categories.biodiversity, values: data.stadt.map((d) => d.biodiversity) },
      { key: de.stadt.categories.green, values: data.stadt.map((d) => d.greenCare) },
    ];
  }, [data.stadt]);

  const byType = useMemo(() => {
    return STADT_TYPES
      .map((t) => {
        const subset = data.stadt.filter((p) => p.type === t);
        const sorted = [...subset.map((s) => s.nest)].sort((a, b) => a - b);
        const med = sorted.length
          ? sorted.length % 2
            ? sorted[Math.floor(sorted.length / 2)]
            : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : 0;
        return { type: t, count: subset.length, score: Math.round(med), values: subset.map((s) => s.nest) };
      })
      .filter((b) => b.count > 0);
  }, [data.stadt]);
  const maxCount = Math.max(1, ...byType.map((b) => b.count));

  const ptsNest: Point[] = useMemo(
    () => data.stadt.map((d) => ({ ts: new Date(d.date).getTime(), v: d.nest, meta: { lat: d.lat, lon: d.lon } })),
    [data.stadt],
  );

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
              { v: "kategorien", label: "Score-Kategorien" },
              { v: "typen", label: de.stadt.sources },
              { v: "verlauf", label: de.common.overTime },
            ]}
            right={
              tab === "typen" ? (
                <ViewToggle
                  value={typView}
                  onChange={setTypView}
                  options={[
                    { v: "anzahl", label: "Anzahl" },
                    { v: "score", label: "Score" },
                    { v: "tree", label: "Treemap" },
                  ]}
                />
              ) : null
            }
          />
          <PanelBody>
            {tab === "stats" && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-4">
                <div className="grid grid-cols-2 gap-3 content-start">
                  <Stat label={de.common.observations} value={data.stadt.length} accent={STADT} hint="Gesamtzahl" />
                  <Stat label={de.stadt.nest} value={avgNest || "—"} accent={STADT} hint={`Ø ${de.common.avg}`} swatch={avgNest ? nestColor(avgNest) : undefined} />
                  <Stat
                    label="Beste Fläche"
                    value={data.stadt.length ? Math.max(...data.stadt.map((d) => d.nest)) : "—"}
                    accent={STADT}
                    hint="Maximum"
                  />
                  <Stat
                    label="Flächentypen"
                    value={new Set(data.stadt.map((d) => d.type)).size}
                    accent={STADT}
                    hint="Anzahl"
                  />
                </div>
                <div className="rounded-2xl border border-border bg-card p-3 min-h-[180px]">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {de.common.observations} · {de.common.overTime}
                  </div>
                  <TimeSeries data={ts} color={STADT} height={160} />
                </div>
              </div>
            )}

            {tab === "kategorien" && (
              catMetrics.length === 0 ? <Empty /> : (
                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start">
                  <div className="flex justify-center">
                    <RadarBox
                      stats={catMetrics.map((m) => computeBox(m.values, m.key))}
                      domain={[0, 100]}
                      color={STADT}
                      size={240}
                    />
                  </div>
                  <div className="space-y-2 self-center">
                    {catMetrics.map((m) => (
                      <BoxRow key={m.key} stats={computeBox(m.values, m.key)} domain={[0, 100]} color={STADT} />
                    ))}
                  </div>
                </div>
              )
            )}

            {tab === "typen" && (
              byType.length === 0 ? <Empty /> :
              typView === "anzahl" ? (
                <div className="space-y-2">
                  {byType.map((b) => (
                    <div
                      key={b.type}
                      className="grid grid-cols-[160px_1fr_60px] items-center gap-3"
                      title={`${b.type}\nAnzahl ${b.count}\nØ Score ${b.score}`}
                    >
                      <div className="text-xs truncate">{b.type}</div>
                      <div className="h-5 bg-muted rounded-md overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all"
                          style={{ width: `${(b.count / maxCount) * 100}%`, background: STADT, opacity: 0.85 }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground stat-number text-right">{b.count}</div>
                    </div>
                  ))}
                </div>
              ) : typView === "score" ? (
                <div className="space-y-2.5">
                  {byType.map((b) => (
                    <BoxRow key={b.type} stats={computeBox(b.values, b.type)} domain={[0, 100]} color={STADT} />
                  ))}
                </div>
              ) : (
                <Treemap
                  items={byType.map((b) => ({ key: b.type, label: b.type, value: b.count, score: b.score }))}
                  color={STADT}
                  height={230}
                />
              )
            )}

            {tab === "verlauf" && (
              data.stadt.length === 0 ? <Empty /> :
              <MetricChart values={ptsNest} color={STADT} rangeDays={range} label={de.stadt.nest} domain={[0, 100]} height={210} />
            )}
          </PanelBody>
        </>
      }
    />
  );
}

function Stat({
  label, value, accent, hint, swatch,
}: { label: string; value: React.ReactNode; accent: string; hint?: string; swatch?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: accent }} />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        {swatch && <span className="size-3 rounded-full border border-border" style={{ background: swatch }} />}
        <span className="text-xl md:text-2xl font-semibold stat-number">{value}</span>
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function NestLegendVertical() {
  return (
    <div
      className="rounded-2xl border border-border p-2 flex items-stretch gap-1.5"
      style={{
        background: "color-mix(in oklab, white 92%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
        height: 280,
      }}
      title="NEST Score 0–100"
    >
      <div className="flex flex-col text-[9px] text-muted-foreground stat-number justify-between leading-none w-6 text-right">
        {[100, 80, 60, 40, 20, 0].map((n) => <span key={n}>{n}</span>)}
      </div>
      <div className="w-3 rounded-full overflow-hidden flex flex-col">
        {Array.from({ length: 32 }, (_, i) => {
          const v = ((31 - i) / 31) * 100;
          return <div key={i} className="flex-1" style={{ background: nestColor(v) }} />;
        })}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>;
}
