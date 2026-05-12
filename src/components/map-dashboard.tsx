import type { ReactNode } from "react";

/**
 * Layout: full-bleed map with floating overlays and a docked bottom panel.
 * - Desktop: single screen, no page scroll. Bottom panel is internally scrollable.
 * - Mobile: stacks. Map on top (~58vh), then content scrolls naturally below.
 */
export function MapDashboard({
  map,
  overlay,
  mapControls,
  mapLegend,
  panel,
}: {
  map: ReactNode;
  overlay?: ReactNode;
  mapControls?: ReactNode;
  mapLegend?: ReactNode;
  panel: ReactNode;
}) {
  return (
    <>
      {/* Mobile (scrollable) */}
      <div className="md:hidden">
        <div className="relative h-[58vh] min-h-[360px]">
          <div className="absolute inset-0">{map}</div>
          {overlay && <div className="absolute top-3 left-3 right-3 z-20">{overlay}</div>}
          {mapLegend && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2 z-20">{mapLegend}</div>
          )}
          {mapControls && <div className="absolute bottom-3 left-3 z-20">{mapControls}</div>}
        </div>
        <div className="px-4 py-5 space-y-4 pb-12">{panel}</div>
      </div>

      {/* Desktop (single screen) */}
      <div className="hidden md:block relative h-full">
        <div className="absolute inset-0">{map}</div>
        {overlay && <div className="absolute top-5 left-5 z-20 w-[340px]">{overlay}</div>}
        {mapLegend && (
          <div className="absolute right-5 top-1/2 -translate-y-[60%] z-20">{mapLegend}</div>
        )}
        {mapControls && (
          <div className="absolute z-20 left-5 bottom-[calc(38vh+24px)]">{mapControls}</div>
        )}
        <div
          className="absolute bottom-4 left-4 right-4 z-20 rounded-3xl border border-border overflow-hidden"
          style={{
            height: "36vh",
            minHeight: 280,
            background: "color-mix(in oklab, white 92%, transparent)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
            boxShadow: "var(--shadow-float)",
          }}
        >
          <div className="h-full overflow-y-auto p-5">{panel}</div>
        </div>
      </div>
    </>
  );
}

/** Tab strip for the docked bottom panel. */
export function PanelTabs<T extends string>({
  value,
  onChange,
  options,
  right,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 sticky top-0 -mt-1 pt-1 bg-transparent">
      <div className="flex items-center gap-1 overflow-x-auto">
        {options.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              onClick={() => onChange(o.v)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                active
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {right}
    </div>
  );
}

/** Glass card for floating overlays on top of the map. */
export function FloatingCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border p-3 ${className}`}
      style={{
        background: "color-mix(in oklab, white 88%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
      }}
    >
      {children}
    </div>
  );
}
