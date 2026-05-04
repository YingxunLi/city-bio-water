import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Dated = { date: string };

export function bucketByDay<T extends Dated>(items: T[], days: number) {
  const cutoff = Date.now() - days * 86400_000;
  // bucket size: keep ~30-60 buckets
  const bucketDays = days <= 30 ? 1 : days <= 90 ? 3 : days <= 365 ? 14 : 30;
  const buckets = new Map<number, number>();
  for (const it of items) {
    const t = new Date(it.date).getTime();
    if (t < cutoff) continue;
    const day = Math.floor(t / 86400_000);
    const key = Math.floor(day / bucketDays) * bucketDays;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([k, v]) => ({
      ts: k * 86400_000,
      label: new Date(k * 86400_000).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "short",
      }),
      count: v,
    }));
}

export function TimeSeries({
  data,
  color,
  height = 220,
  yLabel = "Beobachtungen",
}: {
  data: { label: string; count: number }[];
  color: string;
  height?: number;
  yLabel?: string;
}) {
  const id = useMemo(() => `g_${Math.random().toString(36).slice(2)}`, []);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
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
          cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-float)",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--muted-foreground)", fontSize: 11 }}
          formatter={(v: number) => [v, yLabel]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
