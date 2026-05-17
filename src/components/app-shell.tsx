import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const { lastUpdated } = useFilters();
  const current = items.find((it) => (it.to === "/" ? path === "/" : path.startsWith(it.to))) ?? items[0];

  return (
    <div className="md:h-screen md:overflow-hidden min-h-screen flex flex-col bg-background">
      <header className="h-14 shrink-0 z-[1000] sticky top-0 md:static border-b border-border bg-background/95 backdrop-blur-xl flex items-center px-4 md:px-6 gap-3">
        <Link to="/" className="flex items-center shrink-0" aria-label="ParKli">
          <img src={parkliLogo} alt="ParKli" className="h-7 w-auto" />
        </Link>

        {/* Mobile: dropdown */}
        <div className="ml-auto md:hidden relative">
          <select
            aria-label="Bereich auswählen"
            value={current.to}
            onChange={(e) => navigate({ to: e.target.value as any })}
            className="appearance-none text-sm font-medium pl-3 pr-8 py-1.5 rounded-full border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              backgroundSize: "12px 12px",
            }}
          >
            {items.map((it) => (
              <option key={it.to} value={it.to}>
                {it.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop: tabs */}
        <nav className="ml-auto hidden md:flex items-center gap-1">
          {items.map((it) => {
            const active = it.to === "/" ? path === "/" : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`text-sm px-4 py-1.5 rounded-full transition-all ${
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
