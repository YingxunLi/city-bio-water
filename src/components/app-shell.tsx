import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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

        {/* Mobile: custom dropdown (styled, not native) */}
        <div className="ml-auto md:hidden relative">
            <MobileMenu
            items={items}
            value={current.to}
            onChange={(to) => navigate({ to: to as any })}
          />
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

function MobileMenu({
  items,
  value,
  onChange,
}: {
  items: { to: string; label: string; accent?: string }[];
  value: string;
  onChange: (to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = items.find((it) => it.to === value) ?? items[0];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center text-sm font-medium pl-3 pr-3 py-1.5 rounded-full border border-border bg-card text-foreground"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate max-w-[160px]">{current.label}</span>
        <svg className="ml-2 size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="6 9 12 15 18 9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
            <ul
              role="listbox"
              className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-[9999]"
        >
          {items.map((it) => (
            <li key={it.to} role="option">
              <button
                type="button"
                onClick={() => {
                  onChange(it.to);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${it.to === value ? "font-medium text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
