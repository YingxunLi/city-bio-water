import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, FloatingCard } from "@/components/map-dashboard";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { fuColor } from "@/lib/mock-data";
import { Droplets, TreePine, Bird, ArrowUpRight } from "lucide-react";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Übersicht – BürgerDaten" },
      {
        name: "description",
        content: "Live-Übersicht aller Bürgerdaten zu Wasser, Stadtgrün und Biodiversität.",
      },
    ],
  }),
  component: HomePage,
});

type Tab = "quellen" | "verlauf" | "stats";

function HomePage() {
  const { data, range, city } = useFilters();
  const [tab, setTab] = useState<Tab>("quellen");

  const allPoints: MapPoint[] = useMemo(
    () => [
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
    ],
    [data],
  );

  const total = data.wasser.length + data.stadt.length + data.bio.length;
  const ts = {
    wasser: bucketByDay(data.wasser, range),
    stadt: bucketByDay(data.stadt, range),
    bio: bucketByDay(data.bio, range),
  };
  const avgFu = data.wasser.length
    ? data.wasser.reduce((a, b) => a + b.fu, 0) / data.wasser.length
    : 0;
  const avgNest = data.stadt.length
    ? Math.round(data.stadt.reduce((a, b) => a + b.nest, 0) / data.stadt.length)
    : 0;
  const uniqSpecies = new Set(data.bio.map((b) => b.species)).size;

  const merged = useMemo(() => {
    const map = new Map<string, { label: string; w: number; s: number; b: number }>();
    [...ts.wasser, ...ts.stadt, ...ts.bio].forEach((p) => {
      if (!map.has(p.label)) map.set(p.label, { label: p.label, w: 0, s: 0, b: 0 });
    });
    ts.wasser.forEach((p) => (map.get(p.label)!.w = p.count));
    ts.stadt.forEach((p) => (map.get(p.label)!.s = p.count));
    ts.bio.forEach((p) => (map.get(p.label)!.b = p.count));
    return Array.from(map.values());
  }, [ts]);

  return (
    <MapDashboard
      map={<GeoMap points={allPoints} flush />}
      overlay={
        <FloatingCard>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            {city.name}
          </div>
          <FilterBar compact />
        </FloatingCard>
      }
      mapLegend={
        <FloatingCard className="!p-2 flex flex-col gap-1.5">
          <Legend dot="#243285" label="Wasser" />
          <Legend dot="#F0A08C" label="Stadt" />
          <Legend dot="#00A36F" label="Biodiversität" />
        </FloatingCard>
      }
      panel={
        <>
          <PanelTabs
            value={tab}
            onChange={setTab}
            options={[
              { v: "quellen", label: "Quellen" },
              { v: "verlauf", label: de.common.overTime },
              { v: "stats", label: "Statistik" },
            ]}
          />

          {tab === "quellen" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          )}

          {tab === "verlauf" && <StackedArea data={merged} />}

          {tab === "stats" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Beobachtungen gesamt" value={total.toLocaleString("de-DE")} accent="var(--foreground)" />
              <Stat label="Ø FU-Wert" value={avgFu ? avgFu.toFixed(1) : "—"} accent="var(--wasser)" />
              <Stat label="Ø NEST" value={avgNest || "—"} accent="var(--stadt)" />
              <Stat label="Verschiedene Arten" value={uniqSpecies} accent="var(--bio)" />
            </div>
          )}
        </>
      }
    />
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
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
      <div className="mt-1 text-xl md:text-2xl font-semibold stat-number">{value}</div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
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
      className="rounded-2xl border border-border bg-card p-3 group relative overflow-hidden hover:shadow-[var(--shadow-float)] transition-shadow"
    >
      <div
        className="absolute -top-8 -right-8 size-28 rounded-full opacity-[0.08]"
        style={{ background: accent }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="size-7 rounded-lg flex items-center justify-center"
            style={{ background: `color-mix(in oklab, ${accent} 14%, white)` }}
          >
            {icon}
          </div>
          <div>
            <div className="font-semibold tracking-tight text-sm">{label}</div>
            <div className="text-[10px] text-muted-foreground">{source}</div>
          </div>
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition" />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold stat-number leading-none">
            {count.toLocaleString("de-DE")}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Beobachtungen</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">{metricLabel}</div>
          <div className="flex items-center gap-1.5 justify-end">
            {metricSwatch && (
              <span
                className="size-2.5 rounded-full border border-border"
                style={{ background: metricSwatch }}
              />
            )}
            <span className="text-base font-semibold stat-number">{metricValue}</span>
          </div>
        </div>
      </div>
      <div className="-mx-1 mt-1">
        <TimeSeries data={ts} color={accent} height={48} />
      </div>
    </Link>
  );
}

function StackedArea({
  data,
}: {
  data: { label: string; w: number; s: number; b: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
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
          formatter={(v) => (v === "w" ? "Wasser" : v === "s" ? "Stadt" : "Biodiversität")}
        />
        <Area type="monotone" dataKey="w" stroke="#243285" strokeWidth={1.5} fill="url(#gw)" stackId="1" />
        <Area type="monotone" dataKey="s" stroke="#F0A08C" strokeWidth={1.5} fill="url(#gs)" stackId="1" />
        <Area type="monotone" dataKey="b" stroke="#00A36F" strokeWidth={1.5} fill="url(#gb)" stackId="1" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
