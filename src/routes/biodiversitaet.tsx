import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, FloatingCard } from "@/components/map-dashboard";
import { ViewToggle } from "@/components/ui-bits";
// import removed: TimeSeries no longer used here
import { BIO_CATEGORIES } from "@/lib/mock-data";

export const Route = createFileRoute("/biodiversitaet")({
  head: () => ({
    meta: [
      { title: "Biodiversität – BürgerDaten" },
      { name: "description", content: "iNaturalist Beobachtungen in Echtzeit." },
    ],
  }),
  component: BioPage,
});

const BIO = "#00A36F";

const CAT_COLORS: Record<string, string> = {
  Plantae: "#00A36F",
  Aves: "#3FB7A0",
  Reptilia: "#A8C957",
  Actinopterygii: "#1E7F8C",
  Insecta: "#F0A08C",
  Arachnida: "#7B4F3A",
  Fungi: "#C68B59",
  Mammalia: "#243285",
};

type Tab = "stats" | "kategorien" | "arten";

function BioPage() {
  const { data } = useFilters();
  const [chartMode, setChartMode] = useState<"bar" | "donut">("donut");
  const [tab, setTab] = useState<Tab>("stats");

  const points: MapPoint[] = data.bio.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    color: CAT_COLORS[p.category] ?? BIO,
    radius: p.threatened ? 7 : p.invasive ? 6 : 4,
    tooltip: `<b>${p.species}</b><br/>${p.category}${p.invasive ? " · invasiv" : ""}${p.threatened ? " · bedroht" : ""}`,
  }));

  // verlauf disabled per spec
  const speciesSet = new Set(data.bio.map((b) => b.species));
  const invasiveCount = data.bio.filter((b) => b.invasive).length;
  const threatenedCount = data.bio.filter((b) => b.threatened).length;

  const byCategory = useMemo(() => {
    const total = Math.max(1, data.bio.length);
    return BIO_CATEGORIES.map((c) => {
      const n = data.bio.filter((b) => b.category === c).length;
      return { category: c, count: n, pct: (n / total) * 100, color: CAT_COLORS[c] };
    }).sort((a, b) => b.count - a.count);
  }, [data.bio]);
  const maxCount = Math.max(1, ...byCategory.map((b) => b.count));

  const topSpecies = useMemo(() => {
    const m = new Map<string, { species: string; category: string; n: number }>();
    for (const b of data.bio) {
      const cur = m.get(b.species);
      if (cur) cur.n += 1;
      else m.set(b.species, { species: b.species, category: b.category, n: 1 });
    }
    return Array.from(m.values()).sort((a, b) => b.n - a.n).slice(0, 8);
  }, [data.bio]);

  return (
    <MapDashboard
      map={<GeoMap points={points} baseColor={BIO} flush />}
      overlay={
        <FloatingCard>
          <FilterBar compact />
        </FloatingCard>
      }
      mapLegend={<CatLegendVertical />}
      panel={
        <>
          <PanelTabs
            value={tab}
            onChange={setTab}
            options={[
              { v: "stats", label: "Statistik" },
              { v: "kategorien", label: de.bio.categories },
              { v: "arten", label: "Häufigste Arten" },
            ]}
            right={
              tab === "kategorien" ? (
                <ViewToggle
                  value={chartMode}
                  onChange={setChartMode}
                  options={[
                    { v: "donut", label: "Donut" },
                    { v: "bar", label: "Balken" },
                  ]}
                />
              ) : null
            }
          />

          {tab === "stats" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label={de.common.observations} value={data.bio.length} accent={BIO} />
              <Stat label={de.bio.species} value={speciesSet.size} accent={BIO} />
              <Stat
                label={de.bio.invasive}
                value={invasiveCount}
                accent="#C68B59"
                hint={`${((invasiveCount / Math.max(1, data.bio.length)) * 100).toFixed(1)} %`}
              />
              <Stat
                label={de.bio.threatened}
                value={threatenedCount}
                accent="#C0392B"
                hint={`${((threatenedCount / Math.max(1, data.bio.length)) * 100).toFixed(1)} %`}
              />
            </div>
          )}

          {tab === "kategorien" &&
            (data.bio.length === 0 ? (
              <Empty />
            ) : chartMode === "bar" ? (
              <div className="space-y-2">
                {byCategory.map((b) => (
                  <div
                    key={b.category}
                    className="grid grid-cols-[110px_1fr_70px] items-center gap-3"
                    title={`${b.category}: ${b.count} (${b.pct.toFixed(1)} %)`}
                  >
                    <div className="text-xs">{b.category}</div>
                    <div className="h-5 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{ width: `${(b.count / maxCount) * 100}%`, background: b.color, opacity: 0.9 }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground stat-number text-right">
                      {b.count} · {b.pct.toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Donut data={byCategory} />
            ))}

          {tab === "arten" &&
            (topSpecies.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-border">
                {topSpecies.map((s, i) => (
                  <li key={s.species} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] tabular-nums text-muted-foreground w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ background: CAT_COLORS[s.category] ?? BIO }}
                      />
                      <span className="font-medium italic truncate text-sm">{s.species}</span>
                      <span className="text-[11px] text-muted-foreground hidden md:inline">
                        {s.category}
                      </span>
                    </div>
                    <span className="text-sm stat-number">{s.n}</span>
                  </li>
                ))}
              </ul>
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
  hint,
}: {
  label: string;
  value: React.ReactNode;
  accent: string;
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
      <div className="mt-1 text-xl md:text-2xl font-semibold stat-number">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function CatLegendVertical() {
  return (
    <div
      className="rounded-2xl border border-border p-2 flex flex-col gap-1"
      style={{
        background: "color-mix(in oklab, white 88%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
      }}
    >
      {Object.entries(CAT_COLORS).map(([k, c]) => (
        <div key={k} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: c }} />
          {k}
        </div>
      ))}
    </div>
  );
}

function Donut({
  data,
}: {
  data: { category: string; count: number; pct: number; color: string }[];
}) {
  const size = 180;
  const r = 75;
  const c = size / 2;
  const total = data.reduce((a, b) => a + b.count, 0) || 1;
  let acc = 0;
  const arcs = data.map((d) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.count;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = c + Math.cos(a0) * r;
    const y0 = c + Math.sin(a0) * r;
    const x1 = c + Math.cos(a1) * r;
    const y1 = c + Math.sin(a1) * r;
    return { d: `M${c},${c} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`, ...d };
  });
  return (
    <div className="flex flex-col md:flex-row items-center gap-5">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[180px] h-[180px] shrink-0">
        {arcs.map((a) => (
          <path key={a.category} d={a.d} fill={a.color} opacity={0.9} stroke="var(--card)" strokeWidth={2}>
            <title>{`${a.category}: ${a.count} (${a.pct.toFixed(1)} %)`}</title>
          </path>
        ))}
        <circle cx={c} cy={c} r={42} fill="var(--card)" />
        <text x={c} y={c - 2} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
          Gesamt
        </text>
        <text x={c} y={c + 14} textAnchor="middle" fontSize={18} fontWeight={600} fill="var(--foreground)">
          {total}
        </text>
      </svg>
      <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs w-full">
        {data.map((d) => (
          <div key={d.category} className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 truncate">
              <span className="size-2 rounded-full shrink-0" style={{ background: d.color }} />
              {d.category}
            </span>
            <span className="stat-number text-muted-foreground">{d.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>;
}
