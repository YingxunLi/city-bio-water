import { Link, useRouterState } from "@tanstack/react-router";
import { de } from "@/lib/i18n";
import { Droplets, TreePine, Bird, LayoutDashboard } from "lucide-react";
import { useFilters } from "@/lib/filter-context";

const items = [
  { to: "/", label: de.nav.home, icon: LayoutDashboard, accent: "var(--foreground)" },
  { to: "/wasser", label: de.nav.wasser, icon: Droplets, accent: "var(--wasser)" },
  { to: "/stadt", label: de.nav.stadt, icon: TreePine, accent: "var(--stadt)" },
  { to: "/biodiversitaet", label: de.nav.bio, icon: Bird, accent: "var(--bio)" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { lastUpdated } = useFilters();

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 border-r border-border bg-background/60 backdrop-blur-xl sticky top-0 h-screen flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-gradient-to-br from-[var(--wasser)] via-[var(--bio)] to-[var(--stadt)]" />
            <div>
              <div className="font-semibold tracking-tight leading-none">{de.appName}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{de.tagline}</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {items.map((it) => {
            const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
              >
                <Icon
                  className="size-4"
                  style={{ color: active ? it.accent : undefined }}
                />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mx-3 mb-4 rounded-xl bg-muted/60">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[var(--bio)] animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {de.common.liveData}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {de.common.updated}: {lastUpdated.toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-[var(--wasser)] via-[var(--bio)] to-[var(--stadt)]" />
          <div className="font-semibold tracking-tight">{de.appName}</div>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[var(--bio)] animate-pulse" />
            {de.common.liveData}
          </span>
        </header>

        <div className="px-4 md:px-8 lg:px-10 py-5 md:py-8 max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-xl border-t border-border">
        <div className="grid grid-cols-4">
          {items.map((it) => {
            const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className="flex flex-col items-center justify-center py-2.5 gap-1"
              >
                <Icon
                  className="size-5 transition-all"
                  style={{
                    color: active ? it.accent : "var(--muted-foreground)",
                  }}
                />
                <span
                  className="text-[10px] tracking-tight"
                  style={{
                    color: active ? "var(--foreground)" : "var(--muted-foreground)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {it.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
