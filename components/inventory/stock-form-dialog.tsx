"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { requestNotificationsRefresh } from "@/lib/notification-events";
import type { ItemType, StockRecord } from "@/lib/types";
import { toast } from "sonner";
import { ImageIcon, PlusIcon, Trash2Icon, UploadIcon } from "lucide-react";

export function StockFormDialog({
  locationId,
  record,
  onSuccess,
  trigger,
  disabled,
}: {
  locationId: string;
  record?: StockRecord;
  onSuccess: () => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(
    record?.item.description ?? ""
  );
  const [sku, setSku] = useState(record?.item.sku ?? "");
  const [unit, setUnit] = useState(record?.item.unit ?? "pcs");
  const [itemType, setItemType] = useState<ItemType | "">(
    record?.item.itemType ?? ""
  );
  const [quantity, setQuantity] = useState(record?.quantity ?? "");
  const [purchasePrice, setPurchasePrice] = useState(
    record?.purchasePrice ?? ""
  );
  const [reorderPoint, setReorderPoint] = useState(record?.reorderPoint ?? "");
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    resolveItemImageUrl(record?.item.imageUrl)
  );
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  function resetImageState(nextRecord?: StockRecord) {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    setPreviewObjectUrl(null);
    setImageFile(null);
    setRemoveExistingImage(false);
    setExistingImageUrl(resolveItemImageUrl(nextRecord?.item.imageUrl));
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setDescription(record?.item.description ?? "");
      setSku(record?.item.sku ?? "");
      setUnit(record?.item.unit ?? "pcs");
      setItemType(record?.item.itemType ?? "");
      setQuantity(record?.quantity ?? "");
      setPurchasePrice(record?.purchasePrice ?? "");
      setReorderPoint(record?.reorderPoint ?? "");
      resetImageState(record);
    }
  }

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
      toast.error("Select a location first");
      return;
    }
    setSaving(true);
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
            unit: optionalStringBodyValue(unit),
            itemType: itemType || null,
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
          unit: optionalStringBodyValue(unit) ?? undefined,
        };
        if (itemType) body.itemType = itemType;
        if (reorderValue !== null) {
          body.reorderPoint = reorderValue;
        }
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
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" disabled={disabled}>
            <PlusIcon />
            Add item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="shrink-0 border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3">
            <DialogTitle className="text-base">
              {record ? "Edit stock" : "Add stock"}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4">
            <div className="grid gap-2">
              <Label>Item image (optional)</Label>
              <div className="flex items-start gap-3">
                <div className="bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded border">
                  {displayImageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImageSrc}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="text-muted-foreground size-6" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ITEM_IMAGE_ACCEPT}
                    className="hidden"
                    onChange={(e) => onPickImage(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <UploadIcon className="size-4" />
                    {displayImageSrc ? "Change image" : "Upload image"}
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
                  <p className="text-muted-foreground text-xs">
                    JPEG, PNG, WebP, or GIF · max 5 MB
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>SKU (optional)</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Item type (optional)</Label>
              <Select
                value={itemType || "__none__"}
                onValueChange={(v) =>
                  setItemType(v === "__none__" ? "" : (v as ItemType))
                }
              >
                <SelectTrigger>
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
            </div>
            {record ? (
              <p className="text-xs text-muted-foreground">
                Description, SKU, unit, item type, and image update this item
                everywhere it is stocked. Clear SKU or unit to remove them.
                Quantity cannot be edited here — use Adjust on the stock row.
              </p>
            ) : null}
            {!record ? (
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="rounded border border-dashed border-[var(--frappe-border)] px-3 py-2 text-sm text-[var(--frappe-text-muted)]">
                On hand:{" "}
                <span className="font-medium tabular-nums text-[var(--frappe-text)]">
                  {formatQty(record.quantity)}
                </span>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Purchase price</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Reorder point (optional)</Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Alert when quantity at or below"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to disable low-stock alerts for this item.
              </p>
            </div>
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : record ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
