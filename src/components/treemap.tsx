// Lightweight squarified treemap (no d3 dependency).
// Renders rectangles whose AREA ∝ value, with color/opacity bound to a score.
import { useMemo } from "react";

export type TreeItem = { key: string; value: number; score: number; label?: string };

type Rect = { x: number; y: number; w: number; h: number; item: TreeItem };

function worst(row: TreeItem[], w: number, sum: number) {
  const rMax = Math.max(...row.map((r) => r.value));
  const rMin = Math.min(...row.map((r) => r.value));
  const s2 = sum * sum;
  const w2 = w * w;
  return Math.max((w2 * rMax) / s2, s2 / (w2 * rMin));
}

function layoutRow(row: TreeItem[], rect: { x: number; y: number; w: number; h: number }, total: number, horizontal: boolean): { rects: Rect[]; remaining: typeof rect } {
  const rowSum = row.reduce((a, b) => a + b.value, 0);
  const ratio = rowSum / total;
  const rects: Rect[] = [];
  if (horizontal) {
    const rowH = rect.h * ratio;
    let x = rect.x;
    for (const it of row) {
      const w = (rect.w * it.value) / rowSum;
      rects.push({ x, y: rect.y, w, h: rowH, item: it });
      x += w;
    }
    return { rects, remaining: { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH } };
  } else {
    const rowW = rect.w * ratio;
    let y = rect.y;
    for (const it of row) {
      const h = (rect.h * it.value) / rowSum;
      rects.push({ x: rect.x, y, w: rowW, h, item: it });
      y += h;
    }
    return { rects, remaining: { x: rect.x + rowW, y: rect.y, w: rect.w - rowW, h: rect.h } };
  }
}

function squarify(items: TreeItem[], width: number, height: number): Rect[] {
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (!sorted.length) return [];
  const totalArea = width * height;
  const totalValue = sorted.reduce((a, b) => a + b.value, 0);
  const scale = totalArea / totalValue;
  const scaled = sorted.map((i) => ({ ...i, value: i.value * scale }));

  let rect = { x: 0, y: 0, w: width, h: height };
  let total = totalArea;
  const out: Rect[] = [];
  let row: TreeItem[] = [];
  let i = 0;
  while (i < scaled.length) {
    const horizontal = rect.w >= rect.h;
    const w = horizontal ? rect.w : rect.h;
    const next = scaled[i];
    const test = [...row, next];
    if (row.length === 0 || worst(test, w, test.reduce((a, b) => a + b.value, 0)) <= worst(row, w, row.reduce((a, b) => a + b.value, 0))) {
      row = test;
      i++;
    } else {
      const { rects, remaining } = layoutRow(row, rect, total, horizontal);
      out.push(...rects);
      total -= row.reduce((a, b) => a + b.value, 0);
      rect = remaining;
      row = [];
    }
  }
  if (row.length) {
    const horizontal = rect.w >= rect.h;
    const { rects } = layoutRow(row, rect, total, horizontal);
    out.push(...rects);
  }
  return out;
}

export function Treemap({
  items,
  width = 600,
  height = 220,
  color,
}: {
  items: TreeItem[];
  width?: number;
  height?: number;
  color: string;
}) {
  const rects = useMemo(() => squarify(items, width, height), [items, width, height]);
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none" style={{ height }}>
        {rects.map((r) => {
          const op = 0.18 + (Math.max(0, Math.min(100, r.item.score)) / 100) * 0.7;
          return (
            <g key={r.item.key}>
              <rect
                x={r.x + 1}
                y={r.y + 1}
                width={Math.max(0, r.w - 2)}
                height={Math.max(0, r.h - 2)}
                rx={6}
                ry={6}
                fill={color}
                fillOpacity={op}
                stroke="white"
                strokeWidth={1}
              >
                <title>{`${r.item.label ?? r.item.key}: ${r.item.value} · Ø ${r.item.score}`}</title>
              </rect>
              {r.w > 70 && r.h > 28 && (
                <>
                  <text
                    x={r.x + 8}
                    y={r.y + 16}
                    fontSize={11}
                    fill="var(--foreground)"
                    style={{ pointerEvents: "none" }}
                  >
                    {(r.item.label ?? r.item.key).slice(0, Math.max(4, Math.floor(r.w / 7)))}
                  </text>
                  <text
                    x={r.x + 8}
                    y={r.y + 30}
                    fontSize={10}
                    fill="var(--muted-foreground)"
                    style={{ pointerEvents: "none" }}
                  >
                    {r.item.value} · {r.item.score}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
