"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PermissionGate } from "@/components/permission-gate";
import {
  FrappeFilterBar,
  FrappeButtonPrimary,
  FrappeButtonLink,
} from "@/components/frappe";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { formatMoney, formatDate } from "@/lib/format";
import { documentTotal } from "@/lib/document-utils";
import { formatCommissionRate, saleRepName } from "@/lib/sale-utils";
import { buildSalesListPath } from "@/lib/list-query";
import { apiList } from "@/lib/list-response";
import { fetchCustomers } from "@/lib/party-fetch";
import { useLocations } from "@/hooks/use-locations";
import type {
  PaymentMethod,
  Sale,
  SaleListTotals,
  UserAdmin,
} from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ListSearchField } from "@/components/shared/list-search-field";
import { ListSummaryCards } from "@/components/shared/list-summary-cards";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  BadgePercentIcon,
  PlusIcon,
  ReceiptIcon,
  WalletIcon,
} from "lucide-react";

type SaleRow = Pick<
  Sale,
  | "id"
  | "paymentMethod"
  | "total"
  | "subtotal"
  | "totalAmount"
  | "createdAt"
  | "customer"
  | "location"
  | "status"
  | "soldByUser"
  | "soldBy"
  | "commissionPercent"
  | "commissionBasis"
  | "commissionAmount"
>;

export default function SalesPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canOnBehalf = hasPermission(user, "sales.on_behalf");

  const initialSoldBy = searchParams.get("soldByUserId") ?? "";
  const initialFrom = searchParams.get("from") ?? "";
  const initialTo = searchParams.get("to") ?? "";
  const [includeVoided, setIncludeVoided] = useState(false);
  const [soldByUserId, setSoldByUserId] = useState(initialSoldBy);
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const { data: users } = useFetch(
    () => (canOnBehalf ? apiList<UserAdmin>("/users") : Promise.resolve([])),
    [canOnBehalf]
  );
  const { data: customers } = useFetch(() => fetchCustomers(), []);
  const { data: locations } = useLocations();

  const activeUsers = useMemo(
    () => (users ?? []).filter((u) => u.isActive !== false),
    [users]
  );

  const { rows, meta, totals, setPage, setLimit, loading } = usePaginatedList<
    SaleRow,
    SaleListTotals
  >(
    (page, limit) =>
      buildSalesListPath(
        {
          from: from || undefined,
          to: to || undefined,
          includeVoided,
          soldByUserId: soldByUserId || undefined,
          customerId: customerId || undefined,
          locationId: locationId || undefined,
          paymentMethod: paymentMethod || undefined,
          search: debouncedSearch || undefined,
        },
        page,
        limit
      ),
    [
      from,
      to,
      includeVoided,
      soldByUserId,
      customerId,
      locationId,
      paymentMethod,
      debouncedSearch,
    ]
  );

  return (
    <AppShell
      title="Sales Invoice"
      subtitle="List of sales transactions"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Sales Invoice" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission="sales.read">
            <FrappeButtonLink href="/sales/commissions">Commissions</FrappeButtonLink>
          </PermissionGate>
          <PermissionGate permission="sales.write">
            <FrappeButtonPrimary asChild>
              <Link href="/sales/new">
                <PlusIcon className="size-3.5" />
                Add Sale
              </Link>
            </FrappeButtonPrimary>
          </PermissionGate>
        </div>
      }
    >
      <PermissionGate permission="sales.read" showDenied>
          <ListSummaryCards
            items={[
              {
                label: "Sales",
                value: meta.total.toLocaleString(),
                icon: ReceiptIcon,
                tone: "slate",
              },
              {
                label: "Subtotal",
                value: formatMoney(totals?.subtotal ?? 0),
                icon: WalletIcon,
                tone: "sky",
              },
              {
                label: "Total",
                value: formatMoney(totals?.total ?? 0),
                icon: WalletIcon,
                tone: "teal",
              },
              {
                label: "Commission",
                value: formatMoney(totals?.commission ?? 0),
                icon: BadgePercentIcon,
                tone: "violet",
              },
            ]}
          />
          <DataCardTable
            storageKey="sales-list"
            rows={rows}
            loading={loading}
            emptyTitle="Nothing to show"
            emptyDescription="Create your first sale invoice."
            filters={
              <FrappeFilterBar>
                <ListSearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search sales..."
                />
                <DateRangeFilter
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    id="include-voided"
                    checked={includeVoided}
                    onCheckedChange={setIncludeVoided}
                  />
                  <Label
                    htmlFor="include-voided"
                    className="text-sm font-normal"
                  >
                    Include voided
                  </Label>
                </div>
                <Select
                  value={customerId || "__all__"}
                  onValueChange={(v) => setCustomerId(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="h-9 w-[190px]">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All customers</SelectItem>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={locationId || "__all__"}
                  onValueChange={(v) => setLocationId(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="h-9 w-[170px]">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All locations</SelectItem>
                    {(locations ?? []).map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={paymentMethod || "__all__"}
                  onValueChange={(v) =>
                    setPaymentMethod(v === "__all__" ? "" : (v as PaymentMethod))
                  }
                >
                  <SelectTrigger className="h-9 w-[150px]">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All payments</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
                {canOnBehalf ? (
                  <Select
                    value={soldByUserId || "__all__"}
                    onValueChange={(v) =>
                      setSoldByUserId(v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-9 w-[200px]">
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
                ) : null}
              </FrappeFilterBar>
            }
            pagination={{
              meta,
              onPageChange: setPage,
              onLimitChange: setLimit,
              disabled: loading,
            }}
            columns={[
              {
                key: "id",
                header: "ID",
                hideable: false,
                mobilePriority: 4,
                cell: (r) => (
                  <Link
                    href={`/sales/${r.id}`}
                    className="font-medium text-[var(--frappe-primary)] hover:underline"
                  >
                    {r.id.slice(0, 8)}…
                  </Link>
                ),
              },
              {
                key: "date",
                header: "Date",
                mobilePriority: 3,
                cell: (r) => formatDate(r.createdAt),
              },
              {
                key: "customer",
                header: "Customer",
                hideable: false,
                mobilePriority: 1,
                cell: (r) =>
                  r.customer?.name ? (
                    <Link
                      href={`/sales/${r.id}`}
                      className="hover:text-[var(--frappe-primary)] hover:underline"
                    >
                      {r.customer.name}
                    </Link>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "soldBy",
                header: "Sales rep",
                defaultVisible: false,
                cell: (r) => saleRepName(r) ?? "—",
              },
              {
                key: "location",
                header: "Location",
                cell: (r) => r.location?.name ?? "—",
              },
              {
                key: "payment",
                header: "Payment",
                cell: (r) => r.paymentMethod,
              },
              {
                key: "status",
                header: "Status",
                cell: (r) =>
                  r.status === "VOIDED" ? (
                    <Badge variant="secondary">Voided</Badge>
                  ) : (
                    "Posted"
                  ),
              },
              {
                key: "commission",
                header: "Commission",
                className: "text-right tabular-nums",
                defaultVisible: false,
                cell: (r) =>
                  r.commissionAmount
                    ? formatMoney(r.commissionAmount)
                    : formatCommissionRate(
                        r.commissionPercent,
                        r.commissionBasis
                      ) ?? "—",
              },
              {
                key: "total",
                header: "Amount",
                className: "text-right",
                mobilePriority: 2,
                cell: (r) => formatMoney(documentTotal(r)),
              },
            ]}
          />
      </PermissionGate>
    </AppShell>
  );
}
