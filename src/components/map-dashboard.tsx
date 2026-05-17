import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Layout: full-bleed map with floating overlays and a docked bottom panel.
 *
 * Desktop slot positions:
 *   - overlay   : top-left  (filters)
 *   - mapLegend : right side, vertically aligned above the zoom controls
 *   - zoom      : bottom-right (inside <map>, above docked panel)
 *   - panel     : docked bottom, scrollable internally
 *
 * Mobile:
 *   - header (in AppShell) is sticky at top
 *   - map sits below the header and stays fixed in the background
 *   - city/filter overlay is centered, collapsible
 *   - legend is on the right edge, near the bottom-sheet
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
      {/* ---------- Mobile ---------- */}
      <div className="md:hidden">
        {/* Fixed background map */}
        <div className="fixed inset-x-0 top-14 bottom-0 z-0">{map}</div>

        {/* Centered, collapsible city/filter overlay (mobile): render raw content — no extra card */}
        {overlay && (
          <div className="fixed top-[60px] left-0 right-0 z-[700] flex justify-center px-4 pointer-events-none">
            <div className="w-full max-w-[420px] pointer-events-auto">
              <MobileCollapsible>{overlay}</MobileCollapsible>
            </div>
          </div>
        )}

        {/* Heatmap toggle: pinned just above the bottom sheet */}
        {mapControls && (
          <div className="fixed left-4 z-[500]" style={{ bottom: "calc(45vh + 16px)" }}>
            {mapControls}
          </div>
        )}

        {/* Legend: right edge, just above the bottom sheet */}
        {mapLegend && (
          <div className="fixed right-3 z-[500]" style={{ bottom: "calc(45vh + 16px)" }}>
            {mapLegend}
          </div>
        )}

        {/* Spacer pushes the bottom sheet below the visible map area */}
        <div style={{ height: "calc(100vh - 14px - 45vh)" }} aria-hidden />

        {/* Bottom sheet — scrolls above the fixed map */}
        <div
          className="relative z-[700] rounded-t-3xl border-t border-border bg-card px-4 py-5 space-y-4 pb-12 min-h-[55vh]"
          style={{ boxShadow: "0 -8px 32px rgba(0,0,0,0.08)" }}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-border -mt-2 mb-3" />
          {panel}
        </div>
      </div>

      {/* ---------- Desktop ---------- */}
      <div className="hidden md:block relative h-full isolate">
        <div className="absolute inset-0 z-0">{map}</div>
        {overlay && (
          <div className="absolute top-5 left-5 z-[500] w-[340px]">
            <FloatingCard>{overlay}</FloatingCard>
          </div>
        )}
        {mapControls && (
          <div className="absolute z-[500] left-5" style={{ bottom: "calc(38vh + 24px)" }}>
            {mapControls}
          </div>
        )}
        {mapLegend && (
          <div className="absolute top-5 right-5 z-[500]">
            {mapLegend}
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

function MobileCollapsible({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl border border-border overflow-hidden"
      style={{
        background: "color-mix(in oklab, white 94%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-foreground"
      >
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Filter
        </span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border">{children}</div>}
    </div>
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
        background: "color-mix(in oklab, white 96%, transparent)",
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
              type="button"
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

export function PanelBody({ children }: { children: ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
}

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
        background: "color-mix(in oklab, white 92%, transparent)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        boxShadow: "var(--shadow-float)",
      }}
    >
      {children}
    </div>
  );
}
