import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { MapDashboard, PanelTabs, PanelBody, FloatingCard } from "@/components/map-dashboard";
import { ViewToggle } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { BIO_CATEGORIES } from "@/lib/mock-data";
import { Download } from "lucide-react";

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(","), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

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
  Amphibia: "#6FBF73",
  Actinopterygii: "#1E7F8C",
  Insecta: "#F0A08C",
  Arachnida: "#7B4F3A",
  Mollusca: "#8E7CC3",
  Fungi: "#C68B59",
  Mammalia: "#243285",
  Animalia: "#9AA0A6",
};

type Tab = "stats" | "kategorien" | "arten";

function BioPage() {
  const { data, range, bioStatus } = useFilters();
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [tab, setTab] = useState<Tab>("stats");

  const points: MapPoint[] = data.bio.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    color: CAT_COLORS[p.category] ?? BIO,
    radius: p.threatened ? 7 : p.invasive ? 6 : 4,
    tooltip: `
      <div>
        ${p.photo ? `<img src="${p.photo}" alt="" style="width:100%;max-width:140px;border-radius:6px;margin-bottom:4px" />` : ""}
        <div><b><i>${p.species}</i></b></div>
        ${p.commonName ? `<div>${p.commonName}</div>` : ""}
        <div>${p.category}${p.invasive ? " · invasiv" : ""}${p.threatened ? " · bedroht" : ""}</div>
        ${p.place ? `<div>${p.place}</div>` : ""}
        <div>Ort: ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</div>
        <div>Zeit: ${new Date(p.date).toLocaleDateString('de-DE')}</div>
      </div>
    `,
  }));

  const ts = bucketByDay(data.bio, range);
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
      map={<GeoMap points={points} heat={mapMode === "heat"} baseColor={BIO} flush />}
      overlay={<FilterBar compact />}
      mapControls={
        <FloatingCard className="!p-1">
          <ViewToggle
            value={mapMode}
            onChange={setMapMode}
            options={[
              { v: "points", label: "Arten" },
              { v: "heat", label: de.common.heatmap },
            ]}
          />
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
              <button
                type="button"
                title="Als CSV herunterladen"
                disabled={!data.bio.length}
                onClick={() => downloadCsv(
                  `inaturalist_${new Date().toISOString().slice(0,10)}.csv`,
                  data.bio.map(b => ({
                    id: b.id, species: b.species, common_name: b.commonName ?? "",
                    category: b.category, invasive: b.invasive, threatened: b.threatened,
                    native: b.native ?? "", quality: b.quality ?? "",
                    lat: b.lat, lon: b.lon, place: b.place ?? "", observed_on: b.date,
                    observer: b.observer ?? "",
                  }))
                )}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs disabled:opacity-40 disabled:pointer-events-none"
              >
                <Download className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Daten exportieren</span>
              </button>
            }
          />
          {bioStatus.loading && (
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground">{de.common.loading}</div>
          )}
          {bioStatus.error && (
            <div className="px-3 py-1.5 text-[11px] text-destructive">Fehler beim Laden der iNaturalist-Daten.</div>
          )}
          <PanelBody>
            {tab === "stats" && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-4">
                <div className="grid grid-cols-2 gap-3 content-start">
                  <Stat label={de.common.observations} value={data.bio.length} accent={BIO} hint="Gesamtzahl" />
                  <Stat label={de.bio.species} value={speciesSet.size} accent={BIO} hint="Unique" />
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
                <div className="rounded-2xl border border-border bg-card p-3 min-h-[180px]">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {de.common.observations} · {de.common.overTime}
                  </div>
                  <TimeSeries data={ts} color={BIO} height={160} />
                </div>
              </div>
            )}

            {tab === "kategorien" && (
              data.bio.length === 0 ? <Empty /> : (
                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start">
                  <Donut data={byCategory} />
                  <div className="space-y-2">
                    {byCategory.map((b) => (
                      <div
                        key={b.category}
                        className="grid grid-cols-[110px_1fr_70px] items-center gap-3"
                        title={`${b.category}: ${b.count} (${b.pct.toFixed(1)} %)`}
                      >
                        <div className="text-xs flex items-center gap-1.5">
                          <span className="size-2 rounded-full shrink-0" style={{ background: b.color }} />
                          {b.category}
                        </div>
                        <div className="h-4 bg-muted rounded-md overflow-hidden">
                          <div className="h-full rounded-md" style={{ width: `${(b.count / maxCount) * 100}%`, background: b.color, opacity: 0.9 }} />
                        </div>
                        <div className="text-[11px] text-muted-foreground stat-number text-right">
                          {b.count} · {b.pct.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {tab === "arten" && (
              topSpecies.length === 0 ? <Empty /> :
              <ul className="divide-y divide-border">
                {topSpecies.map((s, i) => (
                  <li key={s.species} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[11px] tabular-nums text-muted-foreground w-5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="size-2 rounded-full shrink-0" style={{ background: CAT_COLORS[s.category] ?? BIO }} />
                      <span className="font-medium italic truncate text-sm">{s.species}</span>
                      <span className="text-[11px] text-muted-foreground hidden md:inline">{s.category}</span>
                    </div>
                    <span className="text-sm stat-number">{s.n}</span>
                  </li>
                ))}
              </ul>
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

function CatLegendVertical() {
  return (
    <div
      className="rounded-2xl border border-border p-2 flex flex-col gap-1"
      style={{
        background: "color-mix(in oklab, white 92%, transparent)",
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

function Donut({ data }: { data: { category: string; count: number; pct: number; color: string }[] }) {
  const size = 200;
  const r = 82;
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
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[200px] h-[200px]">
        {arcs.map((a) => (
          <path key={a.category} d={a.d} fill={a.color} opacity={0.9} stroke="var(--card)" strokeWidth={2}>
            <title>{`${a.category}: ${a.count} (${a.pct.toFixed(1)} %)`}</title>
          </path>
        ))}
        <circle cx={c} cy={c} r={46} fill="var(--card)" />
        <text x={c} y={c - 2} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">Gesamt</text>
        <text x={c} y={c + 16} textAnchor="middle" fontSize={20} fontWeight={600} fill="var(--foreground)">{total}</text>
      </svg>
    </div>
  );
}

function Empty() {
  return <div className="text-sm text-muted-foreground text-center py-8">{de.common.noData}</div>;
}
