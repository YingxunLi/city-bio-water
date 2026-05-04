import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { SectionHeader, StatCard, PanelCard } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { fuColor } from "@/lib/mock-data";
import { Droplets, TreePine, Bird, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Übersicht – BürgerDaten" },
      {
        name: "description",
        content:
          "Live-Übersicht aller Bürgerdaten zu Wasser, Stadtgrün und Biodiversität.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, range, city } = useFilters();

  const allPoints: MapPoint[] = useMemo(() => {
    return [
      ...data.wasser.map<MapPoint>((p) => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        color: "#243285",
        radius: 4,
        tooltip: `<b>Wasser</b> · FU ${p.fu}`,
      })),
      ...data.stadt.map<MapPoint>((p) => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        color: "#F0A08C",
        radius: 4,
        tooltip: `<b>Stadt</b> · NEST ${p.nest}`,
      })),
      ...data.bio.map<MapPoint>((p) => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        color: "#00A36F",
        radius: 4,
        tooltip: `<b>Bio</b> · ${p.species}`,
      })),
    ];
  }, [data]);

  const total = data.wasser.length + data.stadt.length + data.bio.length;
  const ts = {
    wasser: bucketByDay(data.wasser, range),
    stadt: bucketByDay(data.stadt, range),
    bio: bucketByDay(data.bio, range),
  };

  // Average FU color band (Wasser quick read)
  const avgFu = data.wasser.length
    ? data.wasser.reduce((a, b) => a + b.fu, 0) / data.wasser.length
    : 0;
  const avgNest = data.stadt.length
    ? Math.round(data.stadt.reduce((a, b) => a + b.nest, 0) / data.stadt.length)
    : 0;
  const uniqSpecies = new Set(data.bio.map((b) => b.species)).size;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Übersicht"
        title={`Was passiert in ${city.name}?`}
        subtitle="Lebende Daten aus drei Bürgerwissenschafts-Apps – an einem Ort."
      />

      <FilterBar />

      {/* Triptych summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CategoryCard
          to="/wasser"
          accent="var(--wasser)"
          icon={<Droplets className="size-4" style={{ color: "var(--wasser)" }} />}
          label={de.nav.wasser}
          source="EyeOnWater"
          count={data.wasser.length}
          metricLabel={de.wasser.fu}
          metricValue={avgFu ? avgFu.toFixed(1) : "—"}
          metricSwatch={avgFu ? fuColor(avgFu) : undefined}
          ts={ts.wasser}
        />
        <CategoryCard
          to="/stadt"
          accent="var(--stadt)"
          icon={<TreePine className="size-4" style={{ color: "var(--stadt)" }} />}
          label={de.nav.stadt}
          source="Greenspace Hack"
          count={data.stadt.length}
          metricLabel={de.stadt.nest}
          metricValue={avgNest || "—"}
          ts={ts.stadt}
        />
        <CategoryCard
          to="/biodiversitaet"
          accent="var(--bio)"
          icon={<Bird className="size-4" style={{ color: "var(--bio)" }} />}
          label={de.nav.bio}
          source="iNaturalist"
          count={data.bio.length}
          metricLabel={de.bio.species}
          metricValue={uniqSpecies}
          ts={ts.bio}
        />
      </div>

      {/* Aggregate map */}
      <PanelCard
        title="Gesamtkarte"
        hint={`${total.toLocaleString("de-DE")} Beobachtungen im gewählten Bereich`}
      >
        <GeoMap points={allPoints} height={420} />
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
          <Legend dot="#243285" label="Wasser" />
          <Legend dot="#F0A08C" label="Stadt" />
          <Legend dot="#00A36F" label="Biodiversität" />
        </div>
      </PanelCard>

      {/* Combined timeline */}
      <PanelCard
        title={de.common.overTime}
        hint="Beobachtungen pro Bucket – alle drei Quellen"
      >
        <CombinedTimeline data={data} range={range} />
      </PanelCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Beobachtungen gesamt"
          value={total.toLocaleString("de-DE")}
          accent="var(--foreground)"
        />
        <StatCard
          label="Ø FU-Wert"
          value={avgFu ? avgFu.toFixed(1) : "—"}
          accent="var(--wasser)"
          hint="1 = klar / 21 = trüb-braun"
        />
        <StatCard
          label="Ø NEST Score"
          value={avgNest || "—"}
          accent="var(--stadt)"
          hint="0–100, höher = besser"
        />
        <StatCard
          label="Verschiedene Arten"
          value={uniqSpecies}
          accent="var(--bio)"
        />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}

