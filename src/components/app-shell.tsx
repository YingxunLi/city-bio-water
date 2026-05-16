import { Link, useRouterState } from "@tanstack/react-router";
import { de } from "@/lib/i18n";
import { useFilters } from "@/lib/filter-context";
import { ClientOnly } from "@/components/client-only";
import parkliLogo from "@/assets/parkli-logo.png";

const items = [
  { to: "/", label: de.nav.home, accent: "var(--foreground)" },
  { to: "/wasser", label: de.nav.wasser, accent: "var(--wasser)" },
  { to: "/stadt", label: de.nav.stadt, accent: "var(--stadt)" },
  { to: "/biodiversitaet", label: de.nav.bio, accent: "var(--bio)" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { lastUpdated } = useFilters();

  return (
    <div className="md:h-screen md:overflow-hidden min-h-screen flex flex-col bg-background">
      <header className="h-14 shrink-0 z-[1000] sticky top-0 md:static border-b border-border bg-background/95 backdrop-blur-xl flex items-center px-4 md:px-6 gap-3">
        <Link to="/" className="flex items-center shrink-0" aria-label="ParKli">
          <img src={parkliLogo} alt="ParKli" className="h-7 w-auto" />
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {items.map((it) => {
            const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`text-xs md:text-sm px-3 md:px-4 py-1.5 rounded-full transition-all ${
                  active ? "text-background font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
                style={{
                  background: active
                    ? it.to === "/"
                      ? "var(--foreground)"
                      : it.accent
                    : "transparent",
                }}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground ml-2 shrink-0">
          <span className="size-1.5 rounded-full bg-[var(--bio)] animate-pulse" />
          {de.common.liveData}
          <ClientOnly fallback={null}>
            {() => (
              <span>
                {" "}· {lastUpdated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </ClientOnly>
        </div>
      </header>
      <main className="flex-1 min-h-0 md:overflow-hidden">{children}</main>
    </div>
  );
}
