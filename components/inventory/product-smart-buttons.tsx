"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeftRightIcon,
  BarChart3Icon,
  FlaskConicalIcon,
  PackageIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import {
  buildBomsListPath,
  buildInventoryMovementsListPath,
} from "@/lib/list-query";
import { formatQty } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaginatedResponse, StockMovement } from "@/lib/types";

export type ProductSmartStats = {
  onHand: number;
  forecasted: number;
  bomCount: number;
  purchased: number;
  incoming: number;
  sold: number;
  outgoing: number;
  reorderingRules: number;
  moveIn: number;
  moveOut: number;
};

const EMPTY_STATS: ProductSmartStats = {
  onHand: 0,
  forecasted: 0,
  bomCount: 0,
  purchased: 0,
  incoming: 0,
  sold: 0,
  outgoing: 0,
  reorderingRules: 0,
  moveIn: 0,
  moveOut: 0,
};

function sumAbsDelta(
  rows: StockMovement[] | undefined,
  predicate: (m: StockMovement) => boolean,
): number {
  if (!rows?.length) return 0;
  return rows.reduce((sum, row) => {
    if (!predicate(row)) return sum;
    return sum + Math.abs(Number(row.quantityDelta) || 0);
  }, 0);
}

function countMoves(
  rows: StockMovement[] | undefined,
  predicate: (m: StockMovement) => boolean,
): number {
  if (!rows?.length) return 0;
  return rows.filter(predicate).length;
}

export function useProductSmartStats(
  itemId: string | undefined,
  stock?: {
    onHand?: string | number | null;
    available?: string | number | null;
    reserved?: string | number | null;
  } | null,
  reorderRuleCount = 0,
): { stats: ProductSmartStats; loading: boolean } {
  const enabled = Boolean(itemId);

  const { data: boms, loading: bomsLoading } = useFetch<
    PaginatedResponse<unknown>
  >(
    () => api(buildBomsListPath({ finishedItemId: itemId }, 1, 1)),
    [itemId],
    { enabled, toastOnError: false },
  );

  const { data: purchases, loading: purchaseLoading } = useFetch<
    PaginatedResponse<StockMovement>
  >(
    () =>
      api(
        buildInventoryMovementsListPath(
          { itemId, type: "PURCHASE" },
          1,
          200,
        ),
      ),
    [itemId],
    { enabled, toastOnError: false },
  );

  const { data: sales, loading: salesLoading } = useFetch<
    PaginatedResponse<StockMovement>
  >(
    () =>
      api(buildInventoryMovementsListPath({ itemId, type: "SALE" }, 1, 200)),
    [itemId],
    { enabled, toastOnError: false },
  );

  const { data: transferIn, loading: tinLoading } = useFetch<
    PaginatedResponse<StockMovement>
  >(
    () =>
      api(
        buildInventoryMovementsListPath(
          { itemId, type: "TRANSFER_IN" },
          1,
          200,
        ),
      ),
    [itemId],
    { enabled, toastOnError: false },
  );

  const { data: transferOut, loading: toutLoading } = useFetch<
    PaginatedResponse<StockMovement>
  >(
    () =>
      api(
        buildInventoryMovementsListPath(
          { itemId, type: "TRANSFER_OUT" },
          1,
          200,
        ),
      ),
    [itemId],
    { enabled, toastOnError: false },
  );

  const { data: allMoves, loading: movesLoading } = useFetch<
    PaginatedResponse<StockMovement>
  >(
    () => api(buildInventoryMovementsListPath({ itemId }, 1, 200)),
    [itemId],
    { enabled, toastOnError: false },
  );

  const onHand = Number(stock?.onHand ?? 0) || 0;
  const available = Number(stock?.available ?? stock?.onHand ?? 0) || 0;
  const purchased = sumAbsDelta(purchases?.data, () => true);
  const incoming = sumAbsDelta(transferIn?.data, () => true);
  const sold = sumAbsDelta(sales?.data, () => true);
  const outgoing = sumAbsDelta(transferOut?.data, () => true);
  const moveIn = countMoves(
    allMoves?.data,
    (m) => Number(m.quantityDelta) > 0,
  );
  const moveOut = countMoves(
    allMoves?.data,
    (m) => Number(m.quantityDelta) < 0,
  );

  const stats: ProductSmartStats = enabled
    ? {
        onHand,
        forecasted: available + incoming,
        bomCount: boms?.meta.total ?? 0,
        purchased,
        incoming,
        sold,
        outgoing,
        reorderingRules: reorderRuleCount,
        moveIn,
        moveOut,
      }
    : EMPTY_STATS;

  const loading =
    enabled &&
    (bomsLoading ||
      purchaseLoading ||
      salesLoading ||
      tinLoading ||
      toutLoading ||
      movesLoading);

  return { stats, loading };
}

