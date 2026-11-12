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
import { CameraIcon, PlusIcon, StarIcon } from "lucide-react";
import {
  ProductSmartButtons,
  useProductSmartStats,
} from "@/components/inventory/product-smart-buttons";
import { UnitSelect } from "@/components/inventory/unit-select";
import { RecordActivity } from "@/components/shared/record-metadata";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
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
import { requestNotificationsRefresh } from "@/lib/notification-events";
import { hasPermission } from "@/lib/permissions";
import type {
  Item,
  ItemType,
  StockRecord,
  UnitOfMeasure,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type OdooProductType = "goods" | "service" | "combo";
type InvoicingPolicy = "ordered" | "delivered";

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

function productTypeFromItem(item?: OdooCatalogItem | null): OdooProductType {
  if (!item) return "goods";
  if (item.isPhantom) return "combo";
  if (item.itemType === "OTHER" && Number(item.stock?.onHand ?? 0) === 0) {
    return "goods";
  }
  return "goods";
}

function itemTypeFromProductType(type: OdooProductType): ItemType {
  if (type === "service") return "OTHER";
  if (type === "combo") return "FINISHED";
  return "FINISHED";
}

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

export function OdooProductForm({
  item,
  locationId: initialLocationId,
  reload,
}: {
  item?: OdooCatalogItem;
  locationId?: string;
  reload?: () => unknown;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = hasPermission(user, "inventory.write");
  const canPrice = hasPermission(user, "pricing.write");
  const currency = getCurrencyConfig();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(item);
  const { data: locations } = useLocations();
  const { data: units } = useFetch<UnitOfMeasure[]>(() => api("/units"), []);

  const [name, setName] = useState(item?.description ?? "");
  const [favorite, setFavorite] = useState(false);
  const [canBeSold, setCanBeSold] = useState(true);
  const [canBePurchased, setCanBePurchased] = useState(true);
  const [productType, setProductType] = useState<OdooProductType>(
    productTypeFromItem(item),
  );
  const [invoicingPolicy, setInvoicingPolicy] =
    useState<InvoicingPolicy>("ordered");
  const [trackInventory, setTrackInventory] = useState(
    productTypeFromItem(item) !== "service",
  );
  const [salesPrice, setSalesPrice] = useState(item?.salesPrice ?? "");
  const [cost, setCost] = useState(averageCost(item));
  const [sku, setSku] = useState(item?.sku ?? "");
  const [barcode, setBarcode] = useState(item?.barcode ?? "");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [unitId, setUnitId] = useState(item?.unitId ?? "");
  const [locationId, setLocationId] = useState(initialLocationId ?? "");
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
    if (!locationId && !isEdit && locations?.length) {
      setLocationId(initialLocationId || locations[0].id);
    }
  }, [locations, locationId, isEdit, initialLocationId]);

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

  useEffect(() => {
    if (productType === "service") {
      setTrackInventory(false);
    } else if (!isEdit) {
      setTrackInventory(true);
    }
  }, [productType, isEdit]);

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
  const salesTaxRate = 0.15;
  const salesPriceNum = Number(salesPrice);
  const inclTax =
    Number.isFinite(salesPriceNum) && salesPriceNum > 0
      ? salesPriceNum * (1 + salesTaxRate)
      : null;

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
    if (!item && !locationId) {
      toast.error("Select a location");
      return;
    }

    setSaving(true);
    setSkuError(null);
    try {
      const mappedType = itemTypeFromProductType(productType);
      const isPhantom = productType === "combo";
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
                  itemType:
                    productType === "goods"
                      ? (item.itemType ?? mappedType)
                      : mappedType,
                  unitId: effectiveUnitId,
                  unitGroupId: item.unitGroupId ?? null,
                  isPhantom,
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
            locationId,
            quantity: trackInventory ? 0 : 0,
            purchasePrice,
            sku: optionalStringBodyValue(sku) ?? undefined,
            barcode: optionalStringBodyValue(barcode) ?? undefined,
            unitId: effectiveUnitId,
            itemType: mappedType,
            isPhantom,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {!isEdit && (
            <Button type="button" disabled className="pointer-events-none">
              New
            </Button>
          )}
          {isEdit && canWrite && (
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
        <ProductSmartButtons
          itemId={item?.id}
          productName={name || item?.description}
          stats={stats}
          className="w-full lg:max-w-4xl lg:flex-1"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className={cn(
                    "mt-2 shrink-0 text-muted-foreground transition-colors hover:text-amber-500",
                    favorite && "text-amber-500",
                  )}
                  aria-label={favorite ? "Unstar product" : "Star product"}
                  onClick={() => setFavorite((v) => !v)}
                >
                  <StarIcon
                    className={cn("size-5", favorite && "fill-current")}
                  />
                </button>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Table"
                  disabled={!canWrite}
                  className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-3xl"
                  aria-label="Product name"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-5 pl-7">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={canBeSold}
                    onCheckedChange={(v) => setCanBeSold(v === true)}
                    disabled={!canWrite}
                  />
                  Sales
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={canBePurchased}
                    onCheckedChange={(v) => setCanBePurchased(v === true)}
                    disabled={!canWrite}
                  />
                  Purchase
                </label>
              </div>
            </div>

            <div className="shrink-0 self-start">
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
                className="group relative flex size-24 items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30 text-muted-foreground transition hover:border-primary hover:text-primary sm:size-28"
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
                    <PlusIcon className="absolute -right-2 -top-2 size-4 rounded-full bg-background" />
                  </span>
                )}
              </button>
              {displayImage && canWrite && (
                <button
                  type="button"
                  className="mt-1 block w-full text-center text-xs text-muted-foreground underline"
                  onClick={() => {
                    setImageFile(null);
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                    setRemoveImage(true);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="border-b px-4 sm:px-5">
            <div
              className="flex gap-5 overflow-x-auto text-sm"
              role="tablist"
              aria-label="Product sections"
            >
              <span
                role="tab"
                aria-selected
                className="border-b-2 border-primary py-3 font-medium text-primary"
              >
                General Information
              </span>
              <span
                role="tab"
                aria-disabled
                className="cursor-not-allowed py-3 text-muted-foreground/60"
                title="Coming soon"
              >
                Sales
              </span>
              <span
                role="tab"
                aria-disabled
                className="cursor-not-allowed py-3 text-muted-foreground/60"
                title="Coming soon"
              >
                Purchase
              </span>
              <span
                role="tab"
                aria-disabled
                className="cursor-not-allowed py-3 text-muted-foreground/60"
                title="Coming soon"
              >
                Inventory
              </span>
            </div>
          </div>

          <div className="grid gap-8 p-4 sm:p-5 lg:grid-cols-2">
            <div className="space-y-5">
              <fieldset className="space-y-2">
                <Label>Product Type</Label>
                <div className="flex flex-wrap gap-4">
                  {(
                    [
                      ["goods", "Goods"],
                      ["service", "Service"],
                      ["combo", "Combo"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="productType"
                        value={value}
                        checked={productType === value}
                        disabled={!canWrite || Boolean(item?.productFamilyId)}
                        onChange={() => setProductType(value)}
                        className="size-4 accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="invoicing-policy">Invoicing Policy</Label>
                <NativeSelect
                  id="invoicing-policy"
                  value={invoicingPolicy}
                  disabled={!canWrite}
                  onChange={(e) =>
                    setInvoicingPolicy(e.target.value as InvoicingPolicy)
                  }
                >
                  <option value="ordered">Ordered quantities</option>
                  <option value="delivered">Delivered quantities</option>
                </NativeSelect>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
                <Label htmlFor="track-inventory" className="cursor-pointer">
                  Track Inventory
                </Label>
                <Switch
                  id="track-inventory"
                  checked={trackInventory}
                  disabled={!canWrite || productType === "service"}
                  onCheckedChange={setTrackInventory}
                  className="data-checked:bg-emerald-600"
                />
              </div>

              {trackInventory && (
                <div className="space-y-1">
                  <Label>Quantity On Hand</Label>
                  {isEdit ? (
                    <Link
                      href={`/inventory?search=${encodeURIComponent(name || item?.description || "")}`}
                      className="block text-base font-medium text-primary tabular-nums hover:underline"
                    >
                      {formatQty(onHand)}
                    </Link>
                  ) : (
                    <p className="text-base tabular-nums text-muted-foreground">
                      0.00
                    </p>
                  )}
                </div>
              )}

              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="create-location">Location</Label>
                  <NativeSelect
                    id="create-location"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    required
                  >
                    <option value="">Select location</option>
                    {(locations ?? []).map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}

              <div className="space-y-2">
                <Label>Unit of Measure</Label>
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
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sales-price">Sales Price</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[10rem] flex-1">
                    <Input
                      id="sales-price"
                      type="number"
                      min="0"
                      step="any"
                      value={salesPrice}
                      disabled={!canWrite || !canPrice}
                      onChange={(e) => setSalesPrice(e.target.value)}
                      className="pr-12"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                      {currency.symbol}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    per {unitSymbol}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Sales Taxes</Label>
                <div className="flex min-h-11 items-center rounded-md border bg-muted/20 px-3 text-sm text-muted-foreground">
                  <span className="rounded bg-muted px-2 py-0.5 text-foreground">
                    15%
                  </span>
                </div>
                {inclTax != null && (
                  <p className="text-xs text-muted-foreground">
                    (= {formatMoney(inclTax)} Incl. Taxes)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <div className="relative">
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="any"
                    value={cost}
                    disabled={!canWrite || isEdit}
                    onChange={(e) => setCost(e.target.value)}
                    className="pr-12"
                    title={
                      isEdit
                        ? "Cost updates from purchases and stock moves"
                        : undefined
                    }
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    {currency.symbol}
                  </span>
                </div>
                {isEdit && productType !== "service" && (
                  <Link
                    href={`/boms/new?finishedItemId=${encodeURIComponent(item!.id)}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Compute Price from BoM
                  </Link>
                )}
              </div>

              <div className="space-y-1">
                <Label>Purchase Taxes</Label>
                <div className="flex min-h-11 items-center rounded-md border bg-muted/20 px-3 text-sm text-muted-foreground">
                  <span className="rounded bg-muted px-2 py-0.5 text-foreground">
                    15%
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!canWrite}
                  placeholder=""
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference</Label>
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
                {skuError && (
                  <p className="text-xs text-destructive">{skuError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  disabled={!canWrite}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </div>

          <div className="border-t p-4 sm:p-5">
            <Label htmlFor="internal-notes" className="text-xs tracking-wide text-muted-foreground">
              INTERNAL NOTES
            </Label>
            <Textarea
              id="internal-notes"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              disabled={!canWrite}
              className="mt-2 min-h-24"
              placeholder=""
            />
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-4 py-3 sm:px-5">
              <p className="text-xs text-muted-foreground">
                {isEdit ? (
                  <>
                    Need a variant from a family?{" "}
                    <Link href="/products" className="text-primary underline">
                      Product families
                    </Link>
                  </>
                ) : (
                  <>
                    Creating a variant instead?{" "}
                    <Link href="/products" className="text-primary underline">
                      Open product families
                    </Link>
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/inventory/products">Discard</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : isEdit ? "Save" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled>
              Send message
            </Button>
            <Button type="button" variant="outline" size="sm" disabled>
              Log note
            </Button>
            <Button type="button" variant="outline" size="sm" disabled>
              Activity
            </Button>
          </div>
          {item ? (
            <RecordActivity record={item} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Activity appears after the product is saved.
            </p>
          )}
        </aside>
      </div>
    </form>
  );
}
