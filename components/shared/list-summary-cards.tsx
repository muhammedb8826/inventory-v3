"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ListSummaryItem = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: "teal" | "coral" | "sky" | "amber" | "slate" | "violet";
  /** Small status chip under/beside the value (Fleety-style). */
  badge?: { label: string; tone?: "success" | "danger" | "warning" | "info" | "muted" };
};

const ICON_TONE: Record<NonNullable<ListSummaryItem["tone"]>, string> = {
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-300",
  coral: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  violet: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
};

const BADGE_TONE = {
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  danger: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  muted: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
} as const;

/** Clean KPI strip above list tables (Fleety / SaaS style). */
export function ListSummaryCards({
  items,
  className,
}: {
  items: ListSummaryItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  const cols =
    items.length === 1
      ? "sm:grid-cols-1 max-w-xs"
      : items.length === 2
        ? "sm:grid-cols-2"
        : items.length === 4
          ? "sm:grid-cols-2 xl:grid-cols-4"
          : "sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={cn("mb-5 grid grid-cols-1 gap-3", cols, className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.tone ?? "teal";
        return (
          <div
            key={item.label}
            className="rounded-2xl border border-border/80 bg-card px-5 py-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                  {item.value}
                </p>
                {item.badge ? (
                  <span
                    className={cn(
                      "mt-2.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      BADGE_TONE[item.badge.tone ?? "muted"]
                    )}
                  >
                    {item.badge.label}
                  </span>
                ) : null}
              </div>
              {Icon ? (
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    ICON_TONE[tone]
                  )}
                >
                  <Icon className="size-4" />
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
