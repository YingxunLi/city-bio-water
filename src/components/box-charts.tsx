// Boxplot statistics + custom SVG renderers (traditional + radar variant).
export type BoxStats = {
  key: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  n: number;
};

function quantile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function computeBox(values: number[], key: string): BoxStats {
  const s = [...values].sort((a, b) => a - b);
  return {
    key,
    n: s.length,
    min: s[0] ?? 0,
    q1: quantile(s, 0.25),
    median: quantile(s, 0.5),
    q3: quantile(s, 0.75),
    max: s[s.length - 1] ?? 0,
  };
}

// ---- Horizontal boxplot row ----
export function BoxRow({
  stats,
  domain,
  color,
  unit = "",
}: {
  stats: BoxStats;
  domain: [number, number];
  color: string;
  unit?: string;
}) {
  const [d0, d1] = domain;
  const span = Math.max(0.0001, d1 - d0);
  const x = (v: number) => ((v - d0) / span) * 100;
  return (
    <div className="grid grid-cols-[110px_1fr_60px] items-center gap-3">
      <div className="text-xs font-medium truncate" title={stats.key}>
        {stats.key}
      </div>
      <div className="relative h-7">
        <div className="absolute inset-x-0 top-1/2 -translate-y-px h-px bg-border" />
        {/* whiskers */}
        <div
          className="absolute top-1/2 -translate-y-px h-px"
          style={{
            left: `${x(stats.min)}%`,
            width: `${x(stats.max) - x(stats.min)}%`,
            background: color,
            opacity: 0.5,
          }}
        />
        {/* min/max ticks */}
        {[stats.min, stats.max].map((v, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 h-3 w-px"
            style={{ left: `${x(v)}%`, background: color, opacity: 0.6 }}
          />
        ))}
        {/* IQR box */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 rounded-md border"
          style={{
            left: `${x(stats.q1)}%`,
            width: `${Math.max(0.5, x(stats.q3) - x(stats.q1))}%`,
            background: `color-mix(in oklab, ${color} 22%, transparent)`,
            borderColor: color,
          }}
          title={`Q1 ${stats.q1.toFixed(2)} – Q3 ${stats.q3.toFixed(2)}`}
        />
        {/* median */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-5 w-[2px]"
          style={{ left: `${x(stats.median)}%`, background: color }}
          title={`Median ${stats.median.toFixed(2)}`}
        />
      </div>
      <div className="text-[11px] text-muted-foreground stat-number text-right">
        {stats.median.toFixed(1)}
        {unit}
      </div>
    </div>
  );
}

// ---- Radar-Boxplot (median radar + IQR shaded ring) ----
export function RadarBox({
  stats,
  domain,
  color,
  size = 320,
}: {
  stats: BoxStats[];
  domain: [number, number];
  color: string;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 30;
  const n = stats.length;
  const [d0, d1] = domain;
  const span = Math.max(0.0001, d1 - d0);
  const norm = (v: number) => Math.max(0, Math.min(1, (v - d0) / span));

  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pt = (i: number, t: number) => [
    cx + Math.cos(angle(i)) * r * t,
    cy + Math.sin(angle(i)) * r * t,
  ];

  const path = (key: keyof BoxStats) =>
    stats
      .map((s, i) => {
        const [x, y] = pt(i, norm(s[key] as number));
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  const grid = [0.25, 0.5, 0.75, 1].map((t) => (
    <polygon
      key={t}
      fill="none"
      stroke="var(--border)"
      strokeDasharray="2 3"
      points={stats
        .map((_, i) => {
          const [x, y] = pt(i, t);
          return `${x},${y}`;
        })
        .join(" ")}
    />
  ));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[420px]">
      {grid}
      {/* spokes */}
      {stats.map((_, i) => {
        const [x, y] = pt(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeWidth={1}
          />
        );
      })}
      {/* IQR band: q3 outer, q1 inner via even-odd */}
      <path
        d={`${path("q3")} ${path("q1")}`}
        fill={color}
        fillOpacity={0.18}
        fillRule="evenodd"
        stroke="none"
      />
      {/* whiskers (min..max) faint outline */}
      <path d={path("max")} fill="none" stroke={color} strokeOpacity={0.35} strokeDasharray="2 4" />
      <path d={path("min")} fill="none" stroke={color} strokeOpacity={0.25} strokeDasharray="2 4" />
      {/* median ring */}
      <path d={path("median")} fill="none" stroke={color} strokeWidth={2.2} />
      {/* median dots */}
      {stats.map((s, i) => {
        const [x, y] = pt(i, norm(s.median));
        return <circle key={i} cx={x} cy={y} r={3.5} fill={color} />;
      })}
      {/* labels */}
      {stats.map((s, i) => {
        const [x, y] = pt(i, 1.14);
        return (
          <text
            key={s.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fill="var(--muted-foreground)"
          >
            {s.key}
          </text>
        );
      })}
    </svg>
  );
}
