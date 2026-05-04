import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filter-context";
import { de } from "@/lib/i18n";
import { FilterBar } from "@/components/filter-bar";
import { GeoMap, type MapPoint } from "@/components/geo-map";
import { SectionHeader, StatCard, PanelCard, ViewToggle } from "@/components/ui-bits";
import { TimeSeries, bucketByDay } from "@/components/time-series";
import { BoxRow, RadarBox, computeBox } from "@/components/box-charts";
import { STADT_TYPES, nestColor } from "@/lib/mock-data";
import { TreePine } from "lucide-react";

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

function StadtPage() {
  const { data, range } = useFilters();
  const [mapMode, setMapMode] = useState<"points" | "heat">("points");
  const [boxMode, setBoxMode] = useState<"box" | "radar">("radar");
  const [typeAxis, setTypeAxis] = useState<"count" | "score">("count");

  const points: MapPoint[] = data.stadt.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    color: nestColor(p.nest),
    radius: 6,
    tooltip: `<b>NEST ${p.nest}</b> · ${p.type}`,
  }));

  const ts = bucketByDay(data.stadt, range);

  const avgNest = data.stadt.length
    ? Math.round(data.stadt.reduce((a, b) => a + b.nest, 0) / data.stadt.length)
    : 0;

  const catMetrics = useMemo(() => {
    if (data.stadt.length === 0) return [];
    return [
      { key: de.stadt.categories.shade, values: data.stadt.map((d) => d.shade) },
      { key: de.stadt.categories.drinking, values: data.stadt.map((d) => d.drinking) },
      { key: de.stadt.categories.fountains, values: data.stadt.map((d) => d.fountains) },
      { key: de.stadt.categories.biodiversity, values: data.stadt.map((d) => d.biodiversity) },
      { key: de.stadt.categories.green, values: data.stadt.map((d) => d.greenCare) },
    ];
  }, [data.stadt]);

  const byType = useMemo(() => {
    return STADT_TYPES.map((t) => {
      const subset = data.stadt.filter((p) => p.type === t);
      const avg = subset.length
        ? subset.reduce((a, b) => a + b.nest, 0) / subset.length
        : 0;
      return { type: t, count: subset.length, score: Math.round(avg) };
    });
  }, [data.stadt]);

  const maxCount = Math.max(1, ...byType.map((b) => b.count));
  const maxScore = 100;

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Greenspace Hack"
        accent={STADT}
        title={de.stadt.title}
        subtitle={de.stadt.subtitle}
        right={
          <div
            className="hidden md:flex size-12 rounded-2xl items-center justify-center"
            style={{ background: "var(--stadt-soft)" }}
          >
            <TreePine className="size-5" style={{ color: STADT }} />
          </div>
        }
      />
      <FilterBar />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={de.common.observations} value={data.stadt.length} accent={STADT} />
        <StatCard label={`Ø ${de.stadt.nest}`} value={avgNest || "—"} accent={STADT} />
        <StatCard
          label="Beste Fläche"
          value={data.stadt.length ? Math.max(...data.stadt.map((d) => d.nest)) : "—"}
          accent={STADT}
        />
        <StatCard
          label="Flächentypen"
          value={new Set(data.stadt.map((d) => d.type)).size}
          accent={STADT}
        />
      </div>

      <PanelCard
        title={de.common.map}
        accent={STADT}
        hint="Farbe = NEST Score"
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
        <GeoMap points={points} heat={mapMode === "heat"} baseColor={STADT} height={440} />
        <NestLegend />
      </PanelCard>

      <PanelCard
        title="Score-Kategorien"
        accent={STADT}
        hint={
          boxMode === "radar"
            ? "Median + IQR-Ring je Kategorie."
            : "Boxplot je Kategorie (0–100)."
        }
        right={
          <ViewToggle
            value={boxMode}
            onChange={setBoxMode}
            options={[
              { v: "radar", label: de.common.radarView },
              { v: "box", label: de.common.boxplotView },
            ]}
          />
        }
      >
        {catMetrics.length === 0 ? (
          <Empty />
        ) : boxMode === "radar" ? (
          <div className="flex justify-center">
            <RadarBox
              stats={catMetrics.map((m) => computeBox(m.values, m.key))}
              domain={[0, 100]}
              color={STADT}
              size={360}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {catMetrics.map((m) => (
              <BoxRow
                key={m.key}
                stats={computeBox(m.values, m.key)}
                domain={[0, 100]}
                color={STADT}
              />
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={de.stadt.sources}
        accent={STADT}
        hint="Anzahl gemeldeter Flächen je Typ und durchschnittlicher Score"
        right={
          <ViewToggle
            value={typeAxis}
            onChange={setTypeAxis}
            options={[
              { v: "count", label: de.stadt.count },
              { v: "score", label: de.stadt.score },
            ]}
          />
        }
      >
        <div className="space-y-2.5">
          {byType.map((b) => {
            const v = typeAxis === "count" ? b.count : b.score;
            const max = typeAxis === "count" ? maxCount : maxScore;
            const pct = (v / max) * 100;
            return (
              <div
                key={b.type}
                className="grid grid-cols-[180px_1fr_60px] items-center gap-3 group"
                title={`${b.type}: ${b.count} Flächen, Ø Score ${b.score}`}
              >
                <div className="text-xs truncate">{b.type}</div>
                <div className="h-6 bg-muted rounded-md overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{
                      width: `${pct}%`,
                      background: `color-mix(in oklab, ${STADT} ${
                        typeAxis === "score" ? 30 + (b.score / 100) * 60 : 60
                      }%, white)`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-muted-foreground stat-number text-right">
                  {typeAxis === "count" ? b.count : b.score || "—"}
                </div>
              </div>
            );
          })}
        </div>
      </PanelCard>

      <PanelCard title="Beobachtungen pro Zeit" accent={STADT}>
        <TimeSeries data={ts} color={STADT} />
      </PanelCard>
    </div>
  );
}

function NestLegend() {
  const stops = [10, 30, 50, 70, 90];
  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
        NEST Score
      </div>
      <div className="flex h-3 rounded-full overflow-hidden border border-border">
        {Array.from({ length: 40 }, (_, i) => {
          const v = (i / 39) * 100;
          return <div key={i} className="flex-1" style={{ background: nestColor(v) }} />;
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 stat-number">
        {stops.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="text-sm text-muted-foreground text-center py-10">
      {de.common.noData}
    </div>
  );
}
