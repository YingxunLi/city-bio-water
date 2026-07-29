import { createFileRoute } from "@tanstack/react-router";
import React, { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, PanelBody, FloatingCard } from "@/components/map-dashboard";
import { ViewToggle } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { MetricChart, type Point } from "@/components/metric-chart";
import { FU_COLORS, fuColor, avgValid } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";
import { Download } from "lucide-react";

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

type Tab = "stats" | "fu" | "ph" | "trans";

function fmtFull(d: string) {
  const t = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
}

function quantile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function fuTooltip(p: { fu: number | null; lat: number; lon: number; date: string; device: string }) {
  const c = fuColor(p.fu);
  return `
    <div style="display:flex;gap:10px;align-items:stretch;min-width:230px;padding:2px 0">
      <div style="width:6px;border-radius:3px;background:${c};flex:none"></div>
      <div style="display:flex;flex-direction:column;gap:3px;font-family:inherit">
        <div style="font-size:13px;font-weight:600;letter-spacing:-0.01em">FU value verarbeitet: ${p.fu ?? "k. A."}</div>
        <div style="font-size:11px;color:#374151;display:flex;flex-direction:column;gap:1px">
          <span><span style="color:#6b7280">Ort:</span> lat=${p.lat.toFixed(5)} lon=${p.lon.toFixed(5)}</span>
          <span><span style="color:#6b7280">Datum:</span> ${fmtFull(p.date)}</span>
          <span><span style="color:#6b7280">Gerätemodell:</span> ${p.device}</span>
        </div>
      </div>
    </div>`;
}

