import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  accent,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accent?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <div
            className="text-[11px] uppercase tracking-[0.18em] mb-2 font-medium"
            style={{ color: accent ?? "var(--muted-foreground)" }}
          >
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl md:text-4xl font-semibold tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm md:text-base text-muted-foreground mt-1.5 max-w-xl">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="surface-card p-5 relative overflow-hidden">
      {accent && (
        <div
          className="absolute -top-10 -right-10 size-32 rounded-full opacity-10"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </div>
        {icon}
      </div>
      <div className="mt-3 text-3xl md:text-4xl font-semibold stat-number">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

export function PanelCard({
  title,
  hint,
  right,
  children,
  accent,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div className="surface-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            {accent && (
              <span
                className="size-2 rounded-full"
                style={{ background: accent }}
              />
            )}
            <h3 className="font-semibold tracking-tight">{title}</h3>
          </div>
          {hint && (
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; label: string }[];
}) {
  return (
    <div className="inline-flex p-0.5 bg-muted rounded-full">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`text-xs px-3 py-1 rounded-full transition-all ${
            value === o.v
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
