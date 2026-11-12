"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, isForbiddenError } from "@/lib/api";
import { errorMessage, formatMoney } from "@/lib/format";
import type { SalesOrder } from "@/lib/sales-orders";
import type { PaginatedResponse, Sale } from "@/lib/types";
import { PageLoading } from "@/components/shared/page-loading";
import { toast } from "sonner";

function KpiTile({
  href,
  label,
  count,
  color,
}: {
  href: string;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[5.5rem] flex-col justify-between rounded-xl px-4 py-3 text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
      style={{ backgroundColor: color }}
    >
      <span className="text-2xl font-semibold tabular-nums">{count}</span>
      <span className="text-sm font-medium opacity-95">{label}</span>
    </Link>
  );
}

export function SalesOverview() {
  const [loading, setLoading] = useState(true);
  const [toConfirm, setToConfirm] = useState(0);
  const [toDeliver, setToDeliver] = useState(0);
  const [toInvoice, setToInvoice] = useState(0);
  const [recentRevenue, setRecentRevenue] = useState(0);
  const [recentOrders, setRecentOrders] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ordersRes, salesRes] = await Promise.all([
          api<PaginatedResponse<SalesOrder>>("/sales-orders?page=1&limit=100"),
          api<PaginatedResponse<Sale>>("/sales?page=1&limit=50").catch(() => null),
        ]);
        if (cancelled) return;
        const rows = ordersRes.data ?? [];
        setToConfirm(
          rows.filter((o) =>
            ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(o.state),
          ).length,
        );
        setToDeliver(rows.filter((o) => o.state === "CONFIRMED").length);
        setToInvoice(
          rows.filter((o) => o.state === "CONFIRMED" && !o.saleId).length,
        );

        const sales = salesRes?.data ?? [];
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = sales.filter(
          (s) => new Date(s.createdAt).getTime() >= weekAgo,
        );
        setRecentOrders(recent.length);
        setRecentRevenue(
          recent.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
        );
      } catch (e) {
        if (!cancelled && !isForbiddenError(e)) toast.error(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiTile
          href="/sales-orders"
          label="To confirm"
          count={toConfirm}
          color="#A15C38"
        />
        <KpiTile
          href="/sales-orders?stage=orders"
          label="To deliver"
          count={toDeliver}
          color="#5B4B8A"
        />
        <KpiTile
          href="/sales-orders?stage=orders"
          label="To invoice"
          count={toInvoice}
          color="#2F6F6A"
        />
        <div className="rounded-xl border bg-card px-4 py-3 shadow-sm sm:col-span-3 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last 7 days
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Sales orders</dt>
              <dd className="font-semibold tabular-nums">{recentOrders}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Sales revenue</dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(recentRevenue)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/sales-orders"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          Quotations
        </Link>
        <Link
          href="/sales-orders?stage=orders"
          className="inline-flex h-9 items-center rounded-lg border bg-card px-3 text-sm font-medium"
        >
          Orders
        </Link>
        <Link
          href="/customers"
          className="inline-flex h-9 items-center rounded-lg border bg-card px-3 text-sm font-medium"
        >
          Customers
        </Link>
        <Link
          href="/sales/new"
          className="inline-flex h-9 items-center rounded-lg border bg-card px-3 text-sm font-medium"
        >
          New quotation
        </Link>
      </div>
    </div>
  );
}
