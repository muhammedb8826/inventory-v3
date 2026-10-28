"use client";

import { cn } from "@/lib/utils";
import { formatQty } from "@/lib/format";

export type StockLevelKind = "high" | "ok" | "low" | "out";

export function getStockLevelKind(
  quantity: string | number,
  reorderPoint?: string | number | null,
): StockLevelKind {
  const qty = typeof quantity === "number" ? quantity : parseFloat(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return "out";
  if (reorderPoint == null || reorderPoint === "") return "ok";
  const reorder =
    typeof reorderPoint === "number" ? reorderPoint : parseFloat(reorderPoint);
  if (!Number.isFinite(reorder) || reorder <= 0) return "ok";
  if (qty <= reorder) return "low";
  if (qty >= reorder * 3) return "high";
  return "ok";
}

const KIND_META: Record<
  StockLevelKind,
  { label: string; bar: string; text: string; track: string; fill: number }
> = {
  high: {
    label: "Healthy",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    track: "bg-emerald-500/15",
    fill: 92,
  },
  ok: {
    label: "OK",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    track: "bg-emerald-500/15",
    fill: 62,
  },
  low: {
    label: "Low",
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    track: "bg-amber-500/15",
    fill: 28,
  },
  out: {
    label: "Out",
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    track: "bg-rose-500/15",
    fill: 4,
  },
};

export function StockLevelBar({
  quantity,
  reorderPoint,
  unit,
  className,
  compact,
}: {
  quantity: string | number;
  reorderPoint?: string | number | null;
  unit?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const kind = getStockLevelKind(quantity, reorderPoint);
  const meta = KIND_META[kind];
  const qtyLabel = formatQty(quantity);
  const unitLabel = unit ? ` ${unit}` : "";

  // Prefer proportional fill when reorder exists
  let fill = meta.fill;
  const qty =
    typeof quantity === "number" ? quantity : parseFloat(String(quantity));
  const reorder =
    reorderPoint == null || reorderPoint === ""
      ? null
      : typeof reorderPoint === "number"
        ? reorderPoint
        : parseFloat(String(reorderPoint));
  if (
    reorder != null &&
    Number.isFinite(reorder) &&
    reorder > 0 &&
    Number.isFinite(qty)
  ) {
    fill = Math.max(4, Math.min(100, Math.round((qty / (reorder * 3)) * 100)));
  }

  return (
    <div className={cn("min-w-[7.5rem]", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums text-[var(--frappe-text)]">
          {qtyLabel}
          {unitLabel}
        </span>
        {!compact ? (
          <span className={cn("text-[11px] font-medium", meta.text)}>
            {meta.label}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "mt-1.5 h-1.5 w-full overflow-hidden rounded-full",
          meta.track,
        )}
        aria-hidden
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            meta.bar,
          )}
          style={{ width: `${fill}%` }}
        />
      </div>
    </div>
  );
}
