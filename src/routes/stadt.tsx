import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, PanelBody, FloatingCard } from "@/components/map-dashboard";
import { ViewToggle } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { BoxRow, computeBox } from "@/components/box-charts";
import { MetricChart, type Point } from "@/components/metric-chart";
import { Treemap } from "@/components/treemap";
import { STADT_TYPES, nestColor, avgValid } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { Download } from "lucide-react";

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

type Tab = "stats" | "typen" | "verlauf";
type TypView = "anzahl" | "score" | "tree";

function StadtPage() {
  const { data, range } = useFilters();
  const isMobile = useIsMobile();
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [tab, setTab] = useState<Tab>("stats");
  const [typView, setTypView] = useState<TypView>("anzahl");

  const points: MapPoint[] = data.stadt.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    color: nestColor(p.nest),
    radius: 6,
    tooltip: `
      <div>
        <div><b>NEST ${p.nest ?? "k. A."}</b></div>
        ${p.name ? `<div>${p.name}</div>` : ""}
        <div>Ort: ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</div>
        <div>gstypology: ${p.gstypology ?? p.type}</div>
      </div>
    `,
  }));

  const ts = bucketByDay(data.stadt, range);
  const avgNestRaw = avgValid(data.stadt.map((d) => d.nest));
  const avgNest = avgNestRaw != null ? Math.round(avgNestRaw) : null;

  // Missing scores for a category are dropped rather than counted as 0 —
  // they'd otherwise drag the boxplot/median down for no ecological reason.
  const notNull = (v: number | null): v is number => v != null;

  const byType = useMemo(() => {
    return STADT_TYPES
      .map((t) => {
        const subset = data.stadt.filter((p) => p.type === t);
        const sorted = subset.map((s) => s.nest).filter(notNull).sort((a, b) => a - b);
        const med = sorted.length
          ? sorted.length % 2
            ? sorted[Math.floor(sorted.length / 2)]
            : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : 0;
        return { type: t, count: subset.length, score: Math.round(med), values: sorted };
      })
      .filter((b) => b.count > 0);
  }, [data.stadt]);
  const maxCount = Math.max(1, ...byType.map((b) => b.count));

  const ptsNest: Point[] = useMemo(
    () => data.stadt.filter((d) => d.nest != null).map((d) => ({ ts: new Date(d.date).getTime(), v: d.nest as number, meta: { lat: d.lat, lon: d.lon } })),
    [data.stadt],
  );

  return (
    <MapDashboard
      map={<GeoMap points={points} heat={mapMode === "heat"} baseColor={STADT} flush />}
      overlay={<FilterBar compact />}
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
              { v: "typen", label: de.stadt.sources },
              ...(isMobile ? [] : [{ v: "verlauf" as Tab, label: de.common.overTime }]),
            ]}
            right={
              <button
                type="button"
                title="Als CSV herunterladen"
                onClick={() => downloadCsv(
                  `stadt_${new Date().toISOString().slice(0,10)}.csv`,
                  data.stadt.map(d => d.raw)
                )}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs"
              >
                <Download className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Daten exportieren</span>
              </button>
            }
          />
          <PanelBody>
            {tab === "stats" && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-4 md:items-stretch">
                <div className="grid grid-cols-2 gap-3 content-start">
                  <Stat label={de.common.observations} value={data.stadt.length} accent={STADT} hint="Gesamtzahl" />
                  <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: STADT }} />
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{de.stadt.nest}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {avgNest != null ? <span className="size-3 rounded-full border border-border" style={{ background: nestColor(avgNest) }} /> : null}
                      <span className="text-xl md:text-2xl font-semibold stat-number">{avgNest != null ? avgNest : "—"}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{`Ø ${de.common.avg} · n=${ptsNest.length}`}</div>
                    {avgNest != null ? <ScaleBar segments={NEST_SEGMENTS} value={avgNest} min={0} max={100} /> : null}
                  </div>
                  <Stat
                    label="Beste Fläche"
                    value={ptsNest.length ? Math.max(...ptsNest.map((p) => p.v)) : "—"}
                    accent={STADT}
                    hint="Maximum"
                    className="min-h-[88px]"
                  />
                  <Stat
                    label="Flächentypen"
                    value={new Set(data.stadt.map((d) => d.type)).size}
                    accent={STADT}
                    hint="Anzahl"
                    className="min-h-[88px]"
                  />
                </div>
                <div className="rounded-2xl border border-border bg-card p-3 flex flex-col min-h-[180px] md:min-h-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 shrink-0">
                    {de.common.observations} · {de.common.overTime}
                  </div>
                  <div className="flex-1 min-h-[160px]">
                    <TimeSeries data={ts} color={STADT} height={undefined} />
                  </div>
                </div>
              </div>
            )}

            {tab === "typen" && (
              byType.length === 0 ? <Empty /> : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: STADT }} />
                      <span className="text-xs font-medium">{de.stadt.sources}</span>
                    </div>
                    <ViewToggle
                      value={typView}
                      onChange={setTypView}
                      options={[
                        { v: "anzahl", label: "Anzahl" },
                        { v: "score", label: "Score" },
                        { v: "tree", label: "Treemap" },
                      ]}
                    />
                  </div>
                  {typView === "anzahl" ? (
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
                  )}
                </div>
              )
            )}

            {tab === "verlauf" && !isMobile && (
              data.stadt.length === 0 ? <Empty /> :
              <MetricChart values={ptsNest} color={STADT} rangeDays={range} label={de.stadt.nest} domain={[0, 100]} height={220} />
            )}
          </PanelBody>
        </>
      }
    />
  );
}

