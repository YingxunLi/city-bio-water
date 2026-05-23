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

type Tab = "stats" | "fu" | "ph" | "trans";

function fmtFull(d: string) {
  const t = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
}

function fuTooltip(p: { fu: number; lat: number; lon: number; date: string; device: string }) {
  const c = fuColor(p.fu);
  return `
    <div style="display:flex;gap:10px;align-items:stretch;min-width:230px;padding:2px 0">
      <div style="width:6px;border-radius:3px;background:${c};flex:none"></div>
      <div style="display:flex;flex-direction:column;gap:3px;font-family:inherit">
        <div style="font-size:13px;font-weight:600;letter-spacing:-0.01em">FU value verarbeitet: ${p.fu}</div>
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
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const avgFu = avg(data.wasser.map((d) => d.fu));
  const avgPh = avg(data.wasser.map((d) => d.ph));
  const avgTrans = avg(data.wasser.map((d) => d.transparenz));

  const ptsFu: Point[] = useMemo(
    () => data.wasser.map((d) => ({ ts: new Date(d.date).getTime(), v: d.fu, meta: { lat: d.lat, lon: d.lon } })),
    [data.wasser],
  );
  const ptsPh: Point[] = useMemo(
    () => data.wasser.map((d) => ({ ts: new Date(d.date).getTime(), v: d.ph, meta: { lat: d.lat, lon: d.lon } })),
    [data.wasser],
  );
  const ptsTr: Point[] = useMemo(
    () => data.wasser.map((d) => ({ ts: new Date(d.date).getTime(), v: d.transparenz, meta: { lat: d.lat, lon: d.lon } })),
    [data.wasser],
  );

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
          />
          <PanelBody>
            {tab === "stats" && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-4">
                <div className="grid grid-cols-2 gap-3 content-start">
                  <Stat label={de.common.observations} value={data.wasser.length} accent={WASSER} hint="Gesamtzahl" />
                  <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: WASSER }} />
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{de.wasser.fu}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      {avgFu ? <span className="size-3 rounded-full border border-border" style={{ background: fuColor(avgFu) }} /> : null}
                      <span className="text-xl md:text-2xl font-semibold stat-number">{avgFu ? avgFu.toFixed(1) : "—"}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{`Ø ${de.common.avg}`}</div>
                    {avgFu ? <ScaleBar segments={FU_SEGMENTS} value={avgFu} min={1} max={21} /> : null}
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: WASSER }} />
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{de.wasser.ph}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xl md:text-2xl font-semibold stat-number">{avgPh ? avgPh.toFixed(2) : "—"}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{`Ø ${de.common.avg}`}</div>
                    {avgPh ? <ScaleBar segments={PH_SEGMENTS} value={avgPh} min={0} max={14} /> : null}
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: WASSER }} />
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{de.wasser.transparenz}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xl md:text-2xl font-semibold stat-number">{avgTrans ? `${avgTrans.toFixed(1)} m` : "—"}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{`Ø ${de.common.avg}`}</div>
                    {avgTrans ? <ScaleBar segments={TRANS_SEGMENTS} value={avgTrans} min={0} max={15} /> : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-3 min-h-[180px]">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {de.common.observations} · {de.common.overTime}
                  </div>
                  <TimeSeries data={ts} color={WASSER} height={160} />
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
              <MetricChart values={ptsTr} color={WASSER} rangeDays={range} unit=" m" label={de.wasser.transparenz} domain={[0, 6]} height={210} />
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

function ScaleBar({ segments, value, min, max }: {
  segments: ScaleSegment[];
  value: number;
  min: number;
  max: number;
}) {
  const [tooltip, setTooltip] = React.useState<string | null>(null);
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min))) * 100;
  const active = segments.find(s => value >= s.min && value <= s.max) ?? segments[segments.length - 1];

  return (
    <div className="mt-2.5 relative">
      {tooltip && (
        <div className="absolute -top-1 left-0 right-0 -translate-y-full mb-1 z-10
          bg-card border border-border rounded-xl px-2.5 py-2 text-[10px] text-muted-foreground leading-relaxed shadow-[var(--shadow-float)] pointer-events-none">
          <span className="font-medium text-foreground">{active.label.split(":")[0]}: </span>
          {active.label.split(":").slice(1).join(":")}
        </div>
      )}
      <div
        className="relative h-2 rounded-full overflow-hidden flex cursor-default"
        onMouseEnter={() => setTooltip(active.label)}
        onMouseLeave={() => setTooltip(null)}
      >
        {segments.map((s, i) => (
          <div
            key={i}
            className="h-full"
            style={{
              width: `${((s.max - s.min) / (max - min)) * 100}%`,
              background: s.color,
            }}
          />
        ))}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full border-2 border-white shadow-sm pointer-events-none"
          style={{ left: `${pct}%`, background: active.color }}
        />
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

const TRANS_SEGMENTS: ScaleSegment[] = [
  { min: 0,  max: 2,  color: "#c0392b", label: "< 2 m (Niedrig): Starke Trübung, stark nährstoffreich (eutroph). Starke Algenblüte oder Schwebstoffe." },
  { min: 2,  max: 5,  color: "#e67e22", label: "2–5 m (Mittel): Moderater Nährstoffgehalt (mesotroph). Typisch für mittlere Seen und Küstengewässer." },
  { min: 5,  max: 10, color: "#2ecc71", label: "5–10 m (Hoch): Klarwassersystem (oligotroph). Nährstoffarm, wenig Algen, tiefe Photosynthesezonen." },
  { min: 10, max: 15, color: "#1abc9c", label: "> 10 m (Sehr hoch): Extrem klares Wasser, wie in nährstoffarmen Gebirgsseen oder Ozeanen." },
];

function FuLegendVertical() {
  return (
    <div
      className="rounded-2xl border border-border p-2 flex items-stretch gap-1.5"
      style={{
        background: "color-mix(in oklab, white 92%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
        height: 280,
      }}
      title="Forel-Ule-Skala (1 – 21)"
    >
      <div className="flex flex-col text-[9px] text-muted-foreground stat-number justify-between leading-none w-4 text-right">
        {FU_COLORS.map((_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
      <div className="w-3 rounded-full overflow-hidden flex flex-col">
        {FU_COLORS.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c }} title={`FU ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>;
}