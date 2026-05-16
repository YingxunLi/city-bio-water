// Lightweight squarified treemap rendering rectangles via absolute-positioned
// HTML divs so text is never stretched. Rect area ∝ value; fill opacity ∝ score.
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

function layoutRow(
  row: TreeItem[],
  rect: { x: number; y: number; w: number; h: number },
  total: number,
  horizontal: boolean,
): { rects: Rect[]; remaining: typeof rect } {
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
    if (
      row.length === 0 ||
      worst(test, w, test.reduce((a, b) => a + b.value, 0)) <=
        worst(row, w, row.reduce((a, b) => a + b.value, 0))
    ) {
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
  height = 220,
  color,
  unit = "",
}: {
  items: TreeItem[];
  height?: number;
  color: string;
  unit?: string;
}) {
  // Compute layout in a 1000-unit virtual coordinate space, then position via %.
  const W = 1000;
  const H = 1000;
  const rects = useMemo(() => squarify(items, W, H), [items]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ height }}>
      {rects.map((r) => {
        const op = 0.18 + (Math.max(0, Math.min(100, r.item.score)) / 100) * 0.72;
        const label = r.item.label ?? r.item.key;
        const showText = r.w > 90 && r.h > 36;
        return (
          <div
            key={r.item.key}
            className="absolute rounded-md border border-white overflow-hidden flex flex-col justify-end p-1.5"
            style={{
              left: `${(r.x / W) * 100}%`,
              top: `${(r.y / H) * 100}%`,
              width: `${(r.w / W) * 100}%`,
              height: `${(r.h / H) * 100}%`,
              background: color,
              opacity: 1,
              backgroundColor: color,
              // Apply opacity via color-mix to keep child text readable.
              backgroundImage: `linear-gradient(${color}, ${color})`,
              backgroundBlendMode: "normal",
              filter: "none",
            }}
            title={`${label}\nAnzahl: ${r.item.value}\nScore: ${r.item.score}${unit}`}
          >
            <div
              className="absolute inset-0"
              style={{ background: color, opacity: op }}
            />
            {showText && (
              <div className="relative z-10 text-[11px] leading-tight text-foreground/90">
                <div className="font-medium truncate" title={label}>{label}</div>
                <div className="text-[10px] text-foreground/70 stat-number">
                  Anzahl {r.item.value} · Score {r.item.score}{unit}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
