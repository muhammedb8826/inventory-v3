"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuickSupplierDialog } from "@/components/suppliers/quick-supplier-dialog";
import { QuickLocationDialog } from "@/components/locations/quick-location-dialog";
import { QuickBankAccountDialog } from "@/components/banks/quick-bank-account-dialog";
import { QuickStockItemDialog } from "@/components/inventory/quick-stock-item-dialog";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import { SearchSelect } from "@/components/shared/search-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormGrid,
  PageForm,
  PageFormActions,
  PageFormCancel,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { api } from "@/lib/api";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { apiList } from "@/lib/list-response";
import { fetchInventoryForLocation } from "@/lib/inventory-fetch";
import { creditHasPayments, needsBankAccount } from "@/lib/document-utils";
import {
  bankAccountSelectOptions,
  bankAccountsUrl,
  bankAccountTypeForPayment,
  paymentAccountFieldLabel,
  resolveBankAccountId,
  showsPaymentAccountPicker,
} from "@/lib/bank-accounts";
import {
  bankAccountValidationError,
  onPaymentMethodChange,
  useAutoPaymentAccount,
} from "@/hooks/use-payment-bank-account";
import { buildItemOptionMap, itemOptionsFromMap, parseDocumentLines, productItemId, resolveItem, type DocumentLineBody } from "@/lib/inventory-items";
import { errorMessage } from "@/lib/format";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/form-select-options";
import { fetchSuppliers, partySelectOptions } from "@/lib/party-fetch";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import type {
  BankAccount,
  Item,
  Location,
  MaterialRequirements,
  PaymentMethod,
  ProductionOrder,
  Purchase,
  StockRecord,
  Supplier,
} from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface LineRow {
  itemId: string;
  quantity: string;
  unitPrice: string;
  lotNumber?: string;
  expiryDate?: string;
  item?: Item;
}

function linesFromPurchase(purchase: Purchase): LineRow[] {
  const rows = (purchase.lines ?? []).map((l) => {
    const itemId = productItemId({ itemId: l.itemId, item: l.item });
    return {
      itemId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lotNumber: "",
      expiryDate: "",
      item: l.item ? resolveItem(itemId, l.item) : undefined,
    };
  });
  return rows.length > 0
    ? rows
    : [{ itemId: "", quantity: "1", unitPrice: "", lotNumber: "", expiryDate: "" }];
}

