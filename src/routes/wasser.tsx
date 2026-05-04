import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { SectionHeader, StatCard, PanelCard, ViewToggle } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { BoxRow, RadarBox, computeBox } from "@/components/box-charts";
import { FU_COLORS, fuColor } from "@/lib/mock-data";
import { Droplets } from "lucide-react";

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

function WasserPage() {
  const { data, range } = useFilters();
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [boxMode, setBoxMode] = useState<"box" | "radar">("box");

  const points: MapPoint[] = data.wasser.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    color: fuColor(p.fu),
    radius: 6,
    tooltip: `<b>FU ${p.fu}</b> · pH ${p.ph} · ${p.transparenz} m`,
  }));

  const ts = bucketByDay(data.wasser, range);
  const avgFu = data.wasser.length
    ? data.wasser.reduce((a, b) => a + b.fu, 0) / data.wasser.length
    : 0;
  const avgPh = data.wasser.length
    ? data.wasser.reduce((a, b) => a + b.ph, 0) / data.wasser.length
    : 0;
  const avgTrans = data.wasser.length
    ? data.wasser.reduce((a, b) => a + b.transparenz, 0) / data.wasser.length
    : 0;

  const metrics = useMemo(() => {
    return [
      {
        key: de.wasser.fu,
        values: data.wasser.map((d) => d.fu),
        domain: [1, 21] as [number, number],
        unit: "",
      },
      {
        key: de.wasser.ph,
        values: data.wasser.map((d) => d.ph),
        domain: [6, 9] as [number, number],
        unit: "",
      },
      {
        key: de.wasser.transparenz,
        values: data.wasser.map((d) => d.transparenz),
        domain: [0, 6] as [number, number],
        unit: " m",
      },
    ];
  }, [data.wasser]);

  // Time series of metric medians (per bucket) for FU/pH/Transparenz
  const metricSeries = useMemo(() => {
    const cutoff = Date.now() - range * 86400_000;
    const bucketDays = range <= 30 ? 1 : range <= 90 ? 3 : range <= 365 ? 14 : 30;
    const buckets = new Map<number, { fu: number[]; ph: number[]; tr: number[] }>();
    for (const p of data.wasser) {
      const t = new Date(p.date).getTime();
      if (t < cutoff) continue;
      const day = Math.floor(t / 86400_000);
      const key = Math.floor(day / bucketDays) * bucketDays;
      let g = buckets.get(key);
      if (!g) buckets.set(key, (g = { fu: [], ph: [], tr: [] }));
      g.fu.push(p.fu);
      g.ph.push(p.ph);
      g.tr.push(p.transparenz);
    }
    const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => ({
        label: new Date(k * 86400_000).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "short",
        }),
        fu: +avg(v.fu).toFixed(2),
        ph: +avg(v.ph).toFixed(2),
        tr: +avg(v.tr).toFixed(2),
      }));
  }, [data.wasser, range]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="EyeOnWater"
        accent={WASSER}
        title={de.wasser.title}
        subtitle={de.wasser.subtitle}
        right={
          <div
            className="hidden md:flex size-12 rounded-2xl items-center justify-center"
            style={{ background: "var(--wasser-soft)" }}
          >
            <Droplets className="size-5" style={{ color: WASSER }} />
          </div>
        }
      />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={de.common.observations} value={data.wasser.length} accent={WASSER} />
        <StatCard
          label={`Ø ${de.wasser.fu}`}
          value={avgFu ? avgFu.toFixed(1) : "—"}
          accent={WASSER}
          icon={
            avgFu ? (
              <span
                className="size-4 rounded-full border border-border"
                style={{ background: fuColor(avgFu) }}
              />
            ) : null
          }
        />
        <StatCard label={`Ø ${de.wasser.ph}`} value={avgPh ? avgPh.toFixed(2) : "—"} accent={WASSER} />
        <StatCard
          label={`Ø ${de.wasser.transparenz}`}
          value={avgTrans ? `${avgTrans.toFixed(1)} m` : "—"}
          accent={WASSER}
        />
      </div>

      <PanelCard
        title={de.common.map}
        accent={WASSER}
        hint="Farbe = FU-Wert (Forel-Ule-Skala)"
        right={
          <ViewToggle
            value={mapMode}
            onChange={setMapMode}
            options={[
              { v: "points", label: de.common.map },
              { v: "heat", label: de.common.heatmap },
            ]}
          />
        }
      >
        <GeoMap points={points} heat={mapMode === "heat"} baseColor={WASSER} height={440} />
        <FuLegend />
      </PanelCard>

      <PanelCard
        title={de.common.overTime}
        accent={WASSER}
        hint="Mittelwerte je Bucket"
      >
        <MetricLines data={metricSeries} />
      </PanelCard>

      <PanelCard
        title="Verteilung der Messwerte"
        accent={WASSER}
        hint={
          boxMode === "box"
            ? "Boxplot: Median, IQR (Q1–Q3) und Spannweite je Kennwert."
            : "Radar-Boxplot: Median als Linie, IQR als gefüllter Ring."
        }
        right={
          <ViewToggle
            value={boxMode}
            onChange={setBoxMode}
            options={[
              { v: "box", label: de.common.boxplotView },
              { v: "radar", label: de.common.radarView },
            ]}
          />
        }
      >
        {data.wasser.length === 0 ? (
          <Empty />
        ) : boxMode === "box" ? (
          <div className="space-y-3">
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
              size={340}
            />
          </div>
        )}
      </PanelCard>

      <PanelCard title="Beobachtungen pro Zeit" accent={WASSER}>
        <TimeSeries data={ts} color={WASSER} />
      </PanelCard>
    </div>
  );
}

function MetricLines({
  data,
}: {
  data: { label: string; fu: number; ph: number; tr: number }[];
}) {
  const Recharts = require("recharts");
  return null as never;
}
