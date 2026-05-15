import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Scatter,
  Line,
} from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { ViewToggle } from "@/components/ui-bits";
import { de } from "@/lib/i18n";

export type Series = {
  key: string;
  label: string;
  unit?: string;
  /** opacity multiplier 0..1 for points (line uses 1) */
  opacity: number;
  values: { ts: number; v: number }[];
};

function median(arr: number[]) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function bucketize(values: { ts: number; v: number }[], days: number) {
  const bucketDays = days <= 30 ? 1 : days <= 90 ? 3 : days <= 365 ? 14 : 30;
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
    .map(([k, vs]) => ({ ts: k * 86400_000, m: median(vs), n: vs.length }));
}

export function MultiTime({
  series,
  color,
  rangeDays,
  height = 220,
}: {
  series: Series[];
  color: string;
  rangeDays: number;
  height?: number;
}) {
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(series.map((s) => [s.key, true])),
  );
  const [mode, setMode] = useState<"all" | "median">("all");

  // Normalize each series to 0..1 for shared y-axis
  const normalized = useMemo(() => {
    return series.map((s) => {
      const vs = s.values.map((v) => v.v);
      const min = vs.length ? Math.min(...vs) : 0;
      const max = vs.length ? Math.max(...vs) : 1;
      const span = Math.max(0.0001, max - min);
      return {
        ...s,
        min,
        max,
        span,
        points: s.values.map((p) => ({ ts: p.ts, v: p.v, n: (p.v - min) / span })),
        bucketed: bucketize(s.values, rangeDays).map((b) => ({
          ts: b.ts,
          m: b.m,
          n: (b.m - min) / span,
        })),
      };
    });
  }, [series, rangeDays]);

  const cutoff = Date.now() - rangeDays * 86400_000;
  const tMin = cutoff;
  const tMax = Date.now();

  const fmt = (t: number) =>
    new Date(t).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {series.map((s) => (
            <label
              key={s.key}
              className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
            >
              <Checkbox
                checked={active[s.key]}
                onCheckedChange={(v) =>
                  setActive((p) => ({ ...p, [s.key]: !!v }))
                }
              />
              <span
                className="size-2 rounded-full"
                style={{ background: color, opacity: s.opacity }}
              />
              {s.label}
            </label>
          ))}
        </div>
        <ViewToggle
          value={mode}
          onChange={setMode}
          options={[
            { v: "all", label: de.common.points },
            { v: "median", label: de.common.median },
          ]}
        />
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            type="number"
            dataKey="ts"
            domain={[tMin, tMax]}
            tickFormatter={fmt}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            type="number"
            dataKey="n"
            domain={[0, 1]}
            tick={false}
            axisLine={false}
            tickLine={false}
            width={32}
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
            labelFormatter={(l: number) => fmt(l)}
            formatter={(_v: number, name: string, p: any) => {
              const real = p?.payload?.v ?? p?.payload?.m;
              const s = series.find((x) => x.label === name || x.key === name);
              return [
                `${typeof real === "number" ? real.toFixed(2) : real}${s?.unit ? " " + s.unit : ""}`,
                s?.label ?? name,
              ];
            }}
          />
          {mode === "all" &&
            normalized
              .filter((s) => active[s.key])
              .map((s) => (
                <Scatter
                  key={s.key}
                  name={s.label}
                  data={s.points}
                  fill={color}
                  fillOpacity={s.opacity * 0.8}
                  stroke="none"
                  shape="circle"
                  legendType="none"
                />
              ))}
          {mode === "median" &&
            normalized
              .filter((s) => active[s.key])
              .map((s) => (
                <Line
                  key={s.key}
                  name={s.label}
                  data={s.bucketed}
                  type="monotone"
                  dataKey="n"
                  stroke={color}
                  strokeOpacity={s.opacity}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: color, fillOpacity: s.opacity, stroke: "none" }}
                  isAnimationActive={false}
                />
              ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