export function PurchaseForm({
  purchase,
  productionOrderId,
}: {
  purchase?: Purchase;
  /** Prefill short BOM lines from a production work order (shortage → buy). */
  productionOrderId?: string;
}) {
  const router = useRouter();
  const isEdit = !!purchase?.id;
  const notesOnly = isEdit && creditHasPayments(purchase?.supplierCredit);

  const [supplierId, setSupplierId] = useState(purchase?.supplierId ?? "");
  const [locationId, setLocationId] = useState(purchase?.locationId ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    purchase?.paymentMethod ?? "CASH"
  );
  const [bankAccountId, setBankAccountId] = useState(
    purchase?.bankAccountId ?? ""
  );
  const [creditDueDate, setCreditDueDate] = useState(
    purchase?.creditDueDate?.slice(0, 10) ?? ""
  );
  const [notes, setNotes] = useState(purchase?.notes ?? "");
  const [lines, setLines] = useState<LineRow[]>(() =>
    purchase
      ? linesFromPurchase(purchase)
      : [{ itemId: "", quantity: "1", unitPrice: "", lotNumber: "", expiryDate: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [mtoPrefillDone, setMtoPrefillDone] = useState(false);

  const { data: mtoOrder, loading: mtoOrderLoading } = useFetch(
    () =>
      !isEdit && productionOrderId
        ? api<ProductionOrder>(`/production-orders/${productionOrderId}`)
        : Promise.resolve(null),
    [productionOrderId, isEdit],
  );
  const { data: mtoRequirements, loading: mtoReqLoading } = useFetch(
    () =>
      !isEdit && productionOrderId
        ? api<MaterialRequirements>(
            `/production-orders/${productionOrderId}/material-requirements`,
          )
        : Promise.resolve(null),
    [productionOrderId, isEdit],
  );

  useEffect(() => {
    if (isEdit || !productionOrderId || mtoPrefillDone) return;
    if (!mtoOrder || !mtoRequirements) return;

    const shortLines = mtoRequirements.lines.filter(
      (l) => parseFloat(l.shortage) > 0,
    );
    const label = mtoOrder.orderNumber
      ? `PO ${mtoOrder.orderNumber}`
      : `production ${mtoOrder.id.slice(0, 8)}`;

    setLocationId(mtoOrder.locationId);
    setNotes((prev) =>
      prev.trim()
        ? prev
        : `Material shortage for ${label} — buy to cover BOM before release`,
    );
    if (shortLines.length) {
      setLines(
        shortLines.map((l) => ({
          itemId: l.componentItemId,
          quantity: l.shortage,
          unitPrice: "",
          lotNumber: "",
          expiryDate: "",
          item: {
            id: l.componentItemId,
            sku: l.sku ?? undefined,
            description: l.description ?? undefined,
          } as Item,
        })),
      );
    }
    setMtoPrefillDone(true);
  }, [
    isEdit,
    productionOrderId,
    mtoOrder,
    mtoRequirements,
    mtoPrefillDone,
  ]);

  const {
    data: suppliers,
    loading: suppliersLoading,
    reload: reloadSuppliers,
    setData: setSuppliers,
  } = useFetch(() => fetchSuppliers(), []);
  const {
    data: locations,
    loading: locationsLoading,
    reload: reloadLocations,
    setData: setLocations,
  } = useLocations();
  const paymentAccountType = bankAccountTypeForPayment(paymentMethod);
  const {
    data: banks,
    loading: banksLoading,
    reload: reloadBanks,
    setData: setBanks,
  } = useFetch(
    () =>
      paymentAccountType
        ? apiList<BankAccount>(bankAccountsUrl(paymentAccountType))
        : Promise.resolve([]),
    [paymentAccountType]
  );

  useAutoPaymentAccount(
    paymentMethod,
    banks,
    bankAccountId,
    setBankAccountId
  );

  const {
    data: stock,
    loading: stockLoading,
    reload: reloadStock,
    setData: setStock,
  } = useFetch(
    () =>
      locationId
        ? fetchInventoryForLocation(locationId)
        : Promise.resolve([]),
    [locationId]
  );

  const stockItems = stock ?? [];
  const itemMap = buildItemOptionMap(
    stockItems,
    [...lines, ...(purchase?.lines ?? [])]
  );
  const itemOptions = itemOptionsFromMap(itemMap);

  const supplierOptions = partySelectOptions(
    suppliers ?? [],
    supplierId,
    purchase?.supplier
  );

  const dataLoading =
    (suppliers === null && suppliersLoading) ||
    (locations === null && locationsLoading) ||
    (banks === null && banksLoading) ||
    Boolean(productionOrderId && !isEdit && (mtoOrderLoading || mtoReqLoading));

  // Fill unit prices from stock at the receive location once inventory loads.
  useEffect(() => {
    if (isEdit || !mtoPrefillDone || !stock?.length) return;
    setLines((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (!row.itemId || (row.unitPrice && parseFloat(row.unitPrice) > 0)) {
          return row;
        }
        const match = stock.find(
          (s) => productItemId(s) === row.itemId || s.itemId === row.itemId,
        );
        const price = match?.purchasePrice ?? match?.item?.purchasePrice;
        if (!price) return row;
        changed = true;
        return {
          ...row,
          unitPrice: String(price),
          item: row.item ?? resolveItem(row.itemId, match.item),
        };
      });
      return changed ? next : prev;
    });
  }, [stock, isEdit, mtoPrefillDone]);

  function onSupplierCreated(supplier: Supplier) {
    setSuppliers((prev) => [...(prev ?? []), supplier]);
    setSupplierId(supplier.id);
    reloadSuppliers();
  }

  function onLocationCreated(location: Location) {
    setLocations((prev) => [...(prev ?? []), location]);
    setLocationId(location.id);
    reloadLocations();
  }

  function onBankCreated(account: BankAccount) {
    setBanks((prev) => [...(prev ?? []), account]);
    setBankAccountId(account.id);
    reloadBanks();
  }

  function onStockCreated(record: StockRecord) {
    setStock((prev) => [...(prev ?? []), record]);
    reloadStock();
    const emptyIdx = lines.findIndex((l) => !l.itemId);
    const idx = emptyIdx >= 0 ? emptyIdx : 0;
    updateLine(idx, {
      itemId: productItemId(record),
      unitPrice: record.purchasePrice,
      item: resolveItem(productItemId(record), record.item),
    });
  }

  function updateLine(i: number, patch: Partial<LineRow>) {
    setLines((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    );
  }

  function buildBody(documentLines: DocumentLineBody[]): Record<string, unknown> {
    const body: Record<string, unknown> = {
      supplierId,
      locationId,
      paymentMethod,
      notes: notes || undefined,
      lines: documentLines,
    };
    if (needsBankAccount(paymentMethod)) {
      body.bankAccountId = resolveBankAccountId(
        paymentMethod,
        banks,
        bankAccountId
      );
    }
    if (paymentMethod === "CREDIT" && creditDueDate) {
      body.creditDueDate = creditDueDate;
    }
    return body;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const resolvedBankId = resolveBankAccountId(
      paymentMethod,
      banks,
      bankAccountId
    );
    const bankError = bankAccountValidationError(
      paymentMethod,
      banks,
      resolvedBankId
    );
    if (bankError) {
      toast.error(bankError);
      return;
    }
    let body: Record<string, unknown>;
    if (notesOnly) {
      body = { notes: notes || undefined };
    } else {
      const parsedLines = parseDocumentLines(lines);
      if ("error" in parsedLines) {
        toast.error(parsedLines.error);
        return;
      }
      body = buildBody(parsedLines.lines);
    }
    setSaving(true);
    try {
      if (isEdit && purchase) {
        await api<Purchase>(`/purchases/${purchase.id}`, {
          method: "PATCH",
          body,
        });
        toast.success("Purchase updated");
        router.push(`/purchases/${purchase.id}`);
      } else {
        const created = await api<Purchase>("/purchases", {
          method: "POST",
          body,
          idempotent: true,
        });
        toast.success("Purchase recorded");
        requestNotificationsRefresh();
        router.push(`/purchases/${created.id}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (dataLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    );
  }

  const cancelHref =
    isEdit && purchase ? `/purchases/${purchase.id}` : "/purchases";

  return (
    <PageForm onSubmit={handleSubmit}>
      {productionOrderId && !isEdit ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          Prefilling short materials from{" "}
          <Link
            href={`/production-orders/${productionOrderId}`}
            className="font-medium underline underline-offset-2"
          >
            production order
          </Link>
          . Pick a supplier and confirm prices, then receive into the issue
          location so planners can release.
        </div>
      ) : null}
      {notesOnly ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Supplier credit has payments — only notes can be changed.
        </div>
      ) : null}

      <PageFormCard>
        <PageFormSection
          title="Supplier & payment"
          description="Receiving location and how this purchase is paid"
        >
          <FormGrid>
            <EntitySelectField
              label="Supplier"
              required={!notesOnly}
              fullWidth
              value={supplierId}
              onValueChange={setSupplierId}
              options={supplierOptions}
              searchPlaceholder="Search by name, phone, or email…"
              listHref="/suppliers"
              listLabel="All suppliers"
              emptyMessage="Create a supplier to record this purchase."
              quickCreate={
                notesOnly ? undefined : (
                  <QuickSupplierDialog onCreated={onSupplierCreated} />
                )
              }
              disabled={notesOnly}
            />
            <EntitySelectField
              label="Location"
              required={!notesOnly}
              value={locationId}
              onValueChange={setLocationId}
              options={(locations ?? []).map((l) => ({
                id: l.id,
                label: `${l.name} (${l.type})`,
              }))}
              listHref="/locations"
              listLabel="All locations"
              emptyMessage="Add a warehouse or showroom to receive stock."
              quickCreate={
                notesOnly ? undefined : (
                  <QuickLocationDialog onCreated={onLocationCreated} />
                )
              }
              disabled={notesOnly}
            />
            <FormField label="Payment method" required={!notesOnly}>
              <SearchSelect
                value={paymentMethod}
                onValueChange={(v) =>
                  onPaymentMethodChange(
                    v as PaymentMethod,
                    setPaymentMethod,
                    setBankAccountId,
                  )
                }
                options={PAYMENT_METHOD_OPTIONS}
                searchPlaceholder="Search payment method…"
                disabled={notesOnly}
              />
            </FormField>
            {showsPaymentAccountPicker(paymentMethod, banks) ? (
              <EntitySelectField
                label={paymentAccountFieldLabel(paymentMethod)}
                required={!notesOnly}
                value={bankAccountId}
                onValueChange={setBankAccountId}
                options={bankAccountSelectOptions(banks ?? [], bankAccountId)}
                listHref="/banks"
                listLabel="All accounts"
                emptyMessage={
                  paymentMethod === "CASH"
                    ? "Create a cash till (CASH account type) under Bank."
                    : "Create a bank account (BANK account type) under Bank."
                }
                quickCreate={
                  notesOnly ? undefined : (
                    <QuickBankAccountDialog
                      defaultAccountType={
                        paymentMethod === "CASH" ? "CASH" : "BANK"
                      }
                      onCreated={onBankCreated}
                    />
                  )
                }
                disabled={notesOnly}
              />
            ) : paymentMethod === "CREDIT" ? (
              <FormField label="Credit due date">
                <Input
                  className="h-10"
                  type="date"
                  value={creditDueDate}
                  onChange={(e) => setCreditDueDate(e.target.value)}
                  disabled={notesOnly}
                />
              </FormField>
            ) : (
              <div className="hidden sm:block" />
            )}
            <FormField label="Notes" className="sm:col-span-2">
              <Input
                className="h-10"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional reference"
              />
            </FormField>
          </FormGrid>
        </PageFormSection>

        {!notesOnly ? (
          <PageFormSection
            title="Items"
            description={
              locationId
                ? stockLoading
                  ? "Loading stock at location…"
                  : `${itemOptions.length} item(s) available`
                : "Select a location first"
            }
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <QuickStockItemDialog
                locationId={locationId}
                onCreated={onStockCreated}
                disabled={!locationId}
              />
              <Link
                href={locationId ? `/inventory` : "#"}
                onClick={(e) => {
                  if (!locationId) e.preventDefault();
                }}
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
              >
                Stock ledger
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border">
              <div className="hidden grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_8rem_2.5rem] gap-2 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
                <span>Item</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Lot</span>
                <span>Expiry</span>
                <span className="sr-only">Remove</span>
              </div>
              <div className="divide-y">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_8rem_2.5rem] sm:items-center"
                  >
                    <ItemSearchSelect
                      value={line.itemId}
                      onValueChange={(v) => {
                        const item = itemMap.get(v);
                        updateLine(i, { itemId: v, item });
                      }}
                      options={itemOptions}
                      disabled={!locationId || stockLoading}
                      placeholder="Item"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="h-10"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(i, { quantity: e.target.value })
                      }
                      required
                    />
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="h-10"
                      value={line.unitPrice}
                      onChange={(e) =>
                        updateLine(i, { unitPrice: e.target.value })
                      }
                      required
                    />
                    <Input
                      className="h-10"
                      placeholder="Lot #"
                      value={line.lotNumber ?? ""}
                      onChange={(e) =>
                        updateLine(i, { lotNumber: e.target.value })
                      }
                    />
                    <Input
                      type="date"
                      className="h-10"
                      value={line.expiryDate ?? ""}
                      onChange={(e) =>
                        updateLine(i, { expiryDate: e.target.value })
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-9 text-muted-foreground hover:text-destructive"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      aria-label="Remove line"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="border-t bg-muted/20 px-3 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={() =>
                    setLines((prev) => [
                      ...prev,
                      {
                        itemId: "",
                        quantity: "1",
                        unitPrice: "",
                        lotNumber: "",
                        expiryDate: "",
                      },
                    ])
                  }
                >
                  <PlusIcon className="size-4" />
                  Add row
                </Button>
              </div>
            </div>
          </PageFormSection>
        ) : null}
      </PageFormCard>

      <PageFormActions>
        <PageFormCancel href={cancelHref} />
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? <Spinner className="size-4" /> : "Save"}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
