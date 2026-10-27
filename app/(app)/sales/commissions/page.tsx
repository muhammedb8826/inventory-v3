"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { ListSearchField } from "@/components/shared/list-search-field";
import { PermissionGate } from "@/components/permission-gate";
import {
  FrappeFilterBar,
  FrappeButtonLink,
} from "@/components/frappe";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiList } from "@/lib/list-response";
import { buildCommissionsSummaryPath } from "@/lib/list-query";
import { firstDayOfMonthIso, todayIso } from "@/lib/sales-query";
import { formatMoney } from "@/lib/format";
import { commissionRowRepName, commissionRowSubtotal } from "@/lib/sale-utils";
import type { SalesCommissionSummaryRow, UserAdmin } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default function SalesCommissionsPage() {
  const { user } = useAuth();
  const canFilterRep = hasPermission(user, "sales.on_behalf");
  const [from, setFrom] = useState(firstDayOfMonthIso);
  const [to, setTo] = useState(todayIso);
  const [soldByUserId, setSoldByUserId] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const { data: users } = useFetch(
    () => (canFilterRep ? apiList<UserAdmin>("/users") : Promise.resolve([])),
    [canFilterRep],
  );

  const activeUsers = useMemo(
    () => (users ?? []).filter((u) => u.isActive !== false),
    [users],
  );

  const { rows, allRows, meta, setPage, setLimit, loading } =
    usePaginatedList<SalesCommissionSummaryRow>(
      (page, limit) =>
        buildCommissionsSummaryPath(
          {
            from,
            to,
            soldByUserId: soldByUserId || undefined,
          },
          page,
          limit,
        ),
      [from, to, soldByUserId],
    );

  const totals = useMemo(() => {
    let sales = 0;
    let commission = 0;
    let count = 0;
    for (const r of allRows) {
      count += r.saleCount;
      sales += parseFloat(commissionRowSubtotal(r)) || 0;
      commission += parseFloat(r.totalCommission) || 0;
    }
    return { count, sales, commission };
  }, [allRows]);

  const displayRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const source = rows.map((r) => ({ ...r, id: r.soldByUserId }));
    if (!q) return source;
    return source.filter((r) =>
      commissionRowRepName(r).toLowerCase().includes(q),
    );
  }, [rows, debouncedSearch]);

  return (
    <AppShell
      title="Sales commissions"
      subtitle="Per-rep totals for active (non-voided) sales"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Sales Invoice", href: "/sales" },
        { label: "Commissions" },
      ]}
      actions={<FrappeButtonLink href="/sales">← Sales list</FrappeButtonLink>}
    >
      <PermissionGate permission="sales.read" showDenied>
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sales count</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {totals.count}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total subtotal</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatMoney(totals.sales)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total commission</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {formatMoney(totals.commission)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <DataCardTable
          storageKey="sales-commissions"
          rows={displayRows}
          loading={loading}
          filters={
            <FrappeFilterBar className="items-end">
              <ListSearchField
                value={search}
                onChange={setSearch}
                placeholder="Search reps…"
              />
              <div className="grid gap-2">
                <Label htmlFor="comm-from">From</Label>
                <Input
                  id="comm-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full sm:w-[160px]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="comm-to">To</Label>
                <Input
                  id="comm-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full sm:w-[160px]"
                />
              </div>
              {canFilterRep ? (
                <div className="grid gap-2">
                  <Label>Sales rep</Label>
                  <Select
                    value={soldByUserId || "__all__"}
                    onValueChange={(v) =>
                      setSoldByUserId(v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue placeholder="All reps" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All reps</SelectItem>
                      {activeUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </FrappeFilterBar>
          }
          emptyTitle="No commission data"
          emptyDescription="No sales in this date range for the selected filters."
          pagination={{
            meta,
            onPageChange: setPage,
            onLimitChange: setLimit,
            disabled: loading,
          }}
          columns={[
            {
              key: "rep",
              header: "Sales rep",
              hideable: false,
              mobilePriority: 1,
              cell: (r) => commissionRowRepName(r),
            },
            {
              key: "count",
              header: "Sales",
              className: "text-right tabular-nums",
              mobilePriority: 3,
              cell: (r) => r.saleCount,
            },
            {
              key: "sales",
              header: "Subtotal",
              className: "text-right tabular-nums",
              mobilePriority: 4,
              cell: (r) => formatMoney(commissionRowSubtotal(r)),
            },
            {
              key: "commission",
              header: "Commission",
              className: "text-right tabular-nums",
              mobilePriority: 2,
              cell: (r) => formatMoney(r.totalCommission),
            },
            {
              key: "view",
              header: "Actions",
              cell: (r) => (
                <Link
                  href={`/sales?soldByUserId=${r.soldByUserId}&from=${from}&to=${to}`}
                  className="text-sm text-[var(--frappe-primary)] hover:underline"
                >
                  View sales
                </Link>
              ),
            },
          ]}
        />
      </PermissionGate>
    </AppShell>
  );
}
