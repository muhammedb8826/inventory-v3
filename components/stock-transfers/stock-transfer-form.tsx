"use client";

import { useState } from "react";
import Link from "next/link";
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
import { QuickLocationDialog } from "@/components/locations/quick-location-dialog";
import { QuickStockItemDialog } from "@/components/inventory/quick-stock-item-dialog";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { fetchInventoryForLocation } from "@/lib/inventory-fetch";
import { errorMessage } from "@/lib/format";
import { requestNotificationsRefresh } from "@/lib/notification-events";
import {
  itemOptionsFromStock,
  parseTransferLines,
  productItemId,
} from "@/lib/inventory-items";
import type { Location, StockRecord } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";

export function StockTransferForm() {
  const router = useRouter();
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([{ itemId: "", quantity: "1" }]);
  const [saving, setSaving] = useState(false);

  const {
    data: locations,
    reload: reloadLocations,
    setData: setLocations,
  } = useLocations();
  const {
    data: stock,
    loading: stockLoading,
    reload: reloadStock,
    setData: setStock,
  } = useFetch(
    () =>
      fromLocationId
        ? fetchInventoryForLocation(fromLocationId)
        : Promise.resolve([]),
    [fromLocationId],
  );

  const itemOptions = itemOptionsFromStock(stock ?? []);

  function onLocationCreated(location: Location) {
    setLocations((prev) => [...(prev ?? []), location]);
    reloadLocations();
  }

  function onStockCreated(record: StockRecord) {
    setStock((prev) => [...(prev ?? []), record]);
    reloadStock();
    const emptyIdx = lines.findIndex((l) => !l.itemId);
    const idx = emptyIdx >= 0 ? emptyIdx : 0;
    setLines((prev) =>
      prev.map((row, i) =>
        i === idx ? { ...row, itemId: productItemId(record) } : row,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedLines = parseTransferLines(lines);
    if ("error" in parsedLines) {
      toast.error(parsedLines.error);
      return;
    }
    setSaving(true);
    try {
      const created = await api<{ id: string }>("/stock-transfers", {
        method: "POST",
        body: {
          fromLocationId,
          toLocationId,
          notes: notes || undefined,
          lines: parsedLines.lines,
        },
      });
      toast.success("Transfer created");
      requestNotificationsRefresh();
      router.push(`/stock-transfers/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const itemsHint = !fromLocationId
    ? "Select a source location first"
    : stockLoading
      ? "Loading stock…"
      : `${itemOptions.length} item(s) at source`;

  return (
    <PageForm onSubmit={handleSubmit} maxWidth="max-w-3xl">
      <PageFormCard>
        <PageFormSection
          title="Route"
          description="Move stock between locations."
        >
          <FormGrid>
            <FormField label="From" required>
              <div className="flex gap-2">
                <Select
                  value={fromLocationId || undefined}
                  onValueChange={setFromLocationId}
                >
                  <SelectTrigger className="h-10 flex-1">
                    <SelectValue placeholder="Source location" />
                  </SelectTrigger>
                  <SelectContent>
                    {(locations ?? []).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <QuickLocationDialog
                  onCreated={(loc) => {
                    onLocationCreated(loc);
                    setFromLocationId(loc.id);
                  }}
                />
              </div>
            </FormField>
            <FormField label="To" required>
              <div className="flex gap-2">
                <Select
                  value={toLocationId || undefined}
                  onValueChange={setToLocationId}
                >
                  <SelectTrigger className="h-10 flex-1">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {(locations ?? []).map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <QuickLocationDialog
                  onCreated={(loc) => {
                    onLocationCreated(loc);
                    setToLocationId(loc.id);
                  }}
                />
              </div>
            </FormField>
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

        <PageFormSection title="Line items" description={itemsHint}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <QuickStockItemDialog
              locationId={fromLocationId}
              onCreated={onStockCreated}
              disabled={!fromLocationId}
            />
            <Link
              href="/inventory"
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              Stock ledger
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border">
            <div className="divide-y">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_2.5rem] sm:items-center"
                >
                  <ItemSearchSelect
                    value={line.itemId}
                    onValueChange={(v) =>
                      setLines((prev) =>
                        prev.map((row, idx) =>
                          idx === i ? { ...row, itemId: v } : row,
                        ),
                      )
                    }
                    options={itemOptions}
                    disabled={!fromLocationId || stockLoading}
                    placeholder="Select item…"
                    className="min-w-0"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="h-10"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, idx) =>
                          idx === i
                            ? { ...row, quantity: e.target.value }
                            : row,
                        ),
                      )
                    }
                    required
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
                  setLines((prev) => [...prev, { itemId: "", quantity: "1" }])
                }
              >
                <PlusIcon className="size-4" />
                Add line
              </Button>
            </div>
          </div>
        </PageFormSection>
      </PageFormCard>

      <PageFormActions>
        <PageFormCancel href="/stock-transfers" />
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? <Spinner className="size-4" /> : "Create transfer"}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
