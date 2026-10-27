"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ListSummaryItem = {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: "teal" | "coral" | "sky" | "amber" | "slate" | "violet";
};

const TONE: Record<
  NonNullable<ListSummaryItem["tone"]>,
  string
> = {
  teal: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
  coral: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  sky: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  amber: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  slate: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  violet: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
};

/** Compact KPI strip above list tables (ERP-standard summary cards). */
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
      ? "sm:grid-cols-1"
      : items.length === 2
        ? "sm:grid-cols-2"
        : items.length === 4
          ? "sm:grid-cols-2 xl:grid-cols-4"
          : "sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={cn("mb-4 grid grid-cols-1 gap-3", cols, className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const tone = item.tone ?? "teal";
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-2xl border border-[var(--frappe-border)] bg-[var(--frappe-surface)] px-4 py-3.5 shadow-[var(--frappe-shadow)]"
          >
            {Icon ? (
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  TONE[tone]
                )}
              >
                <Icon className="size-4" />
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 truncate text-lg font-semibold tabular-nums tracking-tight text-foreground">
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
