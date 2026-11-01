"use client";
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataCardTable } from "@/components/shared/data-card-table";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate, formatMoney } from "@/lib/format";
import { purchaseOrderLabels, type PurchaseOrder } from "@/lib/purchase-orders";
export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const q = useDebouncedValue(search, 300);
  const { data, loading, error } = useFetch<{
    data: PurchaseOrder[];
    meta: { total: number; totalPages: number };
  }>(
    () =>
      api(
        `/purchase-orders?search=${encodeURIComponent(q)}&page=${page}&limit=20`,
      ),
    [q, page],
  );
  return (
    <AppShell
      title="Purchase orders"
      subtitle="Draft purchase request → confirmed order → warehouse receipt. Stock changes only when goods are received."
      actions={
        <PermissionGate permission="purchase.write">
          <Button asChild>
            <Link href="/purchases/new">New purchase order</Link>
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate permission="purchase.read" showDenied>
        <Button asChild variant="outline" className="mb-4">
          <Link href="/purchases">Posted receipts & purchases</Link>
        </Button>
        {error && <p role="alert">{error}</p>}
        <DataCardTable<PurchaseOrder>
          storageKey="purchase-orders"
          rows={data?.data}
          loading={loading}
          emptyTitle="No purchase orders"
          filters={
            <Input
              aria-label="Search purchase orders"
              placeholder="Search reference or notes…"
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
                  href={`/purchase-orders/${o.id}`}
                >
                  PO-{o.id.slice(0, 8).toUpperCase()}
                </Link>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (o) => (
                <Badge variant="secondary">
                  {purchaseOrderLabels[o.state]}
                </Badge>
              ),
            },
            {
              key: "total",
              header: "Total",
              cell: (o) => formatMoney(o.total),
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
                  <Link href={`/purchase-orders/${o.id}`}>View / actions</Link>
                </Button>
              ),
            },
          ]}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {data?.meta.total ?? 0} orders · Page {page} of{" "}
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
