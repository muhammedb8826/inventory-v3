"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGridIcon, ListIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { DataCardTable } from "@/components/shared/data-card-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageLoading } from "@/components/shared/page-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { fetchCustomers } from "@/lib/party-fetch";
import {
  orderStateLabel,
  type OrderState,
  type SalesOrder,
} from "@/lib/sales-orders";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/types";

type Stage = "quotations" | "orders";
type BoardView = "kanban" | "list";

const QUOTATION_STATES: OrderState[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
];
const ORDER_STATES: OrderState[] = ["CONFIRMED", "DELIVERED"];

function orderRef(id: string) {
  return `S${id.slice(0, 5).toUpperCase()}`;
}

function statusBadgeVariant(state: OrderState) {
  if (state === "DELIVERED" || state === "CONFIRMED") return "default" as const;
  if (state === "CANCELLED") return "destructive" as const;
  return "secondary" as const;
}

function invoiceLabel(order: SalesOrder) {
  if (order.saleId || order.state === "DELIVERED") return "Fully invoiced";
  if (order.state === "CONFIRMED") return "To invoice";
  return "Nothing to invoice";
}

export function SalesOrdersBoard() {
  const searchParams = useSearchParams();
  const stage: Stage =
    searchParams.get("stage") === "orders" ? "orders" : "quotations";
  const [view, setView] = useState<BoardView>("kanban");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search, 300);

  const { data, loading, error } = useFetch<{
    data: SalesOrder[];
    meta: { totalPages: number; total: number };
  }>(
    () =>
      api(
        `/sales-orders?search=${encodeURIComponent(q)}&page=${page}&limit=50`,
      ),
    [q, page],
  );
  const { data: customers } = useFetch<Customer[]>(
    () => fetchCustomers(),
    [],
    { toastOnError: false },
  );

  const customerName = useMemo(() => {
    const map = new Map((customers ?? []).map((c) => [c.id, c.name]));
    return (order: SalesOrder) =>
      order.customer?.name ??
      (order.payload.customerId
        ? (map.get(order.payload.customerId) ?? "Customer")
        : "Walk-in customer");
  }, [customers]);

  const rows = useMemo(() => {
    const all = data?.data ?? [];
    const allowed = stage === "orders" ? ORDER_STATES : QUOTATION_STATES;
    return all.filter((o) => allowed.includes(o.state));
  }, [data?.data, stage]);

  const kpis = useMemo(() => {
    const all = data?.data ?? [];
    return {
      toConfirm: all.filter((o) =>
        ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(o.state),
      ).length,
      toDeliver: all.filter((o) => o.state === "CONFIRMED").length,
      toInvoice: all.filter((o) => o.state === "CONFIRMED" && !o.saleId).length,
      revenue: rows.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    };
  }, [data?.data, rows]);

  const title = stage === "orders" ? "Orders" : "Quotations";

  return (
    <AppShell
      title={title}
      subtitle={
        stage === "orders"
          ? "Confirmed sales orders — deliver and invoice from the order page."
          : "Quotations to send, approve, and confirm — all actions stay on the order."
      }
      breadcrumbs={[
        { label: "Sales", href: "/apps/sales" },
        { label: title },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="View"
            className="flex rounded-lg border bg-muted/40 p-0.5"
          >
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={view === "kanban"}
              className={cn(
                "h-8 gap-1.5 px-2.5",
                view === "kanban" && "bg-background shadow-sm",
              )}
              onClick={() => setView("kanban")}
            >
              <LayoutGridIcon className="size-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-pressed={view === "list"}
              className={cn(
                "h-8 gap-1.5 px-2.5",
                view === "list" && "bg-background shadow-sm",
              )}
              onClick={() => setView("list")}
            >
              <ListIcon className="size-4" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>
          <Button asChild>
            <Link href="/sales/new">New</Link>
          </Button>
        </div>
      }
    >
      <PermissionGate permission="sales.read" showDenied>
        <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Link
            href="/sales-orders"
            className="rounded-xl px-4 py-3 text-white"
            style={{ backgroundColor: "#A15C38" }}
          >
            <p className="text-2xl font-semibold tabular-nums">
              {kpis.toConfirm}
            </p>
            <p className="text-sm">To confirm</p>
          </Link>
          <Link
            href="/sales-orders?stage=orders"
            className="rounded-xl px-4 py-3 text-white"
            style={{ backgroundColor: "#5B4B8A" }}
          >
            <p className="text-2xl font-semibold tabular-nums">
              {kpis.toDeliver}
            </p>
            <p className="text-sm">To deliver</p>
          </Link>
          <Link
            href="/sales-orders?stage=orders"
            className="rounded-xl px-4 py-3 text-white"
            style={{ backgroundColor: "#2F6F6A" }}
          >
            <p className="text-2xl font-semibold tabular-nums">
              {kpis.toInvoice}
            </p>
            <p className="text-sm">To invoice</p>
          </Link>
          <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">List total</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoney(kpis.revenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {rows.length} {stage === "orders" ? "orders" : "quotations"}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            asChild
            variant={stage === "quotations" ? "default" : "outline"}
            size="sm"
          >
            <Link href="/sales-orders">Quotations</Link>
          </Button>
          <Button
            asChild
            variant={stage === "orders" ? "default" : "outline"}
            size="sm"
          >
            <Link href="/sales-orders?stage=orders">Orders</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/sales">Posted invoices</Link>
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        ) : null}

        {view === "kanban" ? (
          <div className="space-y-4">
            <Input
              aria-label={`Search ${title.toLowerCase()}`}
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {loading && !rows.length ? (
              <PageLoading />
            ) : !rows.length ? (
              <EmptyState
                title={`No ${title.toLowerCase()} found`}
                description="Create a quotation to start the sales flow."
              />
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/sales-orders/${order.id}`}
                      className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold leading-snug">
                          {customerName(order)}
                        </p>
                        <Badge variant={statusBadgeVariant(order.state)}>
                          {order.state === "CONFIRMED" ||
                          order.state === "DELIVERED"
                            ? "Sales Order"
                            : "Quotation"}
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold tabular-nums">
                        {formatMoney(order.total)}
                      </p>
                      <p className="mt-auto text-xs text-muted-foreground">
                        {orderRef(order.id)} · {formatDate(order.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <DataCardTable<SalesOrder>
            storageKey={`sales-orders-${stage}`}
            rows={rows}
            loading={loading}
            emptyTitle={`No ${title.toLowerCase()} found`}
            filters={
              <Input
                aria-label={`Search ${title.toLowerCase()}`}
                placeholder="Search…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            }
            columns={[
              {
                key: "number",
                header: "Number",
                cell: (o) => (
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={`/sales-orders/${o.id}`}
                  >
                    {orderRef(o.id)}
                  </Link>
                ),
              },
              {
                key: "date",
                header: "Order date",
                cell: (o) => formatDate(o.createdAt),
              },
              {
                key: "customer",
                header: "Customer",
                cell: (o) => customerName(o),
              },
              {
                key: "total",
                header: "Total",
                cell: (o) => formatMoney(o.total),
              },
              {
                key: "status",
                header: "Status",
                cell: (o) => (
                  <Badge variant={statusBadgeVariant(o.state)}>
                    {orderStateLabel[o.state]}
                  </Badge>
                ),
              },
              {
                key: "invoice",
                header: "Invoice status",
                cell: (o) => (
                  <span
                    className={cn(
                      "text-sm",
                      o.saleId || o.state === "DELIVERED"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {invoiceLabel(o)}
                  </span>
                ),
              },
            ]}
          />
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {data?.meta.total ?? 0} records · Page {page} of{" "}
            {data?.meta.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= (data?.meta.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </PermissionGate>
    </AppShell>
  );
}
