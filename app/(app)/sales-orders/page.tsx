"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { DataCardTable } from "@/components/shared/data-card-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orderStateLabel, type SalesOrder } from "@/lib/sales-orders";
import { formatMoney, formatDate } from "@/lib/format";
export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search, 300);
  const { data, loading, error } = useFetch<{
    data: SalesOrder[];
    meta: { totalPages: number; total: number };
  }>(
    () =>
      api(
        `/sales-orders?search=${encodeURIComponent(q)}&page=${page}&limit=20`,
      ),
    [q, page],
  );
  return (
    <AppShell
      title="Quotations & sales orders"
      subtitle="Quotation → price validation or approval → confirmation → warehouse delivery → posted invoice."
      actions={
        <Button asChild>
          <Link href="/sales/new">New quotation</Link>
        </Button>
      }
    >
      <PermissionGate permission="sales.read" showDenied>
        <div className="mb-5 flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales">Posted sales & invoices</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/inventory">Product pricing</Link>
          </Button>
        </div>
        {error && <p role="alert">{error}</p>}
        <DataCardTable<SalesOrder>
          storageKey="sales-orders"
          rows={data?.data}
          loading={loading}
          emptyTitle="No quotations yet"
          filters={
            <Input
              aria-label="Search orders"
              placeholder="Search order reference or notes…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          }
          columns={[
            {
              key: "ref",
              header: "Reference",
              cell: (o) => (
                <Link
                  className="font-medium text-primary underline"
                  href={`/sales-orders/${o.id}`}
                >
                  SO-{o.id.slice(0, 8).toUpperCase()}
                </Link>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (o) => (
                <Badge
                  variant={
                    o.state === "PENDING_APPROVAL" ? "outline" : "secondary"
                  }
                >
                  {orderStateLabel[o.state]}
                </Badge>
              ),
            },
            {
              key: "total",
              header: "Total",
              cell: (o) => formatMoney(o.total),
            },
            {
              key: "lines",
              header: "Products",
              cell: (o) => o.payload.lines.length,
            },
            {
              key: "created",
              header: "Created",
              cell: (o) => formatDate(o.createdAt),
            },
            {
              key: "actions",
              header: "Actions",
              cell: (o) => (
                <Button asChild variant="ghost">
                  <Link href={`/sales-orders/${o.id}`}>View / actions</Link>
                </Button>
              ),
            },
          ]}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {data?.meta.total ?? 0} orders ? Page {page} of{" "}
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
