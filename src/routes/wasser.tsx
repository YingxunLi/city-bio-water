import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, FloatingCard } from "@/components/map-dashboard";
import { ViewToggle } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { BoxRow, computeBox } from "@/components/box-charts";
import { MultiTime } from "@/components/multi-time";
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

const FU_LABELS: Record<number, string> = {
  1: "Klar, blau",
  5: "Grünlich",
  10: "Grün–braun",
  15: "Bräunlich",
  21: "Trüb, dunkel",
};

function fuTooltip(p: { fu: number; ph: number; transparenz: number; date: string }) {
  const c = fuColor(p.fu);
  const date = new Date(p.date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `
    <div style="display:flex;gap:10px;align-items:stretch;min-width:170px;padding:2px 0">
      <div style="width:6px;border-radius:3px;background:${c};flex:none"></div>
      <div style="display:flex;flex-direction:column;gap:4px;font-family:inherit">
        <div style="display:flex;align-items:baseline;gap:6px">
          <span style="font-size:18px;font-weight:600;letter-spacing:-0.02em">FU ${p.fu}</span>
          <span style="font-size:10px;color:#6b7280">Forel-Ule</span>
        </div>
        <div style="font-size:11px;color:#374151;display:grid;grid-template-columns:auto auto;gap:2px 10px">
          <span style="color:#6b7280">pH</span><span>${p.ph.toFixed(2)}</span>
          <span style="color:#6b7280">Transp.</span><span>${p.transparenz.toFixed(1)} m</span>
          <span style="color:#6b7280">Datum</span><span>${date}</span>
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

  const metrics = useMemo(
    () => [
      { key: de.wasser.fu, values: data.wasser.map((d) => d.fu), domain: [1, 21] as [number, number], unit: "" },
      { key: de.wasser.ph, values: data.wasser.map((d) => d.ph), domain: [6, 9] as [number, number], unit: "" },
      { key: de.wasser.transparenz, values: data.wasser.map((d) => d.transparenz), domain: [0, 6] as [number, number], unit: " m" },
    ],
    [data.wasser],
  );

  const series = useMemo(
    () => [
      {
        key: "fu",
        label: de.wasser.fu,
        unit: "",
        opacity: 1,
        values: data.wasser.map((d) => ({ ts: new Date(d.date).getTime(), v: d.fu })),
      },
      {
        key: "ph",
        label: de.wasser.ph,
        unit: "",
        opacity: 0.65,
        values: data.wasser.map((d) => ({ ts: new Date(d.date).getTime(), v: d.ph })),
      },
      {
        key: "tr",
        label: de.wasser.transparenz,
        unit: "m",
        opacity: 0.4,
        values: data.wasser.map((d) => ({ ts: new Date(d.date).getTime(), v: d.transparenz })),
      },
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
          />

          {tab === "stats" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label={de.common.observations} value={data.wasser.length} accent={WASSER} hint="Gesamtzahl" />
                <Stat
                  label={de.wasser.fu}
                  value={avgFu ? avgFu.toFixed(1) : "—"}
                  accent={WASSER}
                  hint={de.common.avg}
                  swatch={avgFu ? fuColor(avgFu) : undefined}
                />
                <Stat label={de.wasser.ph} value={avgPh ? avgPh.toFixed(2) : "—"} accent={WASSER} hint={de.common.avg} />
                <Stat
                  label={de.wasser.transparenz}
                  value={avgTrans ? `${avgTrans.toFixed(1)} m` : "—"}
                  accent={WASSER}
                  hint={de.common.avg}
                />
              </div>
              <div className="rounded-2xl border border-border bg-card p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {de.common.observations} · {de.common.overTime}
                </div>
                <TimeSeries data={ts} color={WASSER} height={120} />
              </div>
            </div>
          )}

          {tab === "verteilung" &&
            (data.wasser.length === 0 ? (
              <Empty />
            ) : (
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
            ))}

          {tab === "verlauf" &&
            (data.wasser.length === 0 ? (
              <Empty />
            ) : (
              <MultiTime series={series} color={WASSER} rangeDays={range} height={200} />
            ))}
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
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function FuLegendVertical() {
  return (
    <div
      className="rounded-2xl border border-border p-2 flex items-stretch gap-2"
      style={{
        background: "color-mix(in oklab, white 92%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
        height: 220,
      }}
      title="Forel-Ule-Skala (1 klar – 21 trüb)"
    >
      <div className="flex flex-col text-[9px] text-muted-foreground stat-number justify-between leading-none w-7 text-right">
        {[1, 5, 10, 15, 21].map((n) => (
          <div key={n} className="flex flex-col items-end">
            <span>{n}</span>
            {FU_LABELS[n] && (
              <span className="text-[8px] opacity-70 leading-tight">{FU_LABELS[n]}</span>
            )}
          </div>
        ))}
      </div>
      <div className="w-2.5 rounded-full overflow-hidden flex flex-col">
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