function CategoryCard({
  to,
  accent,
  icon,
  label,
  source,
  count,
  metricLabel,
  metricValue,
  metricSwatch,
  ts,
}: {
  to: string;
  accent: string;
  icon: React.ReactNode;
  label: string;
  source: string;
  count: number;
  metricLabel: string;
  metricValue: React.ReactNode;
  metricSwatch?: string;
  ts: { label: string; count: number }[];
}) {
  return (
    <Link
      to={to}
      className="surface-card p-5 group relative overflow-hidden hover:shadow-[var(--shadow-float)] transition-shadow"
    >
      <div
        className="absolute -top-10 -right-10 size-36 rounded-full opacity-[0.08]"
        style={{ background: accent }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="size-8 rounded-xl flex items-center justify-center"
            style={{ background: `color-mix(in oklab, ${accent} 14%, white)` }}
          >
            {icon}
          </div>
          <div>
            <div className="font-semibold tracking-tight">{label}</div>
            <div className="text-[11px] text-muted-foreground">{source}</div>
          </div>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-semibold stat-number">
            {count.toLocaleString("de-DE")}
          </div>
          <div className="text-[11px] text-muted-foreground">Beobachtungen</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted-foreground">{metricLabel}</div>
          <div className="flex items-center gap-1.5 justify-end">
            {metricSwatch && (
              <span
                className="size-3 rounded-full border border-border"
                style={{ background: metricSwatch }}
              />
            )}
            <span className="text-lg font-semibold stat-number">{metricValue}</span>
          </div>
        </div>
      </div>
      <div className="-mx-2 mt-2">
        <TimeSeries data={ts} color={accent} height={70} />
      </div>
    </Link>
  );
}

function CombinedTimeline({
  data,
  range,
}: {
  data: ReturnType<typeof useFilters>["data"];
  range: number;
}) {
  // simple stacked area via three TimeSeries layered? Use a single recharts compound.
  const merged = useMemo(() => {
    const w = bucketByDay(data.wasser, range);
    const s = bucketByDay(data.stadt, range);
    const b = bucketByDay(data.bio, range);
    const map = new Map<string, { label: string; w: number; s: number; b: number }>();
    [...w, ...s, ...b].forEach((p) => {
      if (!map.has(p.label)) map.set(p.label, { label: p.label, w: 0, s: 0, b: 0 });
    });
    w.forEach((p) => (map.get(p.label)!.w = p.count));
    s.forEach((p) => (map.get(p.label)!.s = p.count));
    b.forEach((p) => (map.get(p.label)!.b = p.count));
    return Array.from(map.values());
  }, [data, range]);

  return <StackedArea data={merged} />;
}

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend as RLegend,
} from "recharts";

function StackedArea({
  data,
}: {
  data: { label: string; w: number; s: number; b: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#243285" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#243285" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F0A08C" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#F0A08C" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00A36F" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#00A36F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={20}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <RLegend
          wrapperStyle={{ fontSize: 11 }}
          iconType="circle"
          formatter={(v) =>
            v === "w" ? "Wasser" : v === "s" ? "Stadt" : "Biodiversität"
          }
        />
        <Area type="monotone" dataKey="w" stroke="#243285" strokeWidth={1.5} fill="url(#gw)" stackId="1" />
        <Area type="monotone" dataKey="s" stroke="#F0A08C" strokeWidth={1.5} fill="url(#gs)" stackId="1" />
        <Area type="monotone" dataKey="b" stroke="#00A36F" strokeWidth={1.5} fill="url(#gb)" stackId="1" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
