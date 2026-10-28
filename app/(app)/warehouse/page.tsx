"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import {
  FormField,
  FormGrid,
  PageForm,
  PageFormActions,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { errorMessage, formatDate, formatQty } from "@/lib/format";
import { fetchInventoryForLocation } from "@/lib/inventory-fetch";
import { itemOptionsFromStock } from "@/lib/inventory-items";
import type { StockLot } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";

export default function WarehousePage() {
  return (
    <AppShell
      title="Putaway / Pick"
      subtitle="Move stock into bins or pick from bins"
    >
      <PermissionGate permission="inventory.write" showDenied>
        <Tabs defaultValue="putaway" className="space-y-4">
          <TabsList>
            <TabsTrigger value="putaway">Putaway</TabsTrigger>
            <TabsTrigger value="pick">Pick</TabsTrigger>
            <TabsTrigger value="lots">Lots / expiry</TabsTrigger>
          </TabsList>
          <TabsContent value="putaway">
            <MoveForm mode="putaway" />
          </TabsContent>
          <TabsContent value="pick">
            <MoveForm mode="pick" />
          </TabsContent>
          <TabsContent value="lots">
            <LotsPanel />
          </TabsContent>
        </Tabs>
      </PermissionGate>
    </AppShell>
  );
}

function MoveForm({ mode }: { mode: "putaway" | "pick" }) {
  const { data: locations } = useLocations();
  const warehouses = useMemo(
    () => (locations ?? []).filter((l) => l.type !== "BIN"),
    [locations],
  );
  const bins = useMemo(
    () => (locations ?? []).filter((l) => l.type === "BIN"),
    [locations],
  );

  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [lotNumber, setLotNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const sourceId = mode === "putaway" ? fromLocationId : fromLocationId;
  const { data: stock } = useFetch(
    () =>
      sourceId
        ? fetchInventoryForLocation(sourceId)
        : Promise.resolve([]),
    [sourceId],
  );
  const itemOptions = itemOptionsFromStock(stock ?? []);

  const filteredBins = useMemo(() => {
    if (mode === "putaway" && fromLocationId) {
      return bins.filter((b) => b.parentId === fromLocationId);
    }
    return bins;
  }, [bins, mode, fromLocationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!fromLocationId || !toLocationId || !itemId || !(qty > 0)) {
      toast.error("Fill from, to, item, and quantity");
      return;
    }
    setSaving(true);
    try {
      await api(`/inventory/${mode}`, {
        method: "POST",
        body: {
          fromLocationId,
          toLocationId,
          itemId,
          quantity: qty,
          lotNumber: lotNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      toast.success(mode === "putaway" ? "Putaway recorded" : "Pick recorded");
      setQuantity("1");
      setLotNumber("");
      setNotes("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageForm onSubmit={handleSubmit}>
      <PageFormCard>
        <PageFormSection
          title={mode === "putaway" ? "Putaway to bin" : "Pick from bin"}
          description={
            mode === "putaway"
              ? "Move stock from a warehouse/showroom into one of its bins."
              : "Move stock from a bin to a warehouse/showroom (or another location)."
          }
        >
          <FormGrid>
            <FormField
              label={mode === "putaway" ? "From warehouse" : "From bin"}
              required
            >
              <Select
                value={fromLocationId || undefined}
                onValueChange={(v) => {
                  setFromLocationId(v);
                  setItemId("");
                  if (mode === "putaway") setToLocationId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(mode === "putaway" ? warehouses : bins).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label={mode === "putaway" ? "To bin" : "To location"}
              required
            >
              <Select
                value={toLocationId || undefined}
                onValueChange={setToLocationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(mode === "putaway" ? filteredBins : warehouses).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Item" required>
              <ItemSearchSelect
                value={itemId}
                onValueChange={setItemId}
                options={itemOptions}
                disabled={!fromLocationId}
              />
            </FormField>
            <FormField label="Quantity" required>
              <Input
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </FormField>
            <FormField label="Lot number">
              <Input
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="Optional"
              />
            </FormField>
            <FormField label="Notes">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormField>
          </FormGrid>
        </PageFormSection>
        <PageFormActions>
          <Button type="submit" disabled={saving}>
            {mode === "putaway" ? "Putaway" : "Pick"}
          </Button>
        </PageFormActions>
      </PageFormCard>
    </PageForm>
  );
}

function LotsPanel() {
  const { data: locations } = useLocations();
  const [locationId, setLocationId] = useState("");
  const [expiringBefore, setExpiringBefore] = useState("");

  const { data: lots, loading, reload } = useFetch(() => {
    const q = new URLSearchParams();
    if (locationId) q.set("locationId", locationId);
    if (expiringBefore) q.set("expiringBefore", expiringBefore);
    const qs = q.toString();
    return api<StockLot[]>(`/inventory/lots${qs ? `?${qs}` : ""}`);
  }, [locationId, expiringBefore]);

  return (
    <PageFormCard>
      <PageFormSection
        title="Lot / batch stock"
        description="Lots with remaining quantity. Filter by location or expiry."
      >
        <FormGrid>
          <FormField label="Location">
            <Select
              value={locationId || "__all__"}
              onValueChange={(v) => setLocationId(v === "__all__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All locations</SelectItem>
                {(locations ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Expiring on/before">
            <Input
              type="date"
              value={expiringBefore}
              onChange={(e) => setExpiringBefore(e.target.value)}
            />
          </FormField>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={() => reload()}>
              Refresh
            </Button>
          </div>
        </FormGrid>

        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5">Lot</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Expiry</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : (lots ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                    No lots with quantity.
                  </td>
                </tr>
              ) : (
                (lots ?? []).map((lot) => (
                  <tr key={lot.id}>
                    <td className="px-4 py-2.5">
                      {lot.item?.description ?? lot.itemId}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {lot.lotNumber}
                    </td>
                    <td className="px-4 py-2.5">
                      {lot.location?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {lot.expiryDate ? (
                        <Badge variant="outline">
                          {formatDate(lot.expiryDate)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {formatQty(lot.quantity)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageFormSection>
    </PageFormCard>
  );
}
