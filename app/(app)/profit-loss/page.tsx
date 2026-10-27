"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { PageLoading } from "@/components/shared/page-loading";
import { PermissionGate } from "@/components/permission-gate";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { applyCurrencyFromResponse } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { buildListPath } from "@/lib/list-query";
import type { Currency, ProfitLossItem } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useClientPaginatedList } from "@/hooks/use-client-paginated-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface PnlSummary {
  revenue: string;
  costOfGoodsSold: string;
  grossProfit: string;
  totalExpenses: string;
  netProfit: string;
  currency?: Currency;
}

export default function ProfitLossPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const dateParams = {
    from: from || undefined,
    to: to || undefined,
  };

  const { data: summary, loading: sl } = useFetch(
    () =>
      api<PnlSummary>(
        buildListPath("/profit-loss/summary", { params: dateParams }),
      ).then((res) => {
        applyCurrencyFromResponse(res);
        return res;
      }),
    [from, to],
  );
  const { data: byItem, loading: il } = useFetch(
    () =>
      api<ProfitLossItem[]>(
        buildListPath("/profit-loss/by-item", { params: dateParams }),
      ),
    [from, to],
  );
  const byItemRows = useMemo(() => {
    const mapped = (byItem ?? []).map((r) => ({ ...r, id: r.itemId }));
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return mapped;
    return mapped.filter((r) => r.description.toLowerCase().includes(q));
  }, [byItem, debouncedSearch]);
  const { rows, meta, setPage, setLimit } = useClientPaginatedList(byItemRows, [
    byItemRows,
  ]);

  const activeFilterCount = useMemo(
    () => countActiveFilters([from, to]),
    [from, to],
  );

  function resetFilters() {
    setFrom("");
    setTo("");
  }

  return (
    <AppShell title="Profit & Loss">
      <PermissionGate permission="profit_loss.read" showDenied>
        {sl ? (
          <PageLoading />
        ) : summary ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Revenue", summary.revenue],
              ["COGS", summary.costOfGoodsSold],
              ["Gross profit", summary.grossProfit],
              ["Expenses", summary.totalExpenses],
              ["Net profit", summary.netProfit],
            ].map(([label, value]) => (
              <Card key={label as string}>
                <CardHeader>
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="tabular-nums">
                    {formatMoney(value as string)}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : null}

        <DataCardTable
          storageKey="profit-loss-by-item"
          rows={rows}
          loading={il}
          filters={
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search items…"
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
            </TableFiltersSheet>
          }
          emptyTitle="No sales data"
          pagination={{
            meta,
            onPageChange: setPage,
            onLimitChange: setLimit,
          }}
          columns={[
            {
              key: "item",
              header: "Item",
              hideable: false,
              mobilePriority: 1,
              cell: (r) => r.description,
            },
            {
              key: "qty",
              header: "Qty sold",
              className: "text-right",
              mobilePriority: 3,
              cell: (r) => r.quantitySold,
            },
            {
              key: "revenue",
              header: "Revenue",
              className: "text-right",
              mobilePriority: 2,
              cell: (r) => formatMoney(r.revenue),
            },
            {
              key: "cost",
              header: "Cost",
              className: "text-right",
              defaultVisible: false,
              cell: (r) => formatMoney(r.cost),
            },
            {
              key: "profit",
              header: "Profit",
              className: "text-right",
              mobilePriority: 4,
              cell: (r) => formatMoney(r.profit),
            },
            {
              key: "margin",
              header: "Margin %",
              className: "text-right",
              defaultVisible: false,
              cell: (r) => `${r.marginPercent}%`,
            },
          ]}
        />
      </PermissionGate>
    </AppShell>
  );
}
