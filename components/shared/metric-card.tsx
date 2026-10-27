"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  teal: {
    icon: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
    trendUp: "text-teal-600 dark:text-teal-300",
  },
  coral: {
    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    trendUp: "text-rose-600 dark:text-rose-300",
  },
  sky: {
    icon: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
    trendUp: "text-sky-600 dark:text-sky-300",
  },
  amber: {
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    trendUp: "text-amber-600 dark:text-amber-300",
  },
  slate: {
    icon: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    trendUp: "text-slate-600 dark:text-slate-300",
  },
  violet: {
    icon: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    trendUp: "text-indigo-600 dark:text-indigo-300",
  },
} as const;

export type MetricTone = keyof typeof TONE_STYLES;

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "teal",
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: MetricTone;
  trend?: { label: string; positive?: boolean };
  className?: string;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "sms-panel group relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-[0.07] blur-2xl"
        style={{
          background:
            tone === "coral"
              ? "var(--frappe-accent-coral)"
              : "var(--frappe-primary)",
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--frappe-text-muted)]">
            {label}
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold tracking-tight tabular-nums text-[var(--frappe-text)] lg:text-[1.7rem]">
            {value}
          </p>
        </div>
        <span className={cn("sms-metric-icon shrink-0", styles.icon)}>
          <Icon className="size-5" />
        </span>
      </div>
      {(hint || trend) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {trend ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-semibold",
                trend.positive === false
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-300"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              )}
            >
              {trend.label}
            </span>
          ) : null}
          {hint ? (
            <span className="text-[var(--frappe-text-muted)]">{hint}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