function SmartButton({
  href,
  disabled,
  icon,
  lines,
}: {
  href?: string;
  disabled?: boolean;
  icon: ReactNode;
  lines: { value: string; label: string }[];
}) {
  const content = (
    <>
      <span className="text-muted-foreground [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1 text-left leading-tight">
        {lines.map((line, index) => (
          <span key={`${line.label || line.value}-${index}`} className="block">
            <span className="font-semibold tabular-nums text-foreground">
              {line.value}
            </span>{" "}
            {line.label ? (
              <span className="text-muted-foreground">{line.label}</span>
            ) : null}
          </span>
        ))}
      </span>
    </>
  );

  const className = cn(
    "inline-flex min-h-[52px] min-w-[7.5rem] max-w-[11rem] flex-1 items-center gap-2 border-r border-border/80 px-3 py-1.5 text-xs transition-colors last:border-r-0",
    disabled
      ? "cursor-default opacity-70"
      : "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
  );

  if (disabled || !href) {
    return (
      <span className={className} aria-disabled>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export function ProductSmartButtons({
  itemId,
  productName,
  stats,
  className,
}: {
  itemId?: string;
  productName?: string;
  stats: ProductSmartStats;
  className?: string;
}) {
  const saved = Boolean(itemId);
  const search = productName?.trim()
    ? encodeURIComponent(productName.trim())
    : undefined;
  const movesBase = saved
    ? `/inventory?tab=movements&itemId=${encodeURIComponent(itemId!)}`
    : undefined;

  return (
    <div
      className={cn(
        "flex flex-wrap overflow-hidden rounded-md border bg-card",
        className,
      )}
      role="navigation"
      aria-label="Product shortcuts"
    >
      <SmartButton
        href={
          saved
            ? `/inventory?search=${search ?? ""}`
            : undefined
        }
        disabled={!saved}
        icon={<BarChart3Icon />}
        lines={[
          { value: formatQty(stats.onHand), label: "On Hand" },
          { value: formatQty(stats.forecasted), label: "Forecasted" },
        ]}
      />
      <SmartButton
        href={
          saved
            ? stats.bomCount > 0
              ? `/boms?search=${search ?? ""}`
              : `/boms/new?finishedItemId=${encodeURIComponent(itemId!)}`
            : undefined
        }
        disabled={!saved}
        icon={<FlaskConicalIcon />}
        lines={[
          {
            value: String(stats.bomCount),
            label: "Bill of Materials",
          },
        ]}
      />
      <SmartButton
        href={movesBase}
        disabled={!saved}
        icon={<ShoppingCartIcon />}
        lines={[
          { value: formatQty(stats.purchased), label: "Purchased" },
          { value: formatQty(stats.incoming), label: "Incoming" },
        ]}
      />
      <SmartButton
        href={movesBase}
        disabled={!saved}
        icon={<PackageIcon />}
        lines={[
          { value: formatQty(stats.sold), label: "Sold" },
          { value: formatQty(stats.outgoing), label: "Outgoing" },
        ]}
      />
      <SmartButton
        href={saved ? `/inventory?search=${search ?? ""}` : undefined}
        disabled={!saved}
        icon={<RefreshCwIcon />}
        lines={[
          {
            value: String(stats.reorderingRules),
            label: "Reordering Rules",
          },
        ]}
      />
      <SmartButton
        href={movesBase}
        disabled={!saved}
        icon={<ArrowLeftRightIcon />}
        lines={[
          { value: `In: ${stats.moveIn}`, label: "" },
          { value: `Out: ${stats.moveOut}`, label: "" },
        ]}
      />
    </div>
  );
}
