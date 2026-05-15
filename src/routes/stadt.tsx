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
import { MultiTime } from "@/components/multi-time";
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

type Tab = "stats" | "verteilung" | "typen" | "verlauf";
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

  // Score-Kategorien with "Gesamt" first
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

  const byType = useMemo(
    () =>
      STADT_TYPES.map((t) => {
        const subset = data.stadt.filter((p) => p.type === t);
        const avg = subset.length ? subset.reduce((a, b) => a + b.nest, 0) / subset.length : 0;
        return { type: t, count: subset.length, score: Math.round(avg), values: subset.map((s) => s.nest) };
      }).filter((b) => b.count > 0),
    [data.stadt],
  );
  const maxCount = Math.max(1, ...byType.map((b) => b.count));

  const series = useMemo(
    () => [
      {
        key: "nest",
        label: de.stadt.nest,
        unit: "",
        opacity: 1,
        values: data.stadt.map((d) => ({ ts: new Date(d.date).getTime(), v: d.nest })),
      },
    ],
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
              { v: "verteilung", label: "Score-Kategorien" },
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

          {tab === "stats" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label={de.common.observations} value={data.stadt.length} accent={STADT} hint="Gesamtzahl" />
                <Stat label={de.stadt.nest} value={avgNest || "—"} accent={STADT} hint={de.common.avg} />
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
              <div className="rounded-2xl border border-border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {de.common.observations} · {de.common.overTime}
                </div>
                <TimeSeries data={ts} color={STADT} height={120} />
              </div>
            </div>
          )}

          {tab === "verteilung" &&
            (catMetrics.length === 0 ? (
              <Empty />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex justify-center">
                  <RadarBox
                    stats={catMetrics.map((m) => computeBox(m.values, m.key))}
                    domain={[0, 100]}
                    color={STADT}
                    size={220}
                  />
                </div>
                <div className="space-y-2">
                  {catMetrics.map((m) => (
                    <BoxRow key={m.key} stats={computeBox(m.values, m.key)} domain={[0, 100]} color={STADT} />
                  ))}
                </div>
              </div>
            ))}

          {tab === "typen" &&
            (byType.length === 0 ? (
              <Empty />
            ) : typView === "anzahl" ? (
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
                          background: STADT,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground stat-number text-right">
                      {b.count}
                    </div>
                  </div>
                ))}
              </div>
            ) : typView === "score" ? (
              <div className="space-y-2.5">
                {byType.map((b) => (
                  <BoxRow
                    key={b.type}
                    stats={computeBox(b.values, b.type)}
                    domain={[0, 100]}
                    color={STADT}
                  />
                ))}
              </div>
            ) : (
              <Treemap
                items={byType.map((b) => ({ key: b.type, label: b.type, value: b.count, score: b.score }))}
                color={STADT}
                height={220}
              />
            ))}

          {tab === "verlauf" &&
            (data.stadt.length === 0 ? (
              <Empty />
            ) : (
              <MultiTime series={series} color={STADT} rangeDays={range} height={200} />
            ))}
        </>
      }
    />
  );
}

function Stat({ label, value, accent, hint }: { label: string; value: React.ReactNode; accent: string; hint?: string }) {
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
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function NestLegendVertical() {
  return (
    <div
      className="rounded-2xl border border-border p-2 flex items-stretch gap-2"
      style={{
        background: "color-mix(in oklab, white 92%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
        height: 220,
      }}
      title="NEST Score 0–100"
    >
      <div className="flex flex-col text-[9px] text-muted-foreground stat-number justify-between leading-none w-7 text-right">
        {[100, 75, 50, 25, 0].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <div className="w-2.5 rounded-full overflow-hidden flex flex-col">
        {Array.from({ length: 24 }, (_, i) => {
          const v = ((23 - i) / 23) * 100;
          return <div key={i} className="flex-1" style={{ background: nestColor(v) }} />;
        })}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>;
}
