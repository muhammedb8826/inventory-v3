"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PermissionGate } from "@/components/permission-gate";
import { FrappeButtonPrimary } from "@/components/frappe";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { ListSummaryCards } from "@/components/shared/list-summary-cards";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatMoney, formatDate } from "@/lib/format";
import { documentTotal } from "@/lib/document-utils";
import { buildPurchasesListPath } from "@/lib/list-query";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useLocations } from "@/hooks/use-locations";
import { fetchSuppliers } from "@/lib/party-fetch";
import { useFetch } from "@/hooks/use-fetch";
import Link from "next/link";
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
import { PlusIcon, ShoppingCartIcon, WalletIcon } from "lucide-react";

import type {
  PaymentMethod,
  Purchase,
  PurchaseListTotals,
} from "@/lib/types";

type PurchaseRow = Pick<
  Purchase,
  | "id"
  | "paymentMethod"
  | "total"
  | "subtotal"
  | "totalAmount"
  | "createdAt"
  | "supplier"
  | "location"
  | "status"
>;

export default function PurchasesPage() {
  const [search, setSearch] = useState("");
  const [includeVoided, setIncludeVoided] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: suppliers } = useFetch(() => fetchSuppliers(), []);
  const { data: locations } = useLocations();
  const { rows, meta, totals, setPage, setLimit, loading } = usePaginatedList<
    PurchaseRow,
    PurchaseListTotals
  >(
    (page, limit) =>
      buildPurchasesListPath(
        {
          from: from || undefined,
          to: to || undefined,
          includeVoided,
          search: debouncedSearch || undefined,
          supplierId: supplierId || undefined,
          locationId: locationId || undefined,
          paymentMethod: paymentMethod || undefined,
        },
        page,
        limit
      ),
    [
      from,
      to,
      includeVoided,
      debouncedSearch,
      supplierId,
      locationId,
      paymentMethod,
    ]
  );

  const activeFilterCount = useMemo(
    () =>
      countActiveFilters([
        from,
        to,
        includeVoided,
        supplierId,
        locationId,
        paymentMethod,
      ]),
    [from, to, includeVoided, supplierId, locationId, paymentMethod]
  );

  function resetFilters() {
    setFrom("");
    setTo("");
    setIncludeVoided(false);
    setSupplierId("");
    setLocationId("");
    setPaymentMethod("");
  }

  return (
    <AppShell
      title="Purchase"
      subtitle="List of all purchase transactions"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "Purchase" },
      ]}
      actions={
        <PermissionGate permission="purchase.write">
          <FrappeButtonPrimary asChild>
            <Link href="/purchases/new">
              <PlusIcon className="size-3.5" />
              Add Purchase
            </Link>
          </FrappeButtonPrimary>
        </PermissionGate>
      }
    >
      <PermissionGate permission="purchase.read" showDenied>
        <ListSummaryCards
          items={[
            {
              label: "Purchases",
              value: meta.total.toLocaleString(),
              icon: ShoppingCartIcon,
              tone: "slate",
              badge: { label: "Orders", tone: "muted" },
            },
            {
              label: "Subtotal",
              value: formatMoney(totals?.subtotal ?? 0),
              icon: WalletIcon,
              tone: "sky",
              badge: { label: "Net", tone: "info" },
            },
            {
              label: "Total",
              value: formatMoney(totals?.total ?? 0),
              icon: WalletIcon,
              tone: "teal",
              badge: { label: "Paid out", tone: "success" },
            },
          ]}
        />
        <DataCardTable
          storageKey="purchases-list"
          rows={rows}
          loading={loading}
          emptyTitle="Nothing to show"
          emptyDescription="Create your first purchase to receive stock."
          filters={
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search purchases..."
            />
          }
          toolbar={
            <TableFiltersSheet
              activeCount={activeFilterCount}
              onReset={resetFilters}
            >
              <FilterField label="Date range">
                <DateRangeFilter
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                  compact={false}
                />
              </FilterField>
              <FilterField label="Supplier">
                <Select
                  value={supplierId || "__all__"}
                  onValueChange={(v) =>
                    setSupplierId(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All suppliers</SelectItem>
                    {(suppliers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Location">
                <Select
                  value={locationId || "__all__"}
                  onValueChange={(v) =>
                    setLocationId(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
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
              </FilterField>
              <FilterField label="Payment method">
                <Select
                  value={paymentMethod || "__all__"}
                  onValueChange={(v) =>
                    setPaymentMethod(
                      v === "__all__" ? "" : (v as PaymentMethod)
                    )
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="All payments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All payments</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3">
                <Label
                  htmlFor="purchase-include-voided"
                  className="text-sm font-medium"
                >
                  Include voided
                </Label>
                <Switch
                  id="purchase-include-voided"
                  checked={includeVoided}
                  onCheckedChange={setIncludeVoided}
                />
              </div>
            </TableFiltersSheet>
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
                  href={`/purchases/${r.id}`}
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
              key: "supplier",
              header: "Supplier",
              hideable: false,
              mobilePriority: 1,
              cell: (r) =>
                r.supplier?.name ? (
                  <Link
                    href={`/purchases/${r.id}`}
                    className="hover:text-[var(--frappe-primary)] hover:underline"
                  >
                    {r.supplier.name}
                  </Link>
                ) : (
                  "—"
                ),
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
