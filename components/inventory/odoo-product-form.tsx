"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CameraIcon, HistoryIcon, PlusIcon } from "lucide-react";
import {
  ProductSmartButtons,
  useProductSmartStats,
} from "@/components/inventory/product-smart-buttons";
import { UnitSelect } from "@/components/inventory/unit-select";
import {
  FormField,
  FormGrid,
  FormSummary,
  PageForm,
  PageFormActions,
  PageFormCancel,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import {
  RecordTimestamp,
  timestampText,
  type RecordMetadata,
} from "@/components/shared/record-metadata";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getCurrencyConfig } from "@/lib/currency";
import { errorMessage, formatMoney, formatQty } from "@/lib/format";
import {
  clearStockItemImage,
  ITEM_IMAGE_ACCEPT,
  resolveItemImageUrl,
  uploadStockItemImage,
  validateItemImageFile,
} from "@/lib/inventory-media";
import { optionalStringBodyValue } from "@/lib/inventory-stock";
import { skuConflictMessage } from "@/lib/inventory-movements";
import { ITEM_TYPE_OPTIONS, itemTypeLabel } from "@/lib/item-types";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import { hasPermission } from "@/lib/permissions";
import type { Item, ItemType, StockRecord, UnitOfMeasure } from "@/lib/types";
import { toast } from "sonner";

export type OdooCatalogItem = Item & {
  stock?: {
    onHand: string;
    reserved: string;
    available: string;
    stockValue: string;
  };
  stockBalances?: StockRecord[];
  salesPrice: string | null;
  isActive: boolean;
  stockUnitLocked?: boolean;
  productFamilyId?: string;
  unitGroupId?: string;
};

function averageCost(item?: OdooCatalogItem | null): string {
  const balances = item?.stockBalances ?? [];
  if (!balances.length) return "0";
  let qty = 0;
  let value = 0;
  for (const row of balances) {
    const q = Number(row.quantity) || 0;
    const p = Number(row.purchasePrice) || 0;
    qty += q;
    value += q * p;
  }
  if (qty <= 0) {
    return balances[0]?.purchasePrice ?? "0";
  }
  return String(value / qty);
}

