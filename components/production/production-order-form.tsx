"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
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
  const [locationId, setLocationId] = useState("");
  const [quantityPlanned, setQuantityPlanned] = useState("1");
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
          quantityPlanned: qty,
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
    <PageForm onSubmit={handleSubmit}>
      <PageFormCard>
        <PageFormSection
          title="Production order"
          description="BOM lines are snapshotted when the order is created."
        >
          <FormGrid>
            <FormField label="BOM" required className="sm:col-span-2">
              <Select value={bomId || undefined} onValueChange={setBomId}>
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
                          ? `${bom.name} — ${bom.finishedItem.description}`
                          : bom.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Location" required>
              <Select
                value={locationId || undefined}
                onValueChange={setLocationId}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select location" />
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
