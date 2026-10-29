"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
import { formatQty, errorMessage } from "@/lib/format";
import { skuConflictMessage } from "@/lib/inventory-movements";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import type { ItemType, StockRecord } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { UnitSelect } from "@/components/inventory/unit-select";
import type { UnitOfMeasure } from "@/lib/types";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";

export function StockItemForm({
  locationId: initialLocationId,
  record,
}: {
  locationId?: string;
  record?: StockRecord;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(record);
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
  const [unitId, setUnitId] = useState(record?.item.unitId ?? "");
  const effectiveUnitId =
    unitId || (!record ? units?.find((u) => u.code === "PCS")?.id : "") || "";
  const selectedUnit = units?.find((u) => u.id === effectiveUnitId);
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
    record?.purchasePrice ?? "",
  );
  const [reorderPoint, setReorderPoint] = useState(record?.reorderPoint ?? "");
  const [saving, setSaving] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
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
            itemType: itemType || null,
            isPhantom,
            purchasePrice: parseFloat(purchasePrice),
            reorderPoint: reorderValue,
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
          purchasePrice: parseFloat(purchasePrice),
          sku: optionalStringBodyValue(sku) ?? undefined,
          barcode: optionalStringBodyValue(barcode) ?? undefined,
          unitId: effectiveUnitId,
          isPhantom,
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

      toast.success(record ? "Stock updated" : "Stock added");
      router.push("/inventory");
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

  return (
    <PageForm onSubmit={handleSubmit}>
      <PageFormCard>
        <PageFormSection
          title="Photo"
          description="Optional — helps staff recognize the item quickly."
        >
          <div
            className={`flex flex-col gap-4 rounded-xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 bg-muted/30"
            }`}
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
            <div className="bg-background flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-sm">
              {displayImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayImageSrc}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="text-muted-foreground size-7" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={ITEM_IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0])}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadIcon className="size-4" />
                  {displayImageSrc ? "Change" : "Upload"}
                </Button>
                {displayImageSrc ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (previewObjectUrl) {
                        URL.revokeObjectURL(previewObjectUrl);
                        setPreviewObjectUrl(null);
                        setImageFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      } else {
                        setRemoveExistingImage(true);
                      }
                    }}
                  >
                    <Trash2Icon className="size-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs">
                Drop an image here, or browse · JPEG, PNG, WebP, GIF · max 5 MB
              </p>
            </div>
          </div>
        </PageFormSection>

        <PageFormSection title="Details">
          <FormGrid>
            {!isEdit ? (
              <FormField label="Location" required className="sm:col-span-2">
                <Select
                  value={locationId || ""}
                  onValueChange={setLocationId}
                  disabled={locationsLoading}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue
                      placeholder={
                        locationsLoading
                          ? "Loading locations…"
                          : "Select location"
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
            ) : null}
            <FormField label="Description" required className="sm:col-span-2">
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
              error={skuError}
              hint={skuError ? undefined : "Optional · must be unique if set"}
            >
              <Input
                className="h-10"
                value={sku}
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
            <FormField label="Stock unit" required>
              <UnitSelect
                units={units ?? []}
                value={effectiveUnitId}
                onChange={setUnitId}
                disabled={unitsLoading || isEdit}
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Base unit is protected for existing items. Review legacy definitions in Units of measure."
                  : "All stock balances and unit costs use this unit."}
              </p>
              {selectedUnit?.requiresReview && (
                <p
                  role="status"
                  className="text-xs text-amber-700 dark:text-amber-300"
                >
                  Legacy unit requires administrator review. Existing quantities
                  have been preserved.
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
              label="Phantom assembly"
              hint="When used on a BOM, requirements pass through to this item’s default BOM instead of issuing stock."
              className="sm:col-span-2"
            >
              <div className="flex h-10 items-center gap-2">
                <Switch checked={isPhantom} onCheckedChange={setIsPhantom} />
                <Label className="text-sm font-normal">
                  {isPhantom ? "Phantom (non-stocked in BOMs)" : "Stocked"}
                </Label>
              </div>
            </FormField>
          </FormGrid>
        </PageFormSection>

        <PageFormSection
          title="Stock & price"
          description={
            isEdit
              ? "Quantity is changed with Adjust on the inventory list."
              : "Opening quantity is posted at the location above."
          }
        >
          <FormGrid>
            {isEdit ? (
              <FormField label="On hand">
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm tabular-nums">
                  {formatQty(record!.quantity)}
                </div>
              </FormField>
            ) : (
              <FormField
                label="Opening quantity"
                htmlFor="opening-quantity"
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
            )}
            <FormField
              label={`Purchase price per ${selectedUnit?.symbol ?? "stock unit"}`}
              htmlFor="unit-purchase-price"
              required
            >
              <Input
                className="h-10"
                type="number"
                step="any"
                min="0"
                id="unit-purchase-price"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
              />
            </FormField>
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

      <PageFormActions>
        <PageFormCancel href="/inventory" />
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? <Spinner className="size-4" /> : isEdit ? "Save" : "Create"}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