function AuditLogPanel({ record }: { record?: RecordMetadata | null }) {
  return (
    <section className="form-summary" aria-label="Audit log">
      <h2>
        <HistoryIcon aria-hidden className="size-4 text-primary" />
        Audit log
      </h2>
      {!record ? (
        <p className="text-sm text-muted-foreground">
          Who created or changed this product will appear here after you save.
        </p>
      ) : (
        <>
          <dl>
            <div>
              <dt>Created by</dt>
              <dd>{record.createdBy?.fullName ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt>Created at</dt>
              <dd>{timestampText(record.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated by</dt>
              <dd>{record.updatedBy?.fullName ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>
                {timestampText(record.activity?.[0]?.at ?? record.updatedAt)}
              </dd>
            </div>
          </dl>
          {!!record.activity?.length && (
            <ul className="mt-3 divide-y border-t pt-1">
              {record.activity.map((event, index) => (
                <li
                  key={`${event.at}-${index}`}
                  className="flex flex-col gap-0.5 py-2.5 text-xs"
                >
                  <span className="font-medium text-foreground">
                    {event.action}
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                    <span>{event.user.fullName ?? "Former user"}</span>
                    <RecordTimestamp value={event.at} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export function OdooProductForm({
  item,
  reload,
}: {
  item?: OdooCatalogItem;
  reload?: () => unknown;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "inventory.write");
  const canPrice = hasPermission(user, "pricing.write");
  const currency = getCurrencyConfig();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(item);
  const { data: units } = useFetch<UnitOfMeasure[]>(() => api("/units"), []);

  const [name, setName] = useState(item?.description ?? "");
  const [itemType, setItemType] = useState<ItemType>(
    item?.itemType ?? "FINISHED",
  );
  const [quantityOnHand, setQuantityOnHand] = useState("0");
  const [salesPrice, setSalesPrice] = useState(item?.salesPrice ?? "");
  const [cost, setCost] = useState(averageCost(item));
  const [sku, setSku] = useState(item?.sku ?? "");
  const [barcode, setBarcode] = useState(item?.barcode ?? "");
  const [unitId, setUnitId] = useState(item?.unitId ?? "");
  const [saving, setSaving] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const existingImage = resolveItemImageUrl(item?.imageUrl);
  const unitSymbol =
    units?.find((u) => u.id === (unitId || item?.unitId))?.symbol ??
    item?.stockUnit?.symbol ??
    "Units";

  const effectiveUnitId =
    unitId ||
    item?.unitId ||
    (!item ? units?.find((u) => u.code === "PCS")?.id : "") ||
    "";

  useEffect(() => {
    if (!unitId && !item && units?.length) {
      const pcs = units.find((u) => u.code === "PCS");
      if (pcs) setUnitId(pcs.id);
    }
  }, [units, unitId, item]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const reorderRuleCount = useMemo(() => {
    const balances = item?.stockBalances ?? [];
    return balances.filter(
      (b) => b.reorderPoint != null && String(b.reorderPoint).trim() !== "",
    ).length;
  }, [item?.stockBalances]);

  const { stats } = useProductSmartStats(
    item?.id,
    item?.stock,
    reorderRuleCount,
  );

  const onHand = Number(item?.stock?.onHand ?? 0) || 0;
  const displayImage =
    previewUrl || (!removeImage ? existingImage : null);

  function onPickImage(file: File | undefined) {
    if (!file) return;
    const err = validateItemImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    const selectedUnit = units?.find((u) => u.id === effectiveUnitId);
    if (
      !selectedUnit ||
      (!item && (!selectedUnit.isActive || selectedUnit.requiresReview))
    ) {
      toast.error("Select an active stock unit");
      return;
    }
    let openingQty = 0;
    if (!item) {
      openingQty = Number(quantityOnHand);
      if (!Number.isFinite(openingQty) || openingQty < 0) {
        toast.error("Enter a valid quantity on hand");
        return;
      }
    }

    setSaving(true);
    setSkuError(null);
    try {
      const costNum = Number(cost);
      const purchasePrice = Number.isFinite(costNum) && costNum >= 0 ? costNum : 0;

      if (item) {
        await api(`/items/${item.id}`, {
          method: "PATCH",
          body: {
            description: name.trim(),
            sku: optionalStringBodyValue(sku),
            barcode: optionalStringBodyValue(barcode),
            isActive: item.isActive,
            ...(!item.productFamilyId
              ? {
                  itemType,
                  unitId: effectiveUnitId,
                  unitGroupId: item.unitGroupId ?? null,
                  isPhantom: item.isPhantom === true,
                }
              : {}),
          },
        });

        if (canPrice) {
          await api(`/items/${item.id}/price`, {
            method: "PATCH",
            body: {
              salesPrice: salesPrice.trim() === "" ? null : Number(salesPrice),
            },
          });
        }

        if (imageFile) {
          const body = new FormData();
          body.append("file", imageFile);
          await api(`/items/${item.id}/image`, { method: "POST", body });
        } else if (removeImage && existingImage) {
          const stockId = item.stockBalances?.[0]?.id;
          if (stockId) await clearStockItemImage(stockId);
        }

        toast.success("Product updated");
        reload?.();
        router.refresh();
      } else {
        const created = await api<StockRecord>("/inventory", {
          method: "POST",
          body: {
            description: name.trim(),
            quantity: openingQty,
            purchasePrice,
            sku: optionalStringBodyValue(sku) ?? undefined,
            barcode: optionalStringBodyValue(barcode) ?? undefined,
            unitId: effectiveUnitId,
            itemType,
          },
        });

        const newItemId = created.itemId;
        if (canPrice && salesPrice.trim() !== "") {
          await api(`/items/${newItemId}/price`, {
            method: "PATCH",
            body: { salesPrice: Number(salesPrice) },
          });
        }

        if (imageFile) {
          await uploadStockItemImage(created.id, imageFile);
        }

        requestNotificationsRefresh();
        toast.success("Product created");
        router.push(`/items/${newItemId}`);
        router.refresh();
      }
    } catch (err) {
      const skuMsg = skuConflictMessage(err);
      if (skuMsg) {
        setSkuError(skuMsg);
        toast.error(skuMsg);
      } else {
        toast.error(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  const summaryQty = isEdit
    ? `${formatQty(onHand)} ${unitSymbol}`
    : `${quantityOnHand || "0"} ${unitSymbol}`;

  return (
    <PageForm
      onSubmit={handleSubmit}
      maxWidth="max-w-6xl"
      aside={
        <>
          <FormSummary
            title="Product summary"
            rows={[
              { label: "Name", value: name.trim() || null },
              { label: "Type", value: itemTypeLabel(itemType) },
              { label: "On hand", value: summaryQty },
              {
                label: "Sales price",
                value:
                  salesPrice.trim() === ""
                    ? null
                    : formatMoney(Number(salesPrice)),
              },
              {
                label: "Cost",
                value: formatMoney(Number(cost) || 0),
              },
              { label: "Reference", value: sku.trim() || null },
            ]}
            note="Stock location defaults to your main warehouse. Change stock later via purchases, transfers, or adjustments."
          />
          <AuditLogPanel record={item ?? null} />
        </>
      }
    >
      <div className="mb-4">
        <ProductSmartButtons
          itemId={item?.id}
          productName={name || item?.description}
          stats={stats}
        />
      </div>

      <PageFormCard>
        <div className="flex flex-col gap-5 border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <FormField
            label="Product name"
            required
            className="min-w-0 flex-1"
            htmlFor="product-name"
          >
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High back chair"
              disabled={!canWrite}
              className="h-12 px-4 text-lg font-semibold tracking-tight md:h-14 md:px-5 md:text-xl"
              required
            />
          </FormField>

          <div className="shrink-0 self-start sm:pt-7">
            <input
              ref={fileRef}
              type="file"
              accept={ITEM_IMAGE_ACCEPT}
              className="sr-only"
              onChange={(e) => onPickImage(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => fileRef.current?.click()}
              className="group relative flex size-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--frappe-input-border)] bg-[var(--frappe-input)] text-[var(--frappe-text-muted)] transition hover:border-[var(--frappe-primary)] hover:text-[var(--frappe-primary)] sm:size-28"
              aria-label="Upload product image"
            >
              {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImage}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="relative">
                  <CameraIcon className="size-8 opacity-60" />
                  <PlusIcon className="absolute -right-2 -top-2 size-4 rounded-full bg-[var(--frappe-surface)]" />
                </span>
              )}
            </button>
            {displayImage && canWrite && (
              <button
                type="button"
                className="mt-1.5 block w-full text-center text-xs text-[var(--frappe-text-muted)] underline-offset-2 hover:underline"
                onClick={() => {
                  setImageFile(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                  setRemoveImage(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                Remove image
              </button>
            )}
          </div>
        </div>

        <PageFormSection
          title="General Information"
          description="Core product details used across inventory, sales, and purchasing."
        >
          <FormGrid cols={2}>
            <FormField label="Product type" required className="sm:col-span-2">
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Product type"
              >
                {ITEM_TYPE_OPTIONS.map(({ value, label }) => {
                  const selected = itemType === value;
                  return (
                    <label
                      key={value}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                        selected
                          ? "border-[var(--frappe-primary)] bg-[color-mix(in_oklab,var(--frappe-primary)_10%,transparent)] text-[var(--frappe-text)] shadow-sm"
                          : "border-[var(--frappe-input-border)] bg-[var(--frappe-input)] text-[var(--frappe-text-muted)] hover:border-[var(--frappe-primary)]/40"
                      } ${!canWrite || item?.productFamilyId ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <input
                        type="radio"
                        name="itemType"
                        value={value}
                        checked={selected}
                        disabled={!canWrite || Boolean(item?.productFamilyId)}
                        onChange={() => setItemType(value)}
                        className="size-4 accent-[var(--frappe-primary)]"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </FormField>

            <FormField
              label="Quantity on hand"
              required={!isEdit}
              hint={
                isEdit
                  ? "Open stock balances to adjust quantity by location."
                  : "Opening quantity at the default warehouse."
              }
              htmlFor="quantity-on-hand"
            >
              {isEdit ? (
                <Link
                  href={`/inventory?search=${encodeURIComponent(name || item?.description || "")}`}
                  className="app-control flex h-11 items-center px-3 font-medium tabular-nums text-[var(--frappe-primary)] hover:underline"
                >
                  {formatQty(onHand)} {unitSymbol}
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    id="quantity-on-hand"
                    type="number"
                    min="0"
                    step="any"
                    value={quantityOnHand}
                    disabled={!canWrite}
                    onChange={(e) => setQuantityOnHand(e.target.value)}
                    className="tabular-nums"
                    required
                  />
                  <span className="shrink-0 text-sm text-[var(--frappe-text-muted)]">
                    {unitSymbol}
                  </span>
                </div>
              )}
            </FormField>

            <FormField label="Unit of measure" required>
              {units ? (
                <UnitSelect
                  units={units}
                  value={effectiveUnitId}
                  onChange={setUnitId}
                  disabled={
                    !canWrite ||
                    Boolean(item?.productFamilyId) ||
                    Boolean(item?.stockUnitLocked)
                  }
                />
              ) : (
                <p className="text-sm text-muted-foreground">Loading units…</p>
              )}
            </FormField>

            <FormField
              label="Sales price"
              hint={`Standard price per ${unitSymbol}`}
              htmlFor="sales-price"
            >
              <div className="relative">
                <Input
                  id="sales-price"
                  type="number"
                  min="0"
                  step="any"
                  value={salesPrice}
                  disabled={!canWrite || !canPrice}
                  onChange={(e) => setSalesPrice(e.target.value)}
                  className="pr-12 tabular-nums"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--frappe-text-muted)]">
                  {currency.symbol}
                </span>
              </div>
            </FormField>

            <FormField
              label="Cost"
              hint={
                isEdit
                  ? "Updated from purchases and stock moves."
                  : "Opening unit cost for this product."
              }
              htmlFor="cost"
            >
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="any"
                    value={cost}
                    disabled={!canWrite || isEdit}
                    onChange={(e) => setCost(e.target.value)}
                    className="pr-12 tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--frappe-text-muted)]">
                    {currency.symbol}
                  </span>
                </div>
                {isEdit && (
                  <Link
                    href={`/boms/new?finishedItemId=${encodeURIComponent(item!.id)}`}
                    className="text-xs font-medium text-[var(--frappe-primary)] hover:underline"
                  >
                    Compute price from BoM
                  </Link>
                )}
              </div>
            </FormField>

            <FormField
              label="Reference"
              hint="Internal SKU / reference code"
              error={skuError}
              htmlFor="reference"
            >
              <Input
                id="reference"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  setSkuError(null);
                }}
                disabled={!canWrite}
                aria-invalid={Boolean(skuError)}
              />
            </FormField>

            <FormField label="Barcode" htmlFor="barcode">
              <Input
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={!canWrite}
              />
            </FormField>
          </FormGrid>
        </PageFormSection>
      </PageFormCard>

      {canWrite && (
        <PageFormActions>
          <PageFormCancel href="/inventory/products" />
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save product" : "Create product"}
          </Button>
        </PageFormActions>
      )}

      <p className="mt-3 text-center text-xs text-[var(--frappe-text-muted)]">
        Need a variant from a family?{" "}
        <Link
          href="/products"
          className="font-medium text-[var(--frappe-primary)] underline-offset-2 hover:underline"
        >
          Product families
        </Link>
      </p>
    </PageForm>
  );
}
