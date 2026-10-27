"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataCardTable } from "@/components/shared/data-card-table";
import { PermissionGate } from "@/components/permission-gate";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { ListSearchField } from "@/components/shared/list-search-field";
import {
  FilterField,
  TableFiltersSheet,
  countActiveFilters,
} from "@/components/shared/table-filters-sheet";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { FrappeButtonPrimary } from "@/components/frappe";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { buildExpensesListPath } from "@/lib/list-query";
import {
  bankAccountsForSelect,
  formatBankAccountLabel,
} from "@/lib/bank-accounts";
import { formatMoney, formatDate, errorMessage } from "@/lib/format";
import type {
  BankAccount,
  Expense,
  ExpenseCategory,
  ExpenseListTotals,
} from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { ListSummaryCards } from "@/components/shared/list-summary-cards";
import { toast } from "sonner";
import { BanknoteIcon, PlusIcon, ReceiptIcon, Trash2Icon } from "lucide-react";

export default function ExpensesPage() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { data: categories } = useFetch(
    () => api<ExpenseCategory[]>("/expenses/categories"),
    [],
  );
  const { data: banks } = useFetch(
    () => apiList<BankAccount>("/banks/accounts"),
    [],
  );
  const { rows, meta, totals, setPage, setLimit, loading, reload } =
    usePaginatedList<Expense, ExpenseListTotals>(
      (page, limit) =>
        buildExpensesListPath(
          {
            from: from || undefined,
            to: to || undefined,
            search: debouncedSearch || undefined,
            categoryId: categoryId || undefined,
            bankAccountId: bankAccountId || undefined,
          },
          page,
          limit,
        ),
      [from, to, debouncedSearch, categoryId, bankAccountId],
    );

  const activeFilterCount = useMemo(
    () => countActiveFilters([from, to, categoryId, bankAccountId]),
    [from, to, categoryId, bankAccountId],
  );

  function resetFilters() {
    setFrom("");
    setTo("");
    setCategoryId("");
    setBankAccountId("");
  }

  return (
    <AppShell
      title="Expenses"
      actions={
        <PermissionGate permission="expense.write">
          <FrappeButtonPrimary asChild>
            <Link href="/expenses/new">
              <PlusIcon className="size-3.5" />
              Add expense
            </Link>
          </FrappeButtonPrimary>
        </PermissionGate>
      }
    >
      <PermissionGate permission="expense.read" showDenied>
        <ListSummaryCards
          items={[
            {
              label: "Expenses",
              value: meta.total.toLocaleString(),
              icon: ReceiptIcon,
              tone: "slate",
            },
            {
              label: "Total amount",
              value: formatMoney(totals?.amount ?? 0),
              icon: BanknoteIcon,
              tone: "coral",
            },
          ]}
        />
        <DataCardTable
          storageKey="expenses-list"
          rows={rows}
          loading={loading}
          filters={
            <ListSearchField
              value={search}
              onChange={setSearch}
              placeholder="Search expenses..."
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
              <FilterField label="Category">
                <Select
                  value={categoryId || "__all__"}
                  onValueChange={(v) =>
                    setCategoryId(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All categories</SelectItem>
                    {(categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="Bank account">
                <Select
                  value={bankAccountId || "__all__"}
                  onValueChange={(v) =>
                    setBankAccountId(v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-xl">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All accounts</SelectItem>
                    {bankAccountsForSelect(banks ?? []).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {formatBankAccountLabel(b)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </TableFiltersSheet>
          }
          emptyTitle="No expenses"
          pagination={{
            meta,
            onPageChange: setPage,
            onLimitChange: setLimit,
            disabled: loading,
          }}
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (r) => formatDate(r.expenseDate),
            },
            {
              key: "category",
              header: "Category",
              cell: (r) => r.category?.name ?? "—",
            },
            {
              key: "desc",
              header: "Description",
              cell: (r) => r.description ?? "—",
            },
            {
              key: "amount",
              header: "Amount",
              className: "text-right",
              cell: (r) => formatMoney(r.amount),
            },
            {
              key: "actions",
              header: "",
              className: "w-16 text-right",
              cell: (r) => (
                <PermissionGate permission="expense.write">
                  <DeleteExpenseButton id={r.id} onSuccess={reload} />
                </PermissionGate>
              ),
            },
          ]}
        />
      </PermissionGate>
    </AppShell>
  );
}

function DeleteExpenseButton({
  id,
  onSuccess,
}: {
  id: string;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this expense? Bank balance may be adjusted.")) return;
    setDeleting(true);
    try {
      await api(`/expenses/${id}`, { method: "DELETE" });
      toast.success("Expense deleted");
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-destructive"
      disabled={deleting}
      onClick={handleDelete}
    >
      <Trash2Icon className="size-4" />
      <span className="sr-only">Delete</span>
    </Button>
  );
}