function Stat({
  label, value, accent, hint, swatch, className,
}: { label: string; value: React.ReactNode; accent: string; hint?: string; swatch?: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-3 relative overflow-hidden ${className ?? ""}`}>
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

type ScaleSegment = { min: number; max: number; color: string; label: string };

function ScaleBar({ segments, value, min, max }: {
  segments: ScaleSegment[];
  value: number;
  min: number;
  max: number;
}) {
  const [hovered, setHovered] = React.useState<ScaleSegment | null>(null);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  const active = segments.find(s => value >= s.min && value <= s.max) ?? segments[segments.length - 1];

  return (
    <div className="mt-2.5 relative">
      {hovered && (
        <div className="absolute -top-1 left-0 right-0 -translate-y-full mb-1 z-10
          bg-card border border-border rounded-xl px-2.5 py-2 text-[10px] text-muted-foreground leading-relaxed shadow-[var(--shadow-float)] pointer-events-none">
          <span className="font-medium text-foreground">{hovered.label.split(":")[0]}: </span>
          {hovered.label.split(":").slice(1).join(":")}
        </div>
      )}
      <div className="relative h-2 rounded-full overflow-hidden flex cursor-default">
        {segments.map((s, i) => (
          <div
            key={i}
            className="h-full transition-opacity"
            style={{
              width: `${((s.max - s.min) / (max - min)) * 100}%`,
              background: s.color,
              opacity: hovered ? (hovered === s ? 1 : 0.45) : 1,
            }}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      <div className="relative h-3">
        <div
          className="absolute -translate-x-1/2 pointer-events-none"
          style={{ left: `${pct}%`, top: 1 }}
        >
          <svg width="14" height="8" viewBox="0 0 14 8">
            <polygon points="7,0 0,8 14,8" fill={active.color} />
          </svg>
        </div>
      </div>
    </div>
  );
}

const NEST_SEGMENTS: ScaleSegment[] = [
  { min: 0,   max: 20,  color: "#0b1a3a", label: "NEST 0–20: Sehr geringer ökologischer Wert. Kaum Grünstrukturen, stark versiegelt oder degradiert." },
  { min: 20,  max: 40,  color: "#1e62a8", label: "NEST 20–40: Geringer Wert. Eingeschränkte Ökosystemleistungen, wenig Biodiversität und Aufenthaltsqualität." },
  { min: 40,  max: 60,  color: "#6dc7d6", label: "NEST 40–60: Mittlerer Wert. Grundlegende Grünfunktionen vorhanden, Verbesserungspotenzial." },
  { min: 60,  max: 80,  color: "#f4b65a", label: "NEST 60–80: Guter Wert. Vielfältige Grünstrukturen, förderlich für Biodiversität und Stadtklima." },
  { min: 80,  max: 100, color: "#5b0f0c", label: "NEST 80–100: Sehr hoher ökologischer Wert. Naturnahe Fläche mit hoher Biodiversität und Ökosystemleistung." },
];

function NestLegendVertical() {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <div
        className="rounded-2xl border border-border p-1 flex items-stretch gap-1 cursor-default"
        style={{
          background: "color-mix(in oklab, white 92%, transparent)",
          backdropFilter: "saturate(180%) blur(20px)",
          boxShadow: "var(--shadow-float)",
          height: 280,
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <div className="flex flex-col text-[9px] text-muted-foreground stat-number justify-between leading-none w-5 text-right">
          {[100, 80, 60, 40, 20, 0].map((n) => <span key={n}>{n}</span>)}
        </div>
        <div className="w-3 rounded-full overflow-hidden flex flex-col">
          {Array.from({ length: 32 }, (_, i) => {
            const v = ((31 - i) / 31) * 100;
            return <div key={i} className="flex-1" style={{ background: nestColor(v) }} />;
          })}
        </div>
      </div>
      {show && (
        <div className="absolute top-0 right-full mr-2 z-20 w-60 bg-card border border-border rounded-xl px-3 py-2.5 text-[10px] text-muted-foreground leading-relaxed shadow-[var(--shadow-float)] pointer-events-none">
          <div className="font-medium text-foreground text-[11px] mb-1">NEST Score (0–100)</div>
          Der NEST Score (Natural Environment Scoring Tool) ist ein 47-Punkte-Bewertungssystem, das von Forschenden entwickelt wurde, um die Qualität lokaler Grün- und Naturflächen zu messen.
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>;
}