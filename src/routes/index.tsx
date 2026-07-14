import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, PanelBody, FloatingCard } from "@/components/map-dashboard";
import { avgValid } from "@/lib/mock-data";
import { Droplets, TreePine, Bird, ArrowUpRight } from "lucide-react";

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

type Tab = "quellen" | "stats";

function HomePage() {
  const { data } = useFilters();
  const [tab, setTab] = useState<Tab>("quellen");

  const allPoints: MapPoint[] = [
    ...data.wasser.map<MapPoint>((p) => ({
      id: p.id, lat: p.lat, lon: p.lon, color: "#243285", radius: 4,
      tooltip: `<b>Wasser</b> · FU ${p.fu ?? "k. A."}`,
    })),
    ...data.stadt.map<MapPoint>((p) => ({
      id: p.id, lat: p.lat, lon: p.lon, color: "#F0A08C", radius: 4,
      tooltip: `<b>Stadt</b> · NEST ${p.nest ?? "k. A."}`,
    })),
    ...data.bio.map<MapPoint>((p) => ({
      id: p.id, lat: p.lat, lon: p.lon, color: "#00A36F", radius: 4,
      tooltip: `<b>Bio</b> · ${p.species}`,
    })),
  ];

  const total = data.wasser.length + data.stadt.length + data.bio.length;
  const avgFu = avgValid(data.wasser.map((d) => d.fu));
  const avgNestRaw = avgValid(data.stadt.map((d) => d.nest));
  const avgNest = avgNestRaw != null ? Math.round(avgNestRaw) : null;
  const uniqSpecies = new Set(data.bio.map((b) => b.species)).size;

  return (
    <MapDashboard
      map={<GeoMap points={allPoints} flush />}
      overlay={<FilterBar compact />}
      mapLegend={
        <FloatingCard className="!p-1 !px-2 flex flex-col gap-1">
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
              { v: "stats", label: "Statistik" },
            ]}
          />
          <PanelBody>
            {tab === "quellen" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CategoryCard
                  href="https://www.parkli.de/monitoring-apps" accent="var(--wasser)"
                  icon={<Droplets className="size-4" style={{ color: "var(--wasser)" }} />}
                  label={de.nav.wasser} source="EyeOnWater"
                  count={data.wasser.length}
                />
                <CategoryCard
                  href="https://www.parkli.de/stadt" accent="var(--stadt)"
                  icon={<TreePine className="size-4" style={{ color: "var(--stadt)" }} />}
                  label={de.nav.stadt} source="Greenspace Hack"
                  count={data.stadt.length}
                />
                <CategoryCard
                  href="https://www.parkli.de/biodiversitaet" accent="var(--bio)"
                  icon={<Bird className="size-4" style={{ color: "var(--bio)" }} />}
                  label={de.nav.bio} source="iNaturalist"
                  count={data.bio.length}
                />
              </div>
            )}

            {tab === "stats" && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Beobachtungen gesamt" value={total.toLocaleString("de-DE")} accent="var(--foreground)" hint="Summe" />
                <Stat label="Ø FU-Wert" value={avgFu != null ? avgFu.toFixed(1) : "—"} accent="var(--wasser)" hint={`Durchschnitt · n=${data.wasser.filter((d) => d.fu != null).length}`} />
                <Stat label="Ø NEST" value={avgNest != null ? avgNest : "—"} accent="var(--stadt)" hint={`Durchschnitt · n=${data.stadt.filter((d) => d.nest != null).length}`} />
                <Stat label="Verschiedene Arten" value={uniqSpecies} accent="var(--bio)" hint={`Unique · n=${data.bio.length}`} />
              </div>
            )}
          </PanelBody>
        </>
      }
    />
  );
}

function Stat({ label, value, accent, hint }: { label: string; value: React.ReactNode; accent: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 relative overflow-hidden">
      <div className="absolute -top-6 -right-6 size-20 rounded-full opacity-10" style={{ background: accent }} />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 text-xl md:text-2xl font-semibold stat-number">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
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
  href, accent, icon, label, source, count,
}: {
  href: string; accent: string; icon: React.ReactNode; label: string; source: string;
  count: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 group relative overflow-hidden transition-shadow">
      <div className="absolute -top-8 -right-8 size-28 rounded-full opacity-[0.08] group-hover:opacity-[0.16] transition-opacity pointer-events-none" style={{ background: accent }} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg flex items-center justify-center"
               style={{ background: `color-mix(in oklab, ${accent} 14%, white)` }}>
            {icon}
          </div>
          <div>
            <div className="font-semibold tracking-tight text-sm">{label}</div>
            <div className="text-[10px] text-muted-foreground">{source}</div>
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} öffnen`}
        >
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </a>
      </div>
      <div className="mt-3">
        <div className="text-xl md:text-2xl font-semibold stat-number leading-none">{count.toLocaleString("de-DE")}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">Beobachtungen</div>
      </div>
    </div>
  );
}