function WasserPage() {
  const { data, range } = useFilters();
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [tab, setTab] = useState<Tab>("stats");

  const points: MapPoint[] = data.wasser.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    color: fuColor(p.fu),
    radius: 6,
    tooltip: fuTooltip(p),
  }));

  const ts = bucketByDay(data.wasser, range);
  const avgPh = avgValid(data.wasser.map((d) => d.ph));
  const avgTrans = avgValid(data.wasser.map((d) => d.transparenz));

  // Samples with a missing value for this specific metric are dropped here —
  // a null field must not show up as a point/average of 0.
  const ptsFu: Point[] = useMemo(
    () => data.wasser.filter((d) => d.fu != null).map((d) => ({ ts: new Date(d.date).getTime(), v: d.fu as number, meta: { lat: d.lat, lon: d.lon } })),
    [data.wasser],
  );
  // FU is an ordinal color scale, not a continuous measurement — neither a
  // mean nor a median claims a meaningful "typical value" for it, so we just
  // show the observed min/max instead.
  const fuSorted = useMemo(() => ptsFu.map((p) => p.v).sort((a, b) => a - b), [ptsFu]);
  const minFu = fuSorted.length ? fuSorted[0] : null;
  const maxFu = fuSorted.length ? fuSorted[fuSorted.length - 1] : null;
  const ptsPh: Point[] = useMemo(
    () => data.wasser.filter((d) => d.ph != null).map((d) => ({ ts: new Date(d.date).getTime(), v: d.ph as number, meta: { lat: d.lat, lon: d.lon } })),
    [data.wasser],
  );
  const ptsTr: Point[] = useMemo(
    () => data.wasser.filter((d) => d.transparenz != null).map((d) => ({ ts: new Date(d.date).getTime(), v: d.transparenz as number, meta: { lat: d.lat, lon: d.lon } })),
    [data.wasser],
  );
  // No agreed cm-scale clarity standard exists for this kind of small urban
  // water body, so the scale bar's ends track the current selection's own
  // 5th/95th percentile instead of an invented absolute threshold.
  const transSorted = useMemo(() => ptsTr.map((p) => p.v).sort((a, b) => a - b), [ptsTr]);
  const transMin = transSorted.length ? quantile(transSorted, 0.05) : 0;
  const transMax = transSorted.length ? quantile(transSorted, 0.95) : 1;

  return (
    <MapDashboard
      map={<GeoMap points={points} heat={mapMode === "heat"} baseColor={WASSER} flush />}
      overlay={<FilterBar compact />}
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
              { v: "fu", label: de.wasser.fu },
              { v: "ph", label: de.wasser.ph },
              { v: "trans", label: de.wasser.transparenz },
            ]}
            right={
              <button
                type="button"
                title="Als CSV herunterladen"
                onClick={() => downloadCsv(
                  `wasser_${new Date().toISOString().slice(0,10)}.csv`,
                  data.wasser.map(d => d.raw)
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
                  <Stat label={de.common.observations} value={data.wasser.length} accent={WASSER} hint="Gesamtzahl" />
                  <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: WASSER }} />
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{de.wasser.fu}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xl md:text-2xl font-semibold stat-number">
                        {minFu != null && maxFu != null ? `${minFu} ~ ${maxFu}` : "—"}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{`Min, Max · n=${ptsFu.length}`}</div>
                    {minFu != null && maxFu != null ? (
                      <ScaleBar segments={FU_SEGMENTS} min={1} max={21} pointers={[minFu, maxFu]} />
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: WASSER }} />
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{de.wasser.ph}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xl md:text-2xl font-semibold stat-number">{avgPh != null ? avgPh.toFixed(2) : "—"}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{`Ø ${de.common.avg} · n=${ptsPh.length}`}</div>
                    {avgPh != null ? <ScaleBar segments={PH_SEGMENTS} min={0} max={14} pointers={[avgPh]} /> : null}
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: WASSER }} />
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{de.wasser.transparenz}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xl md:text-2xl font-semibold stat-number">{avgTrans != null ? `${avgTrans.toFixed(1)} cm` : "—"}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{`Ø ${de.common.avg} · n=${ptsTr.length}`}</div>
                    {avgTrans != null ? <GradientScaleBar value={avgTrans} min={transMin} max={transMax} unit=" cm" /> : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3 flex flex-col min-h-[180px] md:min-h-0">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 shrink-0">
                    {de.common.observations} · {de.common.overTime}
                  </div>
                  <div className="flex-1 min-h-[160px]">
                    <TimeSeries data={ts} color={WASSER} height="100%" />
                  </div>
                </div>
              </div>
            )}

            {tab === "fu" && (
              data.wasser.length === 0 ? <Empty /> :
              <MetricChart values={ptsFu} color={WASSER} rangeDays={range} label={de.wasser.fu} domain={[1, 21]} height={210} />
            )}
            {tab === "ph" && (
              data.wasser.length === 0 ? <Empty /> :
              <MetricChart values={ptsPh} color={WASSER} rangeDays={range} unit="" label={de.wasser.ph} domain={[6, 9]} height={210} />
            )}
            {tab === "trans" && (
              data.wasser.length === 0 ? <Empty /> :
              <MetricChart values={ptsTr} color={WASSER} rangeDays={range} unit=" cm" label={de.wasser.transparenz} height={210} />
            )}
          </PanelBody>
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
  hint,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
  swatch?: string;
  hint?: string;
}) {
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

type ScaleSegment = { min: number; max: number; color: string; label: string };

function ScaleBar({ segments, pointers, min, max }: {
  segments: ScaleSegment[];
  /** One value → single pointer (e.g. the average). Two values → e.g. min/max. */
  pointers: number[];
  min: number;
  max: number;
}) {
  const [hovered, setHovered] = React.useState<ScaleSegment | null>(null);
  const span = max - min;
  const shown = hovered ?? null;
  const activeFor = (v: number) =>
    segments.find((s) => v >= s.min && v <= s.max) ?? segments[segments.length - 1];

  return (
    <div className="mt-2.5 relative">
      {shown && (
        <div className="absolute -top-1 left-0 right-0 -translate-y-full mb-1 z-10
          bg-card border border-border rounded-xl px-2.5 py-2 text-[10px] text-muted-foreground leading-relaxed shadow-[var(--shadow-float)] pointer-events-none">
          <span className="font-medium text-foreground">{shown.label.split(":")[0]}: </span>
          {shown.label.split(":").slice(1).join(":")}
        </div>
      )}
      <div className="relative h-2 rounded-full overflow-hidden flex cursor-default">
        {segments.map((s, i) => (
          <div
            key={i}
            className="h-full transition-opacity"
            style={{
              width: `${((s.max - s.min) / span) * 100}%`,
              background: s.color,
              opacity: hovered ? (hovered === s ? 1 : 0.45) : 1,
            }}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      <div className="relative h-3">
        {pointers.map((v, i) => {
          const pct = Math.max(0, Math.min(1, (v - min) / span)) * 100;
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 pointer-events-none"
              style={{ left: `${pct}%`, top: 1 }}
            >
              <svg width="14" height="8" viewBox="0 0 14 8">
                <polygon points="7,0 0,8 14,8" fill={activeFor(v).color} />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PH_SEGMENTS: ScaleSegment[] = [
  { min: 0,    max: 4,    color: "#c0392b", label: "pH < 4: Tödlich für alle einheimischen Fischarten." },
  { min: 4,    max: 5.5,  color: "#e67e22", label: "pH 4–5,5: Kleinlebewesen werden größtenteils geschädigt oder getötet. Bei Fischen kann Säurekrankheit auftreten." },
  { min: 5.5,  max: 6.5,  color: "#f1c40f", label: "pH 5,5–6,5: Übergangsbereich, leicht sauer." },
  { min: 6.5,  max: 8.5,  color: "#2ecc71", label: "pH 6,5–8,5: Üblicher Bereich natürlicher Gewässer." },
  { min: 8.5,  max: 10.8, color: "#e67e22", label: "pH 8,5–10,8: Bei Fischen kann Laugenkrankheit auftreten." },
  { min: 10.8, max: 14,   color: "#c0392b", label: "pH > 10,8: Tödlich für alle einheimischen Fischarten." },
];

const FU_SEGMENTS: ScaleSegment[] = [
  { min: 1,  max: 5,  color: "#2158bc", label: "FU 1–5: Geringe Nährstoffwerte und wenig Biomasseproduktion. Farbe durch Phytoplankton bestimmt." },
  { min: 5,  max: 9,  color: "#568f96", label: "FU 6–9: Farbe durch Algen bestimmt, gelöste Stoffe und Sediment möglich. Typisch Richtung offene See." },
  { min: 9,  max: 13, color: "#7dae38", label: "FU 10–13: Küstengewässer mit erhöhten Nährstoff- und Phytoplanktonwerten sowie Mineralien." },
  { min: 13, max: 17, color: "#b89744", label: "FU 14–17: Hohe Nährstoff- und Phytoplanktonkonzentration, Sediment. Typisch für küstennahe Bereiche." },
  { min: 17, max: 21, color: "#4d361a", label: "FU 18–21: Sehr hohe Huminsäurenkonzentration, typisch für Flüsse und Flussmündungen." },
];

// No universally agreed cm-scale clarity standard exists for small urban
// water bodies, so Sichttiefe gets a continuous gradient (turbid → clear)
// instead of invented discrete thresholds — see GradientScaleBar below.
function GradientScaleBar({ value, min, max, unit = "" }: {
  value: number;
  min: number;
  max: number;
  unit?: string;
}) {
  const span = Math.max(0.0001, max - min);
  const pct = Math.max(0, Math.min(1, (value - min) / span)) * 100;
  return (
    <div className="mt-2.5 relative">
      <div
        className="h-2 rounded-full"
        style={{ background: `linear-gradient(90deg, ${FU_COLORS[20]}, ${FU_COLORS[0]})` }}
      />
      <div className="relative h-3">
        <div className="absolute -translate-x-1/2 pointer-events-none" style={{ left: `${pct}%`, top: 1 }}>
          <svg width="14" height="8" viewBox="0 0 14 8">
            <polygon points="7,0 0,8 14,8" fill="var(--foreground)" />
          </svg>
        </div>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground stat-number mt-0.5">
        <span>{min.toFixed(0)}{unit}</span>
        <span>{max.toFixed(0)}{unit}</span>
      </div>
    </div>
  );
}

function FuLegendVertical() {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <div
        className="rounded-2xl border border-border p-2 flex items-stretch gap-1.5 cursor-default"
        style={{
          background: "color-mix(in oklab, white 92%, transparent)",
          backdropFilter: "saturate(180%) blur(20px)",
          boxShadow: "var(--shadow-float)",
          height: 280,
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <div className="flex flex-col text-[9px] text-muted-foreground stat-number justify-between leading-none w-4 text-right">
          {FU_COLORS.map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <div className="w-3 rounded-full overflow-hidden flex flex-col">
          {FU_COLORS.map((c, i) => (
            <div key={i} className="flex-1" style={{ background: c }} />
          ))}
        </div>
      </div>
      {show && (
        <div className="absolute top-0 right-full mr-2 z-20 w-56 bg-card border border-border rounded-xl px-3 py-2.5 text-[10px] text-muted-foreground leading-relaxed shadow-[var(--shadow-float)] pointer-events-none">
          <div className="font-medium text-foreground text-[11px] mb-1">Forel-Ule-Skala (1–21)</div>
          Die Forel-Ule-Skala beschreibt die Wasserfarbe von tiefblau (1) bis dunkelbraun (21). Sie spiegelt den Gehalt an Algen, Nährstoffen und gelösten Stoffen wider und ist ein einfacher Indikator für die optische Wasserqualität.
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>;
}