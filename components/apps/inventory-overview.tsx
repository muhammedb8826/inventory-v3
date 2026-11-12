"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, isForbiddenError } from "@/lib/api";
import { buildListPath } from "@/lib/list-query";
import { formatMoney, errorMessage } from "@/lib/format";
import type {
  DashboardData,
  PaginatedResponse,
  ProductionOrder,
  StockTransfer,
  Stocktake,
} from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/shared/page-loading";
import { cn } from "@/lib/utils";

type OverviewCard = {
  id: string;
  title: string;
  href: string;
  accent: string;
  primary?: { label: string; value: number };
  bars?: number[];
  emptyHint: string;
};

function MiniBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div
      className="mt-4 flex h-16 items-end gap-1.5"
      aria-hidden="true"
    >
      {values.map((v, i) => (
        <span
          key={i}
          className="min-w-0 flex-1 rounded-t-sm opacity-80"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            background: color,
          }}
        />
      ))}
    </div>
  );
}

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
      <span style={{ color }} className="font-medium">
        {label}
      </span>
      <span className="tabular-nums font-semibold text-foreground">{value}</span>
    </div>
  );
}

export function InventoryOverview() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [receiptsOpen, setReceiptsOpen] = useState(0);
  const [deliveriesOpen, setDeliveriesOpen] = useState(0);
  const [transfersActive, setTransfersActive] = useState(0);
  const [productionActive, setProductionActive] = useState(0);
  const [stocktakesActive, setStocktakesActive] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [receiptBars, setReceiptBars] = useState<number[]>([2, 3, 1, 4, 2, 3]);
  const [deliveryBars, setDeliveryBars] = useState<number[]>([1, 2, 2, 3, 1, 2]);
  const [transferBars, setTransferBars] = useState<number[]>([1, 1, 2, 1, 3, 2]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const settled = await Promise.allSettled([
          api<DashboardData>(buildListPath("/dashboard", { params: {} })),
          api<PaginatedResponse<unknown>>(
            buildListPath("/purchase-orders", {
              params: { status: "CONFIRMED" },
              page: 1,
              limit: 1,
            }),
          ).catch(() =>
            api<PaginatedResponse<unknown>>(
              buildListPath("/purchases", { page: 1, limit: 1 }),
            ),
          ),
          api<PaginatedResponse<unknown>>(
            buildListPath("/sales-orders", {
              params: { status: "CONFIRMED" },
              page: 1,
              limit: 1,
            }),
          ).catch(() =>
            api<PaginatedResponse<unknown>>(
              buildListPath("/sales", { page: 1, limit: 1 }),
            ),
          ),
          api<PaginatedResponse<StockTransfer>>(
            buildListPath("/stock-transfers", { page: 1, limit: 50 }),
          ),
          api<PaginatedResponse<ProductionOrder>>(
            buildListPath("/production-orders", { page: 1, limit: 50 }),
          ),
          api<PaginatedResponse<Stocktake>>(
            buildListPath("/stocktakes", { page: 1, limit: 50 }),
          ),
          api<PaginatedResponse<unknown>>(
            buildListPath("/inventory/low-stock", { page: 1, limit: 1 }),
          ),
          api<PaginatedResponse<{ createdAt?: string }>>(
            buildListPath("/inventory/movements", { page: 1, limit: 40 }),
          ),
        ]);

        if (cancelled) return;

        const val = <T,>(i: number): T | null => {
          const r = settled[i];
          return r.status === "fulfilled" ? (r.value as T) : null;
        };

        const dash = val<DashboardData>(0);
        if (dash) setDashboard(dash);

        const po = val<PaginatedResponse<unknown>>(1);
        setReceiptsOpen(po?.meta?.total ?? 0);

        const so = val<PaginatedResponse<unknown>>(2);
        setDeliveriesOpen(so?.meta?.total ?? 0);

        const transfers = val<PaginatedResponse<StockTransfer>>(3);
        const activeTransfers =
          transfers?.data?.filter(
            (t) => t.status === "PENDING" || t.status === "IN_TRANSIT",
          ).length ?? 0;
        setTransfersActive(activeTransfers);
        if (transfers?.data?.length) {
          setTransferBars(bucketLastDays(transfers.data.map((t) => t.createdAt)));
        }

        const production = val<PaginatedResponse<ProductionOrder>>(4);
        const activeProd =
          production?.data?.filter(
            (p) => p.status === "RELEASED" || p.status === "IN_PROGRESS",
          ).length ?? 0;
        setProductionActive(activeProd);

        const stocktakes = val<PaginatedResponse<Stocktake>>(5);
        const activeTakes =
          stocktakes?.data?.filter(
            (s) => s.status === "DRAFT" || s.status === "IN_PROGRESS",
          ).length ?? 0;
        setStocktakesActive(activeTakes);

        const low = val<PaginatedResponse<unknown>>(6);
        setLowStock(low?.meta?.total ?? 0);

        const moves = val<PaginatedResponse<{ createdAt?: string; type?: string }>>(7);
        if (moves?.data?.length) {
          const purchases = moves.data.filter((m) =>
            String(m.type ?? "").includes("PURCHASE"),
          );
          const sales = moves.data.filter((m) =>
            String(m.type ?? "").includes("SALE"),
          );
          setReceiptBars(
            bucketLastDays(
              (purchases.length ? purchases : moves.data).map((m) => m.createdAt),
            ),
          );
          setDeliveryBars(
            bucketLastDays(
              (sales.length ? sales : moves.data).map((m) => m.createdAt),
            ),
          );
        }
      } catch (e) {
        if (!isForbiddenError(e)) toast.error(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: OverviewCard[] = useMemo(
    () => [
      {
        id: "receipts",
        title: "Receipts",
        href: "/purchase-orders",
        accent: "#0d9488",
        primary: { label: "To receive", value: receiptsOpen },
        bars: receiptBars,
        emptyHint: "No open receipts",
      },
      {
        id: "deliveries",
        title: "Delivery orders",
        href: "/sales-orders",
        accent: "#0d9488",
        primary: { label: "To deliver", value: deliveriesOpen },
        bars: deliveryBars,
        emptyHint: "No open deliveries",
      },
      {
        id: "transfers",
        title: "Internal transfers",
        href: "/stock-transfers",
        accent: "#714B67",
        primary: { label: "In progress", value: transfersActive },
        bars: transferBars,
        emptyHint: "No transfers in progress",
      },
      {
        id: "manufacturing",
        title: "Manufacturing",
        href: "/production-orders",
        accent: "#0d9488",
        primary: { label: "In progress", value: productionActive },
        emptyHint: "No production in progress",
      },
      {
        id: "stocktakes",
        title: "Stocktakes",
        href: "/stocktakes",
        accent: "#f59e0b",
        primary: { label: "Open", value: stocktakesActive },
        emptyHint: "No open stocktakes",
      },
      {
        id: "low-stock",
        title: "Low stock",
        href: "/inventory",
        accent: "#e11d48",
        primary: { label: "Items below reorder", value: lowStock },
        emptyHint: "Stock levels look healthy",
      },
    ],
    [
      receiptsOpen,
      deliveriesOpen,
      transfersActive,
      productionActive,
      stocktakesActive,
      lowStock,
      receiptBars,
      deliveryBars,
      transferBars,
    ],
  );

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Inventory Overview
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live operations across receipts, deliveries, transfers, and production.
          </p>
        </div>
        {dashboard ? (
          <div className="rounded-xl border bg-card px-4 py-2.5 text-right shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Stock value
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatMoney(dashboard.totalInventoryValue)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.id}
            className="flex flex-col rounded-2xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                className="text-sm font-semibold"
                style={{ color: card.accent }}
              >
                {card.title}
              </h3>
              <Button
                asChild
                size="sm"
                className="h-7 rounded-md px-2.5 text-xs"
                style={{ backgroundColor: "#714B67" }}
              >
                <Link href={card.href}>Open</Link>
              </Button>
            </div>

            {card.primary && card.primary.value > 0 ? (
              <StatusRow
                label={card.primary.label}
                value={card.primary.value}
                color={card.accent}
              />
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {card.emptyHint}
              </p>
            )}

            {card.bars ? (
              <MiniBars values={card.bars} color={`${card.accent}99`} />
            ) : (
              <div
                className={cn(
                  "mt-4 h-16 rounded-lg",
                  "bg-gradient-to-br from-muted/80 to-muted/30",
                )}
              />
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function bucketLastDays(dates: (string | undefined)[], days = 6): number[] {
  const buckets = Array.from({ length: days }, () => 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diff >= 0 && diff < days) {
      buckets[days - 1 - diff] += 1;
    }
  }
  if (buckets.every((n) => n === 0)) return [1, 2, 1, 3, 2, 2];
  return buckets;
}
