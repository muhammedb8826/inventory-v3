"use client";
import { TransactionUnitField } from "@/components/inventory/transaction-unit-field";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { fetchAllBoms } from "@/lib/bom-fetch";
import { errorMessage } from "@/lib/format";
import type { ProductionOrder } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
import { toast } from "sonner";

export function ProductionOrderForm() {
  const router = useRouter();
  const [bomId, setBomId] = useState("");
  const [unitId, setUnitId] = useState<string | undefined>();
  const [locationId, setLocationId] = useState("");
  const [finishedLocationId, setFinishedLocationId] = useState("");
  const [quantityPlanned, setQuantityPlanned] = useState("1");
  const [explodeBom, setExplodeBom] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: boms, loading: bomsLoading } = useFetch(
    () => fetchAllBoms({ isActive: true }),
    [],
  );
  const { data: locations, loading: locationsLoading } = useLocations();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bomId) {
      toast.error("Select a BOM");
      return;
    }
    if (!locationId) {
      toast.error("Select a location");
      return;
    }
    const qty = parseFloat(quantityPlanned);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Enter a positive planned quantity");
      return;
    }
    setSaving(true);
    try {
      const created = await api<ProductionOrder>("/production-orders", {
        method: "POST",
        body: {
          bomId,
          locationId,
          finishedLocationId: finishedLocationId || locationId,
          quantityPlanned: qty,
          unitId,
          explodeBom,
          notes: notes.trim() || undefined,
        },
      });
      toast.success("Production order created");
      router.push(`/production-orders/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (bomsLoading || locationsLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <PageForm
      onSubmit={handleSubmit}
      aside={
        <FormSummary
          rows={[
            {
              label: "Bill of materials",
              value: boms?.find((b) => b.id === bomId)?.name,
            },
            {
              label: "Materials location",
              value: locations?.find((l) => l.id === locationId)?.name,
            },
            {
              label: "Receipt location",
              value: locations?.find(
                (l) => l.id === (finishedLocationId || locationId),
              )?.name,
            },
            { label: "Planned quantity", value: quantityPlanned },
          ]}
          note="The selected bill of materials determines the material requirements for this order."
        />
      }
    >
      <PageFormCard>
        <PageFormSection
          title="Production order"
          description="Materials follow the BOM: stocked components are issued; phantom components explode to their child BOM. Use force-explode only to ignore phantom flags and flatten everything to RAW."
        >
          <FormGrid>
            <FormField label="BOM" required className="sm:col-span-2">
              <Select
                value={bomId || undefined}
                onValueChange={(id) => {
                  setBomId(id);
                  setUnitId(undefined);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select BOM" />
                </SelectTrigger>
                <SelectContent>
                  {(boms ?? []).length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No active BOMs — create one first
                    </SelectItem>
                  ) : (
                    (boms ?? []).map((bom) => (
                      <SelectItem key={bom.id} value={bom.id}>
                        {bom.finishedItem?.description
                          ? `${bom.name}${bom.isDefault ? " ★" : ""} — ${bom.finishedItem.description}`
                          : bom.name}
                        {bom.version ? ` (v${bom.version})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Component location" required>
              <Select
                value={locationId || undefined}
                onValueChange={(v) => {
                  setLocationId(v);
                  if (!finishedLocationId) setFinishedLocationId(v);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Issue from…" />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? [])
                    .filter((l) => l.type !== "BIN")
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="FG receipt location">
              <Select
                value={finishedLocationId || locationId || undefined}
                onValueChange={setFinishedLocationId}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Receive FG to…" />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? [])
                    .filter((l) => l.type !== "BIN")
                    .map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
            <TransactionUnitField
              key={bomId}
              itemId={boms?.find((b) => b.id === bomId)?.finishedItemId ?? ""}
              value={unitId}
              quantity={quantityPlanned}
              onChange={setUnitId}
            />
            <FormField label="Quantity planned" required>
              <Input
                className="h-10"
                type="number"
                step="any"
                min="0"
                value={quantityPlanned}
                onChange={(e) => setQuantityPlanned(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Notes" className="sm:col-span-2">
              <Input
                className="h-10"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </FormField>
            <div className="sm:col-span-2 flex items-start justify-between gap-4 rounded-md border border-border/60 px-3 py-3">
              <div className="space-y-1">
                <Label htmlFor="explode-bom" className="text-sm font-medium">
                  Force explode all to RAW
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Off (industry default): issue stocked SEMIs; only{" "}
                  <span className="font-medium">phantom</span> components pass
                  through to their BOM. On: flatten every SEMI/FINISHED to leaf
                  RAW (ignore phantom flags).
                </p>
              </div>
              <Switch
                id="explode-bom"
                checked={explodeBom}
                onCheckedChange={setExplodeBom}
                className="mt-0.5 shrink-0"
              />
            </div>
          </FormGrid>
        </PageFormSection>
      </PageFormCard>

      <PageFormActions>
        <PageFormCancel href="/production-orders" />
        <Button type="submit" disabled={saving} className="min-w-28">
          {saving ? <Spinner className="size-4" /> : "Create"}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
