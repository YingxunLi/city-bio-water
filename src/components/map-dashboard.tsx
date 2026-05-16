import type { ReactNode } from "react";

/**
 * Layout: full-bleed map with floating overlays and a docked bottom panel.
 *
 * Slot positions (desktop):
 *   - overlay    : top-left  (filters)
 *   - mapLegend  : right side, vertically centered between header and panel
 *   - zoom ctrls : top-right (inside <map> component itself)
 *   - panel      : docked bottom, scrollable internally
 *
 * Mobile:
 *   - header (in AppShell) is sticky at top
 *   - the map sits below the header and stays fixed in the background
 *   - panel content scrolls above the map as a sheet
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
      {/* Mobile: map is fixed background, content scrolls over it */}
      <div className="md:hidden relative">
        <div className="fixed inset-x-0 top-14 h-[55vh] z-0">
          <div className="absolute inset-0">{map}</div>
          {overlay && (
            <div className="absolute top-3 left-3 right-16 z-[500]">{overlay}</div>
          )}
          {mapLegend && (
            <div className="absolute bottom-3 right-3 z-[500]">{mapLegend}</div>
          )}
          {mapControls && (
            <div className="absolute bottom-3 left-3 z-[500]">{mapControls}</div>
          )}
        </div>
        {/* spacer to push sheet below map area */}
        <div style={{ height: "calc(55vh - 24px)" }} />
        <div
          className="relative z-[700] rounded-t-3xl border-t border-border bg-card px-4 py-5 space-y-4 pb-12"
          style={{ boxShadow: "0 -8px 32px rgba(0,0,0,0.08)" }}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-border -mt-2 mb-3" />
          {panel}
        </div>
      </div>

      {/* Desktop (single screen) */}
      <div className="hidden md:block relative h-full isolate">
        <div className="absolute inset-0 z-0">{map}</div>
        {overlay && <div className="absolute top-5 left-5 z-[500] w-[340px]">{overlay}</div>}
        {mapLegend && (
          <div className="absolute right-5 z-[500]" style={{ top: "calc(50% - 19vh)", transform: "translateY(-50%)" }}>
            {mapLegend}
          </div>
        )}
        {mapControls && (
          <div className="absolute z-[500] left-5 bottom-[calc(38vh + 32px)]" style={{ bottom: "calc(38vh + 32px)" }}>
            {mapControls}
          </div>
        )}
        <div
          className="absolute bottom-4 left-4 right-4 z-[700] rounded-3xl border border-border overflow-hidden"
          style={{
            height: "38vh",
            minHeight: 300,
            background: "color-mix(in oklab, white 94%, transparent)",
            backdropFilter: "saturate(180%) blur(20px)",
            WebkitBackdropFilter: "saturate(180%) blur(20px)",
            boxShadow: "var(--shadow-float)",
          }}
        >
          <div className="h-full overflow-y-auto">{panel}</div>
        </div>
      </div>
    </>
  );
}

/**
 * Tab strip for the docked bottom panel. Sticky at top of the scroll area with
 * a solid background + high z-index so panel content scrolls underneath.
 */
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
    <div
      className="sticky top-0 z-[20] flex items-center justify-between gap-3 px-5 pt-4 pb-3"
      style={{
        background: "color-mix(in oklab, white 94%, transparent)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
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
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/**
 * Wrap the panel body so it has padding while tabs stay flush at the top.
 */
export function PanelBody({ children }: { children: ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
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
