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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/shared/search-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { fetchCustomers, fetchSuppliers } from "@/lib/party-fetch";
import {
  bankAccountsForSelect,
  formatBankAccountLabel,
} from "@/lib/bank-accounts";
import { creditBalance } from "@/lib/document-utils";
import {
  buildCreditsCustomersListPath,
  buildCreditsSuppliersListPath,
} from "@/lib/list-query";
import { formatMoney, formatDate, errorMessage } from "@/lib/format";
import { ListSummaryCards } from "@/components/shared/list-summary-cards";
import type {
  BankAccount,
  CreditListTotals,
  CreditRecord,
  CreditSource,
  CreditStatus,
} from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import {
  CircleDollarSignIcon,
  PlusIcon,
  ScaleIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function creditSourceLabel(r: CreditRecord, partyKey: "customer" | "supplier") {
  if (r.source === "OPENING") return "Opening";
  if (r.source === "PURCHASE" || partyKey === "supplier") return "Purchase";
  return "Sale";
}

function creditStatusBadge(status: CreditStatus) {
  const variant =
    status === "PAID"
      ? "secondary"
      : status === "PARTIAL"
        ? "outline"
        : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}

function isCreditOverdue(record: CreditRecord): boolean {
  if (record.status === "PAID" || !record.dueDate) return false;
  const due = new Date(record.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function creditColumns(
  partyKey: "customer" | "supplier",
  onSuccess: () => void,
) {
  const sourceKey = partyKey === "customer" ? "sale" : "purchase";
  const sourceLabel = partyKey === "customer" ? "Sale" : "Purchase";
  const sourceHref = (r: CreditRecord) => {
    const id =
      partyKey === "customer"
        ? (r.saleId ?? r.sale?.id)
        : (r.purchaseId ?? r.purchase?.id);
    if (!id) return null;
    return partyKey === "customer" ? `/sales/${id}` : `/purchases/${id}`;
  };

  return [
    {
      key: "party",
      header: partyKey === "customer" ? "Customer" : "Supplier",
      cell: (r: CreditRecord) => {
        const party = partyKey === "customer" ? r.customer : r.supplier;
        if (!party?.name) return "—";
        return (
          <div className="min-w-0">
            <div className="font-medium text-[var(--frappe-text)]">
              {party.name}
            </div>
            {party.phone ? (
              <div className="text-xs text-[var(--frappe-text-muted)]">
                {party.phone}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: sourceKey,
      header: sourceLabel,
      cell: (r: CreditRecord) => {
        const href = sourceHref(r);
        const doc = partyKey === "customer" ? r.sale : r.purchase;
        if (!href) return "—";
        return (
          <Link
            href={href}
            className="font-medium text-[var(--frappe-primary)] hover:underline"
          >
            {doc?.createdAt
              ? formatDate(doc.createdAt)
              : href.split("/").pop()?.slice(0, 8) + "…"}
          </Link>
        );
      },
    },
    {
      key: "createdAt",
      header: "Credit date",
      cell: (r: CreditRecord) => formatDate(r.createdAt),
    },
    {
      key: "source",
      header: "Source",
      cell: (r: CreditRecord) => (
        <div className="min-w-0">
          <Badge variant={r.source === "OPENING" ? "secondary" : "outline"}>
            {creditSourceLabel(r, partyKey)}
          </Badge>
          {r.reference ? (
            <div className="mt-0.5 text-xs text-[var(--frappe-text-muted)]">
              {r.reference}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "dueDate",
      header: "Due date",
      cell: (r: CreditRecord) => (
        <span
          className={cn(
            isCreditOverdue(r) && "font-medium text-[var(--frappe-red)]",
          )}
        >
          {formatDate(r.dueDate)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (r: CreditRecord) => formatMoney(r.amount),
    },
    {
      key: "paid",
      header: "Paid",
      className: "text-right",
      cell: (r: CreditRecord) => formatMoney(r.paidAmount),
    },
    {
      key: "balance",
      header: "Balance",
      className: "text-right",
      cell: (r: CreditRecord) => formatMoney(creditBalance(r)),
    },
    {
      key: "status",
      header: "Status",
      cell: (r: CreditRecord) => creditStatusBadge(r.status),
    },
    {
      key: "pay",
      header: "",
      cell: (r: CreditRecord) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === "PAID" ? null : (
            <PermissionGate permission="credit.write">
              <PaymentButton type={partyKey} credit={r} onSuccess={onSuccess} />
            </PermissionGate>
          )}
          {r.source === "OPENING" ? (
            <PermissionGate permission="credit.write">
              <DeleteOpeningCreditButton
                type={partyKey}
                credit={r}
                onSuccess={onSuccess}
              />
            </PermissionGate>
          ) : null}
        </div>
      ),
    },
  ];
}

export default function CreditsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CreditStatus | "">("");
  const [source, setSource] = useState<CreditSource | "">("");
  const [tab, setTab] = useState<"customers" | "suppliers">("customers");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  function handleTabChange(next: "customers" | "suppliers") {
    setTab(next);
    // SALE only applies to customers, PURCHASE only to suppliers.
    if (
      (next === "suppliers" && source === "SALE") ||
      (next === "customers" && source === "PURCHASE")
    ) {
      setSource("");
    }
  }

  const customerList = usePaginatedList<CreditRecord, CreditListTotals>(
    (page, limit) =>
      buildCreditsCustomersListPath(
        {
          from: from || undefined,
          to: to || undefined,
          search: debouncedSearch || undefined,
          status: status || undefined,
          source: source || undefined,
        },
        page,
        limit,
      ),
    [from, to, debouncedSearch, status, source],
  );
  const supplierList = usePaginatedList<CreditRecord, CreditListTotals>(
    (page, limit) =>
      buildCreditsSuppliersListPath(
        {
          from: from || undefined,
          to: to || undefined,
          search: debouncedSearch || undefined,
          status: status || undefined,
          source: source || undefined,
        },
        page,
        limit,
      ),
    [from, to, debouncedSearch, status, source],
  );

  const reloadAll = () => {
    customerList.reload();
    supplierList.reload();
  };

  const activeFilterCount = useMemo(
    () => countActiveFilters([from, to, status, source]),
    [from, to, status, source],
  );

  function resetFilters() {
    setFrom("");
    setTo("");
    setStatus("");
    setSource("");
  }

  const creditsFilterToolbar = (
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
      <FilterField label="Status">
        <Select
          value={status || "__all__"}
          onValueChange={(v) =>
            setStatus(v === "__all__" ? "" : (v as CreditStatus))
          }
        >
          <SelectTrigger className="h-10 w-full rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label="Source">
        <Select
          value={source || "__all__"}
          onValueChange={(v) =>
            setSource(v === "__all__" ? "" : (v as CreditSource))
          }
        >
          <SelectTrigger className="h-10 w-full rounded-xl">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All sources</SelectItem>
            <SelectItem value={tab === "customers" ? "SALE" : "PURCHASE"}>
              {tab === "customers" ? "From sale" : "From purchase"}
            </SelectItem>
            <SelectItem value="OPENING">Opening balance</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
    </TableFiltersSheet>
  );

  return (
    <AppShell
      title="Credits"
      actions={
        <PermissionGate permission="credit.write">
          <OpeningCreditDialog
            type={tab === "customers" ? "customer" : "supplier"}
            onSuccess={reloadAll}
          />
        </PermissionGate>
      }
    >
      <PermissionGate permission="credit.read" showDenied>
        <Tabs
          value={tab}
          onValueChange={(v) => handleTabChange(v as "customers" | "suppliers")}
        >
          <TabsList>
            <TabsTrigger value="customers">Customer credit</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier credit</TabsTrigger>
          </TabsList>
          <TabsContent value="customers" className="mt-4">
            <ListSummaryCards
              items={[
                {
                  label: "Credits",
                  value: customerList.meta.total.toLocaleString(),
                  icon: CircleDollarSignIcon,
                  tone: "slate",
                },
                {
                  label: "Amount",
                  value: formatMoney(customerList.totals?.amount ?? 0),
                  icon: WalletIcon,
                  tone: "sky",
                },
                {
                  label: "Paid",
                  value: formatMoney(customerList.totals?.paidAmount ?? 0),
                  icon: WalletIcon,
                  tone: "teal",
                },
                {
                  label: "Balance",
                  value: formatMoney(customerList.totals?.balance ?? 0),
                  icon: ScaleIcon,
                  tone: "amber",
                },
              ]}
            />
            <DataCardTable
              storageKey="credits-list"
              rows={customerList.rows}
              loading={customerList.loading}
              filters={
                <ListSearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search credits..."
                />
              }
              toolbar={creditsFilterToolbar}
              emptyTitle="No customer credits"
              pagination={{
                meta: customerList.meta,
                onPageChange: customerList.setPage,
                onLimitChange: customerList.setLimit,
                disabled: customerList.loading,
              }}
              columns={creditColumns("customer", reloadAll)}
            />
          </TabsContent>
          <TabsContent value="suppliers" className="mt-4">
            <ListSummaryCards
              items={[
                {
                  label: "Credits",
                  value: supplierList.meta.total.toLocaleString(),
                  icon: CircleDollarSignIcon,
                  tone: "slate",
                },
                {
                  label: "Amount",
                  value: formatMoney(supplierList.totals?.amount ?? 0),
                  icon: WalletIcon,
                  tone: "sky",
                },
                {
                  label: "Paid",
                  value: formatMoney(supplierList.totals?.paidAmount ?? 0),
                  icon: WalletIcon,
                  tone: "teal",
                },
                {
                  label: "Balance",
                  value: formatMoney(supplierList.totals?.balance ?? 0),
                  icon: ScaleIcon,
                  tone: "amber",
                },
              ]}
            />
            <DataCardTable
              storageKey="credits-secondary"
              rows={supplierList.rows}
              loading={supplierList.loading}
              filters={
                <ListSearchField
                  value={search}
                  onChange={setSearch}
                  placeholder="Search credits..."
                />
              }
              toolbar={creditsFilterToolbar}
              emptyTitle="No supplier credits"
              pagination={{
                meta: supplierList.meta,
                onPageChange: supplierList.setPage,
                onLimitChange: supplierList.setLimit,
                disabled: supplierList.loading,
              }}
              columns={creditColumns("supplier", reloadAll)}
            />
          </TabsContent>
        </Tabs>
      </PermissionGate>
    </AppShell>
  );
}

function PaymentButton({
  type,
  credit,
  onSuccess,
}: {
  type: "customer" | "supplier";
  credit: CreditRecord;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const outstanding = creditBalance(credit);
  const party =
    type === "customer" ? credit.customer?.name : credit.supplier?.name;
  const { data: banks } = useFetch(
    () => apiList<BankAccount>("/banks/accounts"),
    [],
  );

  function handleOpen() {
    setAmount(outstanding);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const path =
        type === "customer"
          ? `/credits/customers/${credit.id}/payments`
          : `/credits/suppliers/${credit.id}/payments`;
      await api(path, {
        method: "POST",
        body: { amount: parseFloat(amount), bankAccountId },
      });
      toast.success("Payment recorded");
      setOpen(false);
      setAmount("");
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        Pay
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setAmount("");
        }}
      >
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {party ? (
                <p className="text-sm text-[var(--frappe-text-muted)]">
                  {type === "customer" ? "Customer" : "Supplier"}:{" "}
                  <span className="font-medium text-[var(--frappe-text)]">
                    {party}
                  </span>
                </p>
              ) : null}
              <p className="text-sm text-[var(--frappe-text-muted)]">
                Outstanding balance:{" "}
                <span className="font-medium tabular-nums text-[var(--frappe-text)]">
                  {formatMoney(outstanding)}
                </span>
                {credit.dueDate ? (
                  <> · Due {formatDate(credit.dueDate)}</>
                ) : null}
              </p>
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max={outstanding}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Bank account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccountsForSelect(banks ?? [], bankAccountId).map(
                      (b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {formatBankAccountLabel(b)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving || !bankAccountId}>
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OpeningCreditDialog({
  type,
  onSuccess,
}: {
  type: "customer" | "supplier";
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [partyId, setPartyId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: parties, loading: partiesLoading } = useFetch(
    () => (type === "customer" ? fetchCustomers() : fetchSuppliers()),
    [type],
  );

  const partyOptions = (parties ?? []).map((p) => ({
    value: p.id,
    label: p.phone ? `${p.name} · ${p.phone}` : p.name,
  }));

  function resetForm() {
    setPartyId("");
    setAmount("");
    setDueDate("");
    setReference("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    setSaving(true);
    try {
      const path =
        type === "customer" ? "/credits/customers" : "/credits/suppliers";
      await api(path, {
        method: "POST",
        body: {
          [type === "customer" ? "customerId" : "supplierId"]: partyId,
          amount: parsedAmount,
          dueDate: dueDate || undefined,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      toast.success(
        type === "customer"
          ? "Opening receivable added"
          : "Opening payable added",
      );
      setOpen(false);
      resetForm();
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const label = type === "customer" ? "customer" : "supplier";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon />
          Opening {type === "customer" ? "receivable" : "payable"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              New opening {type === "customer" ? "receivable" : "payable"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-[var(--frappe-text-muted)]">
              Carry over an unpaid invoice from a previous system. No stock or
              cash movement until you record a payment.
            </p>
            <div className="grid gap-2">
              <Label>
                {type === "customer" ? "Customer" : "Supplier"}{" "}
                <span className="text-[var(--frappe-red)]">*</span>
              </Label>
              <SearchSelect
                value={partyId}
                onValueChange={setPartyId}
                options={partyOptions}
                placeholder={`Select ${label}…`}
                searchPlaceholder={`Search ${label}…`}
                emptyMessage={`No ${label}s found.`}
                loading={partiesLoading}
                disabled={partiesLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label>
                Amount <span className="text-[var(--frappe-red)]">*</span>
              </Label>
              <Input
                type="number"
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="12500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Reference</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Prior-system invoice number"
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional context for this balance"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !partyId}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteOpeningCreditButton({
  type,
  credit,
  onSuccess,
}: {
  type: "customer" | "supplier";
  credit: CreditRecord;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const ok = confirm(
      "Delete this opening credit? Only unpaid opening balances can be removed.",
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const path =
        type === "customer"
          ? `/credits/customers/${credit.id}`
          : `/credits/suppliers/${credit.id}`;
      await api(path, { method: "DELETE" });
      toast.success("Opening credit deleted");
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
      size="icon"
      variant="ghost"
      className="size-8 text-destructive"
      disabled={deleting}
      onClick={handleDelete}
      aria-label="Delete opening credit"
    >
      <Trash2Icon className="size-4" />
    </Button>
  );
}
