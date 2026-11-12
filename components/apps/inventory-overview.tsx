"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, isForbiddenError } from "@/lib/api";
import { buildListPath } from "@/lib/list-query";
import { errorMessage } from "@/lib/format";
import type { PaginatedResponse, ProductionOrder } from "@/lib/types";
import { toast } from "sonner";
import { PageLoading } from "@/components/shared/page-loading";

type OverviewCard = {
  id: string;
  title: string;
  count: number;
  listHref: string;
  createHref: string;
  waitingLabel: string;
  bars: number[];
  statusLabel?: string;
};

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-auto flex h-[4.5rem] items-end gap-1.5 pt-4" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="min-w-0 flex-1 rounded-t-sm bg-muted-foreground/35"
          style={{ height: `${Math.max(10, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function OverviewAction({
  count,
  waitingLabel,
  listHref,
  createHref,
}: {
  count: number;
  waitingLabel: string;
  listHref: string;
  createHref: string;
}) {
  if (count > 0) {
    return (
      <Link
        href={listHref}
        className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold text-white"
        style={{ backgroundColor: "#714B67" }}
      >
        {count} {waitingLabel}
      </Link>
    );
  }
  return (
    <Link
      href={createHref}
      className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold text-white"
      style={{ backgroundColor: "#714B67" }}
    >
      Open
    </Link>
  );
}

export function InventoryOverview() {
  const [loading, setLoading] = useState(true);
  const [receiptsOpen, setReceiptsOpen] = useState(0);
  const [deliveriesOpen, setDeliveriesOpen] = useState(0);
  const [productionActive, setProductionActive] = useState(0);
  const [receiptBars, setReceiptBars] = useState<number[]>([1, 2, 1, 3, 2, 2]);
  const [deliveryBars, setDeliveryBars] = useState<number[]>([1, 1, 2, 1, 2, 1]);
  const [productionBars, setProductionBars] = useState<number[]>([
    1, 1, 1, 2, 1, 1,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const settled = await Promise.allSettled([
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
          api<PaginatedResponse<ProductionOrder>>(
            buildListPath("/production-orders", { page: 1, limit: 50 }),
          ),
          api<PaginatedResponse<{ createdAt?: string; type?: string }>>(
            buildListPath("/inventory/movements", { page: 1, limit: 60 }),
          ),
        ]);

        if (cancelled) return;

        const val = <T,>(i: number): T | null => {
          const r = settled[i];
          return r.status === "fulfilled" ? (r.value as T) : null;
        };

        setReceiptsOpen(val<PaginatedResponse<unknown>>(0)?.meta?.total ?? 0);
        setDeliveriesOpen(val<PaginatedResponse<unknown>>(1)?.meta?.total ?? 0);

        const production = val<PaginatedResponse<ProductionOrder>>(2);
        const activeProd =
          production?.data?.filter(
            (p) => p.status === "RELEASED" || p.status === "IN_PROGRESS",
          ).length ?? 0;
        setProductionActive(activeProd);
        if (production?.data?.length) {
          setProductionBars(
            bucketLastDays(production.data.map((p) => p.createdAt)),
          );
        }

        const moves =
          val<PaginatedResponse<{ createdAt?: string; type?: string }>>(3);
        if (moves?.data?.length) {
          const purchases = moves.data.filter((m) =>
            String(m.type ?? "").includes("PURCHASE"),
          );
          const sales = moves.data.filter((m) =>
            String(m.type ?? "").includes("SALE"),
          );
          const mfg = moves.data.filter((m) =>
            String(m.type ?? "").includes("PRODUCTION"),
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
          if (mfg.length) {
            setProductionBars(bucketLastDays(mfg.map((m) => m.createdAt)));
          }
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
        count: receiptsOpen,
        listHref: "/purchase-orders",
        createHref: "/purchases/new",
        waitingLabel: "To Receive",
        bars: receiptBars,
      },
      {
        id: "deliveries",
        title: "Delivery Orders",
        count: deliveriesOpen,
        listHref: "/sales-orders",
        createHref: "/sales/new",
        waitingLabel: "To Deliver",
        bars: deliveryBars,
      },
      {
        id: "manufacturing",
        title: "Manufacturing",
        count: productionActive,
        listHref: "/production-orders",
        createHref: "/production-orders/new",
        waitingLabel: "In Progress",
        bars: productionBars,
        statusLabel: "In Progress",
      },
    ],
    [receiptsOpen, deliveriesOpen, productionActive, receiptBars, deliveryBars, productionBars],
  );

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold tracking-tight">Inventory Overview</h2>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.id}
            className="flex min-h-[11.5rem] flex-col rounded-2xl border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                {card.title}
              </h3>
              <OverviewAction
                count={card.count}
                waitingLabel={card.waitingLabel}
                listHref={card.listHref}
                createHref={card.createHref}
              />
            </div>

            {card.id === "manufacturing" && card.count > 0 ? (
              <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                <span className="font-medium text-teal-700 dark:text-teal-300">
                  {card.statusLabel}
                </span>
                <span className="tabular-nums font-semibold text-teal-700 dark:text-teal-300">
                  {card.count}
                </span>
              </div>
            ) : null}

            <MiniBars values={card.bars} />
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
  if (buckets.every((n) => n === 0)) return [1, 2, 1, 2, 1, 2];
  return buckets;
}
