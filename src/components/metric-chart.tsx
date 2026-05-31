import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";
import { ViewToggle } from "@/components/ui-bits";
import { de } from "@/lib/i18n";

export type Point = {
  ts: number;
  v: number;
  /** Optional context for tooltip (lat/lon, etc.) */
  meta?: { lat?: number; lon?: number; [k: string]: any };
};

function median(arr: number[]) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function quantile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function bucketStats(values: Point[], days: number) {
  const bucketDays = days <= 7 ? 1 : days <= 30 ? 2 : days <= 90 ? 5 : days <= 365 ? 14 : 30;
  const map = new Map<number, number[]>();
  for (const p of values) {
    const day = Math.floor(p.ts / 86400_000);
    const k = Math.floor(day / bucketDays) * bucketDays;
    const arr = map.get(k);
    if (arr) arr.push(p.v);
    else map.set(k, [p.v]);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([k, vs]) => {
      const sorted = [...vs].sort((a, b) => a - b);
      return {
        ts: k * 86400_000,
        m: median(sorted),
        q1: quantile(sorted, 0.25),
        q3: quantile(sorted, 0.75),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        n: sorted.length,
      };
    });
}

const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });

const fmtFull = (t: number) =>
  new Date(t).toLocaleString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export type MetricMode = "points" | "line" | "box";

export function MetricChart({
  values,
  color,
  rangeDays,
  unit = "",
  label,
  domain,
  height = 200,
  mode: modeProp,
  onModeChange,
}: {
  values: Point[];
  color: string;
  rangeDays: number;
  unit?: string;
  label: string;
  domain?: [number, number];
  height?: number;
  mode?: MetricMode;
  onModeChange?: (m: MetricMode) => void;
}) {
  const [internalMode, setInternalMode] = useState<MetricMode>("points");
  const mode = modeProp ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;

  const points = values;
  const buckets = useMemo(() => bucketStats(values, rangeDays), [values, rangeDays]);

  const tMax = Date.now();
  const tMin = tMax - rangeDays * 86400_000;
  const yMin = domain ? domain[0] : Math.min(...values.map((p) => p.v), 0);
  const yMax = domain ? domain[1] : Math.max(...values.map((p) => p.v), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: color }} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <ViewToggle
          value={mode}
          onChange={setMode}
          options={[
            { v: "points" as const, label: de.common.points },
            { v: "line" as const, label: de.common.median },
            { v: "box" as const, label: de.common.boxplotView },
          ]}
        />
      </div>

      <div style={{ width: "100%", height }}>
        {mode === "box" ? (
          <BoxSvg
            buckets={buckets}
            color={color}
            yMin={yMin}
            yMax={yMax}
            tMin={tMin}
            tMax={tMax}
            unit={unit}
            height={height}
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 6, right: 12, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
              <XAxis
                type="number"
                dataKey="ts"
                domain={[tMin, tMax]}
                tickFormatter={fmtDate}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                type="number"
                dataKey="v"
                domain={[yMin, yMax]}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-float)",
                  fontSize: 12,
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  const value = mode === "points" ? p.v : mode === "line" ? p.m : p.v;
                  const date = p.ts ? fmtFull(p.ts) : "";
                  return (
                    <div className="rounded-xl border border-border bg-popover p-2.5 text-[11px] shadow-md">
                      <div className="font-medium stat-number text-foreground">
                        {value.toFixed(2)}{unit}
                      </div>
                      <div className="text-muted-foreground">{date}</div>
                      {p.meta?.lat != null && (
                        <div className="text-muted-foreground stat-number">
                          lat={p.meta.lat.toFixed(5)} · lon={p.meta.lon.toFixed(5)}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              {mode === "points" && (
                <Line
                  data={points}
                  type="linear"
                  dataKey="v"
                  stroke="transparent"
                  dot={{ r: 3.5, fill: color, stroke: "none" }}
                  activeDot={{ r: 5, fill: color, stroke: "var(--background)", strokeWidth: 1.5 }}
                  isAnimationActive={false}
                />
              )}
              {mode === "line" && (
                <Line
                  data={buckets}
                  type="monotone"
                  dataKey="m"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: color, stroke: "none" }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/** Pure-SVG horizontal time-bucketed boxplot with hover tooltip. */
function BoxSvg({
  buckets, color, yMin, yMax, tMin, tMax, unit, height,
}: {
  buckets: { ts: number; m: number; q1: number; q3: number; min: number; max: number; n: number }[];
  color: string; yMin: number; yMax: number; tMin: number; tMax: number; unit: string; height: number;
}) {
  const W = 800;
  const H = height;
  const padL = 32, padR = 12, padT = 8, padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const xOf = (t: number) => padL + ((t - tMin) / Math.max(1, tMax - tMin)) * plotW;
  const yOf = (v: number) => padT + (1 - (v - yMin) / Math.max(0.0001, yMax - yMin)) * plotH;
  const boxW = Math.max(6, Math.min(22, plotW / Math.max(1, buckets.length) * 0.6));

  // y ticks (5)
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + (i / 4) * (yMax - yMin));
  // x ticks (5)
  const xTicks = Array.from({ length: 5 }, (_, i) => tMin + (i / 4) * (tMax - tMin));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ height }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={yOf(t)} y2={yOf(t)} stroke="var(--border)" strokeDasharray="2 4" />
          <text x={padL - 4} y={yOf(t) + 3} textAnchor="end" fontSize={9} fill="var(--muted-foreground)">{t.toFixed(1)}</text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <text key={i} x={xOf(t)} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)">{fmtDate(t)}</text>
      ))}
      {buckets.map((b, i) => {
        const x = xOf(b.ts);
        const yMaxPx = yOf(b.max);
        const yMinPx = yOf(b.min);
        const yQ3 = yOf(b.q3);
        const yQ1 = yOf(b.q1);
        const yMed = yOf(b.m);
        return (
          <g key={i}>
            <title>{`${fmtDate(b.ts)} · n=${b.n}\nMax ${b.max.toFixed(2)}${unit}\nQ3 ${b.q3.toFixed(2)}${unit}\nMedian ${b.m.toFixed(2)}${unit}\nQ1 ${b.q1.toFixed(2)}${unit}\nMin ${b.min.toFixed(2)}${unit}`}</title>
            <line x1={x} x2={x} y1={yMinPx} y2={yMaxPx} stroke={color} strokeOpacity={0.5} />
            <line x1={x - boxW / 3} x2={x + boxW / 3} y1={yMinPx} y2={yMinPx} stroke={color} strokeOpacity={0.6} />
            <line x1={x - boxW / 3} x2={x + boxW / 3} y1={yMaxPx} y2={yMaxPx} stroke={color} strokeOpacity={0.6} />
            <rect
              x={x - boxW / 2}
              y={Math.min(yQ1, yQ3)}
              width={boxW}
              height={Math.max(2, Math.abs(yQ3 - yQ1))}
              fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1} rx={2}
            />
            <line x1={x - boxW / 2} x2={x + boxW / 2} y1={yMed} y2={yMed} stroke={color} strokeWidth={1.8} />
          </g>
        );
      })}
    </svg>
  );
}