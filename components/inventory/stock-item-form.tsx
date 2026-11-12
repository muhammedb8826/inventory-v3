"use client";
import { ItemUnitSettings } from "./item-unit-settings";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FormSummary,
  FormField,
  FormGrid,
  PageForm,
  PageFormActions,
  PageFormCancel,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import {
  clearStockItemImage,
  ITEM_IMAGE_ACCEPT,
  resolveItemImageUrl,
  uploadStockItemImage,
  validateItemImageFile,
} from "@/lib/inventory-media";
import {
  optionalStringBodyValue,
  reorderPointBodyValue,
} from "@/lib/inventory-stock";
import { ITEM_TYPE_OPTIONS } from "@/lib/item-types";
import { formatQty, formatMoney, errorMessage } from "@/lib/format";
import { skuConflictMessage } from "@/lib/inventory-movements";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import type { ItemType, StockRecord } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { StockAdjustDialog } from "@/components/inventory/stock-adjust-dialog";
import { UnitSelect } from "@/components/inventory/unit-select";
import type { UnitOfMeasure } from "@/lib/types";
import {
  resolveStockCategory,
  supportsUsableWidth,
} from "@/lib/usable-width";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";

export function StockItemForm({
  locationId: initialLocationId,
  record,
  simplified = false,
}: {
  locationId?: string;
  record?: StockRecord;
  /** Create-only: essentials first; advanced fields collapsed (Odoo-style). */
  simplified?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(record);
  const isVariant = !!record?.item.productFamilyId;
  const simpleCreate = simplified && !isEdit;
  const { data: locations, loading: locationsLoading } = useLocations();

  const [locationId, setLocationId] = useState(
    record?.locationId ?? initialLocationId ?? "",
  );
  const [description, setDescription] = useState(
    record?.item.description ?? "",
  );
  const [sku, setSku] = useState(record?.item.sku ?? "");
  const [barcode, setBarcode] = useState(record?.item.barcode ?? "");
  const {
    data: units,
    loading: unitsLoading,
    error: unitsError,
    reload: reloadUnits,
  } = useFetch<UnitOfMeasure[]>(() => api("/units"));
  const { data: unitPolicy, reload: reloadUnitPolicy } = useFetch<
    import("@/lib/types").ItemUnitOptions | null
  >(
    () =>
      record ? api(`/units/items/${record.itemId}`) : Promise.resolve(null),
    [record?.itemId, record?.quantity, record?.updatedAt],
    { enabled: !!record },
  );
  const [liveQuantity, setLiveQuantity] = useState(record?.quantity ?? "0");
  useEffect(() => {
    setLiveQuantity(record?.quantity ?? "0");
  }, [record?.quantity]);
  const { data: unitGroups } = useFetch<import("@/lib/types").UnitGroup[]>(() =>
    api("/units/groups"),
  );
  const [unitGroupId, setUnitGroupId] = useState(
    record?.item.unitGroupId ?? "",
  );
  const [unitId, setUnitId] = useState(record?.item.unitId ?? "");
  const [defaultWidth, setDefaultWidth] = useState(
    record?.item.defaultWidthMetres ?? "",
  );
  const effectiveUnitId =
    unitId || (!record ? units?.find((u) => u.code === "PCS")?.id : "") || "";
  const selectedUnit = units?.find((u) => u.id === effectiveUnitId);
  const stockCategory = resolveStockCategory({
    unitId: effectiveUnitId,
    groupId: unitGroupId,
    units,
    groups: unitGroups,
    fallbackCategory: record?.item.stockUnit?.category,
  });
  const showUsableWidth = supportsUsableWidth(stockCategory);
  useEffect(() => {
    if (!showUsableWidth && defaultWidth) setDefaultWidth("");
  }, [showUsableWidth, defaultWidth]);
  const quantityStep =
    selectedUnit?.decimalPlaces === 0
      ? "1"
      : String(10 ** -(selectedUnit?.decimalPlaces ?? 3));
  const [itemType, setItemType] = useState<ItemType | "">(
    record?.item.itemType ?? "",
  );
  const [isPhantom, setIsPhantom] = useState(record?.item.isPhantom === true);
  const [quantity, setQuantity] = useState(record?.quantity ?? "0");
  const [purchasePrice, setPurchasePrice] = useState(
    record?.purchasePrice ?? "0",
  );
  const [reorderPoint, setReorderPoint] = useState(record?.reorderPoint ?? "");
  const [saving, setSaving] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [existingImageUrl] = useState<string | null>(
    resolveItemImageUrl(record?.item.imageUrl),
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!locationId && !isEdit && locations?.length === 1) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId, isEdit]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  function onPickImage(file: File | undefined) {
    if (!file) return;
    const err = validateItemImageFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setImageFile(file);
    setPreviewObjectUrl(URL.createObjectURL(file));
    setRemoveExistingImage(false);
  }

  const displayImageSrc =
    previewObjectUrl || (!removeExistingImage ? existingImageUrl : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetLocationId = record?.locationId ?? locationId;
    if (!record && !targetLocationId) {
      toast.error("Select a location");
      return;
    }
    if (
      !selectedUnit ||
      (!record && (!selectedUnit.isActive || selectedUnit.requiresReview))
    ) {
      toast.error("Select an active, reviewed stock unit");
      return;
    }
    setSaving(true);
    setSkuError(null);
    try {
      const reorderValue = reorderPointBodyValue(reorderPoint);
      if (reorderValue === undefined) {
        toast.error("Enter a valid reorder point or leave blank");
        setSaving(false);
        return;
      }
      if (!description.trim()) {
        toast.error("Description is required");
        setSaving(false);
        return;
      }

      let stockId = record?.id;
      if (record) {
        await api(`/inventory/${record.id}`, {
          method: "PATCH",
          body: {
            description: description.trim(),
            sku: optionalStringBodyValue(sku),
            barcode: optionalStringBodyValue(barcode),
            unitId: effectiveUnitId,
            unitGroupId: unitGroupId || null,
            itemType: itemType || null,
            isPhantom,
            reorderPoint: reorderValue,
            defaultWidthMetres: showUsableWidth
              ? defaultWidth.trim() === ""
                ? null
                : Number(defaultWidth)
              : null,
          },
        });
        requestNotificationsRefresh();
      } else {
        if (!quantity.trim() || Number.isNaN(parseFloat(quantity))) {
          toast.error("Quantity is required");
          setSaving(false);
          return;
        }
        const body: Record<string, unknown> = {
          description: description.trim(),
          locationId: targetLocationId,
          quantity: parseFloat(quantity),
          purchasePrice: Number(quantity) > 0 ? Number(purchasePrice) : 0,
          sku: optionalStringBodyValue(sku) ?? undefined,
          barcode: optionalStringBodyValue(barcode) ?? undefined,
          unitId: effectiveUnitId,
          unitGroupId: unitGroupId || null,
          isPhantom,
          defaultWidthMetres: showUsableWidth
            ? defaultWidth.trim() === ""
              ? null
              : Number(defaultWidth)
            : null,
        };
        if (itemType) body.itemType = itemType;
        if (reorderValue !== null) body.reorderPoint = reorderValue;
        const created = await api<StockRecord>("/inventory", {
          method: "POST",
          body,
        });
        stockId = created.id;
      }

      if (stockId && imageFile) {
        await uploadStockItemImage(stockId, imageFile);
      } else if (stockId && record && removeExistingImage && existingImageUrl) {
        await clearStockItemImage(stockId);
      }

      toast.success(record ? "Stock updated" : "Product saved");
      router.push(record ? "/inventory" : "/inventory/products");
      router.refresh();
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

  const imageAside = (
    <section className="form-product-photo" aria-label="Product image">
      <h2>
        Product image{" "}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          Optional
        </span>
      </h2>
      <div
        className="form-upload-zone"
        data-dragging={dragOver}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onPickImage(e.dataTransfer.files?.[0]);
        }}
      >
        {displayImageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImageSrc}
            alt={description.trim() || "Product preview"}
            className="form-upload-preview"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/8 text-primary">
            <ImageIcon className="size-7" />
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ITEM_IMAGE_ACCEPT}
          className="hidden"
          aria-label="Upload product image"
          onChange={(e) => onPickImage(e.target.files?.[0])}
        />
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon className="size-4" />
            {displayImageSrc ? "Change image" : "Choose image"}
          </Button>
          {displayImageSrc && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              aria-label="Remove product image"
              onClick={() => {
                if (previewObjectUrl) {
                  URL.revokeObjectURL(previewObjectUrl);
                  setPreviewObjectUrl(null);
                  setImageFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                } else setRemoveExistingImage(true);
              }}
            >
              <Trash2Icon className="size-4" />
              Remove
            </Button>
          )}
        </div>
        <p>
          Drop an image here or choose a file.
          <br />
          JPEG, PNG, WebP or GIF. Maximum 5 MB.
        </p>
      </div>
    </section>
  );

  const summaryAside = (
    <FormSummary
      rows={[
        { label: "Product", value: description.trim() },
        { label: "SKU", value: sku.trim() },
        {
          label: "Stock unit",
          value: selectedUnit
            ? `${selectedUnit.name} (${selectedUnit.symbol})`
            : null,
        },
        {
          label: "Location",
          value:
            record?.location?.name ??
            locations?.find((l) => l.id === locationId)?.name,
        },
        {
          label: isEdit ? "On hand" : "Opening quantity",
          value: `${formatQty(quantity)} ${selectedUnit?.symbol ?? ""}`,
        },
        {
          label: "Unit cost",
          value: purchasePrice ? formatMoney(purchasePrice) : null,
        },
        {
          label: "Stock value",
          value:
            purchasePrice &&
            Number.isFinite(Number(quantity) * Number(purchasePrice))
              ? formatMoney(Number(quantity) * Number(purchasePrice))
              : null,
        },
      ]}
      note={
        isEdit
          ? "Use a stock adjustment to change quantities on an existing item."
          : "Opening stock is posted to the selected location when you save."
      }
    />
  );

  const unitSelectField = (
    <FormField label="Stock unit" required>
      <UnitSelect
        units={units ?? []}
        value={effectiveUnitId}
        onChange={setUnitId}
        disabled={
          isVariant ||
          !!unitGroupId ||
          unitsLoading ||
          (isEdit && !unitPolicy?.canChangeBaseUnit)
        }
      />
      {!simpleCreate && (
        <p className="text-xs text-muted-foreground">
          {isEdit
            ? unitPolicy?.canChangeBaseUnit
              ? "On-hand is zero and the item is unused on documents. You can correct a mistaken stock unit; review cost and reorder point before saving."
              : (unitPolicy?.baseUnitLockReason ??
                "Checking whether the stock unit can be corrected...")
            : unitGroupId
              ? "The selected category supplies the stock unit and all conversions."
              : "All stock balances and unit costs use this unit. Prefer quantity 0 if you are unsure of the unit — you can correct it before receiving stock."}
        </p>
      )}
      {isEdit &&
        record &&
        !isVariant &&
        unitPolicy?.canChangeBaseUnit === false &&
        Number(liveQuantity) > 0 && (
          <div
            role="status"
            className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <p>
              Current quantity: {formatQty(liveQuantity)}{" "}
              {selectedUnit?.symbol ?? record.item.unit}. Reduce it to zero to
              unlock a stock-unit correction.
            </p>
            <StockAdjustDialog
              record={{ ...record, quantity: liveQuantity }}
              onSuccess={async () => {
                const fresh = await api<StockRecord>(
                  `/inventory/${record.id}`,
                );
                setLiveQuantity(fresh.quantity);
                await reloadUnitPolicy();
                toast.message(
                  Number(fresh.quantity) === 0
                    ? "Quantity is zero. You can change the stock unit now."
                    : "Stock adjusted. Reduce remaining quantity to unlock the unit.",
                );
              }}
              trigger={
                <Button type="button" variant="outline" size="sm">
                  Adjust stock to zero
                </Button>
              }
            />
          </div>
        )}
      {isEdit && unitPolicy?.canChangeBaseUnit && (
        <p
          role="status"
          className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          Stock unit can be corrected. Change it above, save, then receive
          stock in the new unit.
        </p>
      )}
      {selectedUnit?.requiresReview && (
        <p
          role="status"
          className="text-xs text-amber-700 dark:text-amber-300"
        >
          Legacy unit requires administrator review. Existing quantities have
          been preserved.
        </p>
      )}
      {unitsError && (
        <div role="alert" className="text-sm text-destructive">
          Could not load units.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void reloadUnits()}
          >
            Retry
          </button>
        </div>
      )}
    </FormField>
  );

  const locationField = !isEdit ? (
    <FormField label="Location" required>
      <Select
        value={locationId || ""}
        onValueChange={setLocationId}
        disabled={locationsLoading}
      >
        <SelectTrigger className="h-10">
          <SelectValue
            placeholder={
              locationsLoading ? "Loading locations…" : "Select location"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {(locations ?? []).map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
              {loc.type ? ` · ${loc.type}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  ) : null;

  const openingQtyField = isEdit ? (
    <FormField label="On hand">
      <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm tabular-nums">
        {formatQty(record!.quantity)}
      </div>
    </FormField>
  ) : (
    <FormField
      label="Opening quantity"
      htmlFor="opening-quantity"
      hint={
        simpleCreate
          ? "Leave at 0 if you will receive stock later."
          : "Leave at zero for a new product. Receive purchases or complete production to add stock later."
      }
      required
    >
      <Input
        className="h-10"
        type="number"
        step={quantityStep}
        min="0"
        id="opening-quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />
    </FormField>
  );

  const unitCostField = (
    <FormField
      label={
        isEdit
          ? `Current stock cost per ${selectedUnit?.symbol ?? "stock unit"}`
          : `Opening unit cost per ${selectedUnit?.symbol ?? "stock unit"}`
      }
      htmlFor="unit-purchase-price"
      hint={
        isEdit
          ? "Read only here. Receipts and production update the weighted average stock cost."
          : Number(quantity) > 0
            ? "Cost of stock already on hand."
            : "Enabled when opening quantity is greater than zero."
      }
      required={!isEdit && Number(quantity) > 0}
    >
      <Input
        className="h-10"
        type="number"
        step="any"
        min="0"
        id="unit-purchase-price"
        readOnly={isEdit}
        disabled={!isEdit && Number(quantity) === 0}
        value={purchasePrice}
        onChange={(e) => setPurchasePrice(e.target.value)}
        required={!isEdit && Number(quantity) > 0}
      />
    </FormField>
  );

  if (simpleCreate) {
    return (
      <PageForm
        onSubmit={handleSubmit}
        aside={
          <>
            {imageAside}
            {summaryAside}
          </>
        }
      >
        <PageFormCard>
          <PageFormSection
            title="Product"
            description="Name, stock unit, and where to put opening stock."
          >
            <FormGrid>
              <FormField
                label="Product name"
                required
                className="sm:col-span-2"
              >
                <Input
                  className="h-10"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Blue cotton shirt — M"
                  required
                />
              </FormField>
              <FormField
                label="SKU"
                error={skuError}
                hint={skuError ? undefined : "Optional · unique if set"}
              >
                <Input
                  className="h-10"
                  value={sku}
                  aria-invalid={Boolean(skuError)}
                  onChange={(e) => {
                    setSku(e.target.value);
                    if (skuError) setSkuError(null);
                  }}
                  placeholder="Optional"
                />
              </FormField>
              {unitSelectField}
              {locationField}
              {openingQtyField}
              {unitCostField}
              {showUsableWidth && (
                <FormField
                  label="Usable width (m)"
                  hint="For length-based stock when entering width × length."
                >
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={defaultWidth}
                    placeholder="e.g. 1.5"
                    onChange={(e) => setDefaultWidth(e.target.value)}
                  />
                </FormField>
              )}
            </FormGrid>

            <details className="form-advanced mt-4">
              <summary>
                More options{" "}
                <span className="ml-1 text-xs text-muted-foreground">
                  Barcode, type, reorder, unit category
                </span>
              </summary>
              <div className="pt-4">
                <FormGrid>
                  <FormField label="Barcode">
                    <Input
                      className="h-10"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="Optional"
                    />
                  </FormField>
                  <FormField label="Item type">
                    <Select
                      value={itemType || "__none__"}
                      onValueChange={(v) =>
                        setItemType(v === "__none__" ? "" : (v as ItemType))
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not set</SelectItem>
                        {ITEM_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField
                    label="Unit category"
                    hint="Optional packaging or measurement profile."
                  >
                    <Select
                      value={unitGroupId || "individual"}
                      onValueChange={(id) => {
                        const group = unitGroups?.find((g) => g.id === id);
                        setUnitGroupId(group?.id ?? "");
                        if (group) setUnitId(group.baseUnitId);
                      }}
                    >
                      <SelectTrigger aria-label="Unit category">
                        <SelectValue placeholder="Stock unit only" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">
                          Stock unit only
                        </SelectItem>
                        {unitGroups
                          ?.filter(
                            (g) =>
                              (g.isActive || g.id === unitGroupId) &&
                              (!g.requiresReview || g.id === unitGroupId),
                          )
                          .map((g) => (
                            <SelectItem
                              key={g.id}
                              value={g.id}
                              disabled={g.requiresReview}
                            >
                              {g.name} · {g.baseUnit.symbol}
                              {g.kind === "PACKAGING" ? " (packaging)" : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField
                    label="Reorder point"
                    htmlFor="reorder-point-simple"
                    hint="Low-stock alert. Leave blank to disable."
                  >
                    <Input
                      className="h-10"
                      type="number"
                      min="0"
                      placeholder="Optional"
                      id="reorder-point-simple"
                      step={quantityStep}
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(e.target.value)}
                    />
                  </FormField>
                  <FormField
                    label="Phantom assembly"
                    hint="BOM requirements pass through instead of issuing this item."
                    className="sm:col-span-2"
                  >
                    <div className="flex h-10 items-center gap-2">
                      <Switch
                        checked={isPhantom}
                        onCheckedChange={setIsPhantom}
                      />
                      <Label className="text-sm font-normal">
                        {isPhantom ? "Phantom" : "Stocked"}
                      </Label>
                    </div>
                  </FormField>
                </FormGrid>
              </div>
            </details>
          </PageFormSection>
        </PageFormCard>
        <PageFormActions>
          <PageFormCancel href="/inventory/products" />
          <Button type="submit" disabled={saving} className="min-w-28">
            {saving ? <Spinner className="size-4" /> : "Add product"}
          </Button>
        </PageFormActions>
      </PageForm>
    );
  }

  return (
    <PageForm
      onSubmit={handleSubmit}
      aside={
        <>
          {imageAside}
          {summaryAside}
        </>
      }
    >
      <PageFormCard>
        <PageFormSection
          title="Basic information"
          description="Give the product a clear name and identifiers your team can recognize."
        >
          <FormGrid>
            <FormField label="Product name" required className="sm:col-span-2">
              <Input
                className="h-10"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Oak dining chair — natural finish"
                required
              />
            </FormField>
            <FormField
              label="SKU"
              required={isVariant}
              error={skuError}
              hint={skuError ? undefined : "Optional · must be unique if set"}
            >
              <Input
                className="h-10"
                value={sku}
                required={isVariant}
                aria-invalid={Boolean(skuError)}
                onChange={(e) => {
                  setSku(e.target.value);
                  if (skuError) setSkuError(null);
                }}
              />
            </FormField>
            <FormField label="Barcode">
              <Input
                className="h-10"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Optional"
              />
            </FormField>
            <FormField
              label="Item type"
              hint={
                itemType === "FINISHED"
                  ? "Final product sold to customers. Manufacture it using a BOM; production receipts calculate its material cost."
                  : itemType === "SEMI"
                    ? "Intermediate product manufactured for use in another product."
                    : itemType === "RAW"
                      ? "Material purchased and consumed in manufacturing."
                      : "Choose how your team uses this product."
              }
            >
              <Select
                value={itemType || "__none__"}
                disabled={isVariant}
                onValueChange={(v) =>
                  setItemType(v === "__none__" ? "" : (v as ItemType))
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {ITEM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>
          <details
            className="form-advanced"
            open={record?.item.isPhantom === true ? true : undefined}
          >
            <summary>
              Manufacturing options{" "}
              <span className="ml-1 text-xs text-muted-foreground">
                Optional
              </span>
            </summary>
            <div className="pt-4">
              <FormField
                label="Phantom assembly"
                hint="When used on a BOM, requirements pass through to this item’s default BOM instead of issuing stock."
                className="sm:col-span-2"
              >
                <div className="flex h-10 items-center gap-2">
                  <Switch
                    checked={isPhantom}
                    onCheckedChange={setIsPhantom}
                    disabled={isVariant}
                  />
                  <Label className="text-sm font-normal">
                    {isPhantom ? "Phantom (non-stocked in BOMs)" : "Stocked"}
                  </Label>
                </div>
              </FormField>
            </div>
          </details>
        </PageFormSection>

        <PageFormSection
          title="Units and stock"
          description={
            isEdit
              ? "Quantity is changed with Adjust on the inventory list."
              : "Choose where stock is held and enter quantities in the selected stock unit."
          }
        >
          <FormGrid>
            {locationField}
            <FormField
              label="Unit configuration"
              hint="Reuse a measurement category or packaging profile. Its reference unit is used for stock balances and costs."
            >
              <Select
                value={unitGroupId || "individual"}
                disabled={isVariant}
                onValueChange={(id) => {
                  const group = unitGroups?.find((g) => g.id === id);
                  setUnitGroupId(group?.id ?? "");
                  if (group) setUnitId(group.baseUnitId);
                }}
              >
                <SelectTrigger aria-label="Unit configuration">
                  <SelectValue placeholder="Choose a unit category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Stock unit only</SelectItem>
                  {unitGroups
                    ?.filter(
                      (g) =>
                        (g.isActive || g.id === unitGroupId) &&
                        (!g.requiresReview || g.id === unitGroupId) &&
                        (!isEdit ||
                          unitPolicy?.canChangeBaseUnit ||
                          g.baseUnitId === record?.item.unitId),
                    )
                    .map((g) => (
                      <SelectItem
                        key={g.id}
                        value={g.id}
                        disabled={g.requiresReview}
                      >
                        {g.name} - {g.baseUnit.symbol} base{" "}
                        {g.kind === "PACKAGING" ? "(Packaging profile)" : ""}{" "}
                        {g.requiresReview ? "(Review required)" : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {unitGroups?.find((g) => g.id === unitGroupId)
                ?.requiresReview && (
                <p role="alert" className="text-xs text-destructive">
                  This unit configuration requires review. Fix it in unit
                  settings before using alternative units.
                </p>
              )}
              <a href="/units" className="text-xs text-primary underline">
                Manage unit categories
              </a>
            </FormField>
            {unitSelectField}
            {showUsableWidth && (
              <FormField
                label="Usable width (m)"
                hint="For length-based stock when entering width × length. Inventory quantity stays in the length unit."
              >
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={defaultWidth}
                  disabled={isVariant}
                  placeholder="e.g. 1.5"
                  onChange={(e) => setDefaultWidth(e.target.value)}
                />
              </FormField>
            )}
          </FormGrid>
        </PageFormSection>
        <PageFormSection
          title={isEdit ? "Stock balance and valuation" : "Opening stock"}
          description={
            isEdit
              ? "Stock balances and valuation are maintained by inventory transactions, not product detail edits."
              : "Only enter quantities you already hold. Keep zero when this product will be purchased or manufactured later."
          }
        >
          <FormGrid>
            {openingQtyField}
            {unitCostField}
            <FormField
              label="Reorder point"
              htmlFor="reorder-point"
              hint="Low-stock alert threshold. Leave blank to disable."
              className="sm:col-span-2"
            >
              <Input
                className="h-10"
                type="number"
                min="0"
                placeholder="Optional"
                id="reorder-point"
                step={quantityStep}
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
              />
            </FormField>
          </FormGrid>
        </PageFormSection>
      </PageFormCard>

      {(itemType === "FINISHED" || itemType === "SEMI") && (
        <PageFormCard>
          <PageFormSection
            title="Manufacturing cost"
            description="A BOM estimates material requirements. Completing production posts the issued materials' cost into the manufactured stock; alternative BOMs are not added together."
          >
            <p className="text-sm text-muted-foreground">
              Current stock cost includes materials only. Labour and overhead
              are not included. Set the selling price separately when making a
              sale.
            </p>
            <Link href="/boms" className="text-sm text-primary underline">
              Manage bills of materials
            </Link>
          </PageFormSection>
        </PageFormCard>
      )}
      {record && (
        <PageFormCard>
          {isVariant ? (
            <PageFormSection
              title="Product variant"
              description="This variant inherits its item type and unit configuration from its product family. Stock, SKU, image and cost remain specific to this item."
            >
              <Link
                href={`/products/${record.item.productFamilyId}`}
                className="text-sm text-primary underline"
              >
                View product family and variants
              </Link>
            </PageFormSection>
          ) : unitGroupId ? (
            <PageFormSection
              title="Category conversions"
              description="This item inherits its category settings. Configure the category once to reuse it across items."
            >
              <a href="/units" className="text-sm text-primary underline">
                Manage unit categories and conversions
              </a>
            </PageFormSection>
          ) : effectiveUnitId === record.item.unitId ? (
            <ItemUnitSettings
              itemId={record.itemId}
              onSaved={reloadUnitPolicy}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Save the corrected stock unit before configuring alternative
              units.
            </p>
          )}
        </PageFormCard>
      )}
      <PageFormActions>
        <PageFormCancel href={isEdit ? "/inventory" : "/inventory/products"} />
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? (
            <Spinner className="size-4" />
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Add product"
          )}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
