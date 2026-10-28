"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
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
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import {
  fetchAllInventory,
  uniqueItemsFromStock,
} from "@/lib/inventory-fetch";
import { errorMessage } from "@/lib/format";
import type { Bom } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";

interface BomLineRow {
  componentItemId: string;
  quantity: string;
  scrapPercent: string;
  isPhantom: boolean;
}

function linesFromBom(bom: Bom): BomLineRow[] {
  const rows = (bom.lines ?? []).map((line) => ({
    componentItemId: line.componentItemId,
    quantity: String(line.quantity ?? ""),
    scrapPercent:
      line.scrapPercent != null && line.scrapPercent !== ""
        ? String(line.scrapPercent)
        : "",
    isPhantom:
      line.isPhantom === true || line.componentItem?.isPhantom === true,
  }));
  return rows.length > 0
    ? rows
    : [
        {
          componentItemId: "",
          quantity: "1",
          scrapPercent: "",
          isPhantom: false,
        },
      ];
}

export function BomForm({ bom }: { bom?: Bom }) {
  const router = useRouter();
  const isEdit = !!bom?.id;
  const [finishedItemId, setFinishedItemId] = useState(
    bom?.finishedItemId ?? "",
  );
  const [name, setName] = useState(bom?.name ?? "");
  const [version, setVersion] = useState(bom?.version ?? "1.0");
  const [notes, setNotes] = useState(bom?.notes ?? "");
  const [isActive, setIsActive] = useState(bom?.isActive !== false);
  const [isDefault, setIsDefault] = useState(bom?.isDefault === true);
  const [yieldPercent, setYieldPercent] = useState(
    bom?.yieldPercent != null ? String(bom.yieldPercent) : "100",
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    bom?.effectiveFrom?.slice(0, 10) ?? "",
  );
  const [effectiveTo, setEffectiveTo] = useState(
    bom?.effectiveTo?.slice(0, 10) ?? "",
  );
  const [lines, setLines] = useState<BomLineRow[]>(() =>
    bom
      ? linesFromBom(bom)
      : [
          {
            componentItemId: "",
            quantity: "1",
            scrapPercent: "",
            isPhantom: false,
          },
        ],
  );
  const [saving, setSaving] = useState(false);

  const { data: stock, loading } = useFetch(() => fetchAllInventory(), []);
  const catalogItems = uniqueItemsFromStock(stock ?? []);
  const itemOptions = (() => {
    const options = catalogItems.map((item) => ({
      itemId: item.id,
      label: item.sku
        ? `${item.description} (${item.sku})`
        : item.description,
    }));
    const pushIfMissing = (itemId: string, label: string) => {
      if (!itemId || options.some((o) => o.itemId === itemId)) return;
      options.push({ itemId, label });
    };
    if (bom?.finishedItem) {
      pushIfMissing(
        bom.finishedItemId,
        bom.finishedItem.sku
          ? `${bom.finishedItem.description} (${bom.finishedItem.sku})`
          : bom.finishedItem.description,
      );
    }
    for (const line of bom?.lines ?? []) {
      if (!line.componentItem) continue;
      pushIfMissing(
        line.componentItemId,
        line.componentItem.sku
          ? `${line.componentItem.description} (${line.componentItem.sku})`
          : line.componentItem.description,
      );
    }
    return options;
  })();

  function updateLine(index: number, patch: Partial<BomLineRow>) {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("BOM name is required");
      return;
    }
    if (!finishedItemId) {
      toast.error("Select a finished item");
      return;
    }
    const parsedLines: {
      componentItemId: string;
      quantity: number;
      scrapPercent?: number;
      isPhantom: boolean;
    }[] = [];
    for (const line of lines) {
      if (!line.componentItemId) continue;
      const quantity = parseFloat(line.quantity);
      if (Number.isNaN(quantity) || quantity <= 0) {
        toast.error("Each component needs a positive quantity");
        return;
      }
      if (line.componentItemId === finishedItemId) {
        toast.error("Finished item cannot be a component of itself");
        return;
      }
      const entry: {
        componentItemId: string;
        quantity: number;
        scrapPercent?: number;
        isPhantom: boolean;
      } = {
        componentItemId: line.componentItemId,
        quantity,
        isPhantom: line.isPhantom,
      };
      if (line.scrapPercent.trim()) {
        const scrap = parseFloat(line.scrapPercent);
        if (Number.isNaN(scrap) || scrap < 0) {
          toast.error("Scrap % must be a valid number");
          return;
        }
        entry.scrapPercent = scrap;
      }
      parsedLines.push(entry);
    }
    if (parsedLines.length === 0) {
      toast.error("Add at least one component line");
      return;
    }

    setSaving(true);
    try {
      const yieldVal = parseFloat(yieldPercent);
      const body: Record<string, unknown> = {
        finishedItemId,
        name: name.trim(),
        version: version.trim() || undefined,
        notes: notes.trim() || undefined,
        isDefault,
        yieldPercent:
          Number.isFinite(yieldVal) && yieldVal > 0 ? yieldVal : 100,
        effectiveFrom: effectiveFrom || undefined,
        effectiveTo: effectiveTo || undefined,
        lines: parsedLines,
      };
      if (isEdit) body.isActive = isActive;

      if (isEdit && bom) {
        await api(`/boms/${bom.id}`, { method: "PATCH", body });
        toast.success("BOM updated");
        router.push(`/boms/${bom.id}`);
      } else {
        const created = await api<Bom>("/boms", { method: "POST", body });
        toast.success("BOM created");
        router.push(`/boms/${created.id}`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    );
  }

  const cancelHref = isEdit && bom ? `/boms/${bom.id}` : "/boms";

  return (
    <PageForm onSubmit={handleSubmit}>
      <PageFormCard>
        <PageFormSection
          title="BOM"
          description="Finished good identity and version."
        >
          <FormGrid>
            <FormField label="Name" required className="sm:col-span-2">
              <Input
                className="h-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard chair"
                required
              />
            </FormField>
            <FormField label="Finished item" required className="sm:col-span-2">
              <ItemSearchSelect
                value={finishedItemId}
                onValueChange={setFinishedItemId}
                options={itemOptions}
                placeholder="Select finished item…"
                searchPlaceholder="Search item…"
                disabled={isEdit}
              />
            </FormField>
            <FormField label="Version">
              <Input
                className="h-10"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
              />
            </FormField>
            <FormField label="Yield %">
              <Input
                className="h-10"
                type="number"
                step="any"
                min="0.01"
                value={yieldPercent}
                onChange={(e) => setYieldPercent(e.target.value)}
              />
            </FormField>
            <FormField label="Effective from">
              <Input
                className="h-10"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </FormField>
            <FormField label="Effective to">
              <Input
                className="h-10"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </FormField>
            <FormField label="Default BOM">
              <div className="flex h-10 items-center gap-2">
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                <Label className="text-sm font-normal">
                  Primary BOM for this finished item
                </Label>
              </div>
            </FormField>
            {isEdit ? (
              <FormField label="Status">
                <div className="flex h-10 items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label className="text-sm font-normal">
                    {isActive ? "Active" : "Inactive"}
                  </Label>
                </div>
              </FormField>
            ) : null}
            <FormField label="Notes" className="sm:col-span-2">
              <Input
                className="h-10"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </FormField>
          </FormGrid>
        </PageFormSection>

        <PageFormSection
          title="Components"
          description="Quantities are per 1 finished unit. Mark Phantom to pass through to the component’s BOM instead of issuing stock (industry non-stocked assembly)."
        >
          <div className="overflow-hidden rounded-xl border">
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_6.5rem_2.5rem] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
              <span>Component</span>
              <span>Qty / FG</span>
              <span>Scrap %</span>
              <span>Phantom</span>
              <span className="sr-only">Remove</span>
            </div>
            <div className="divide-y">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_6.5rem_2.5rem] sm:items-center"
                >
                  <ItemSearchSelect
                    value={line.componentItemId}
                    onValueChange={(componentItemId) => {
                      const fromCatalog = catalogItems.find(
                        (i) => i.id === componentItemId,
                      );
                      const fromBomLine = (bom?.lines ?? []).find(
                        (l) => l.componentItemId === componentItemId,
                      )?.componentItem;
                      const inheritPhantom =
                        fromCatalog?.isPhantom === true ||
                        fromBomLine?.isPhantom === true;
                      updateLine(index, {
                        componentItemId,
                        isPhantom: inheritPhantom,
                      });
                    }}
                    options={itemOptions}
                    placeholder="Select component…"
                    searchPlaceholder="Search component…"
                  />
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    className="h-10"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, { quantity: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    className="h-10"
                    value={line.scrapPercent}
                    onChange={(e) =>
                      updateLine(index, { scrapPercent: e.target.value })
                    }
                    placeholder="0"
                  />
                  <div className="flex h-10 items-center gap-2">
                    <Switch
                      checked={line.isPhantom}
                      onCheckedChange={(isPhantom) =>
                        updateLine(index, { isPhantom })
                      }
                    />
                    <Label className="text-xs font-normal text-muted-foreground sm:sr-only">
                      Phantom
                    </Label>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-9 text-muted-foreground hover:text-destructive"
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((prev) =>
                        prev.length <= 1
                          ? prev
                          : prev.filter((_, i) => i !== index),
                      )
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
                      componentItemId: "",
                      quantity: "1",
                      scrapPercent: "",
                      isPhantom: false,
                    },
                  ])
                }
              >
                <PlusIcon className="size-4" />
                Add component
              </Button>
            </div>
          </div>
        </PageFormSection>
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
