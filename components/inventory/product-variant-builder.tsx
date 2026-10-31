"use client";
import { useState } from "react";
import { toast } from "sonner";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import { useLocations } from "@/hooks/use-locations";
import { useFetch } from "@/hooks/use-fetch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import type { Item } from "@/lib/types";
import {
  combinationKey,
  previewCombinations,
  type ProductAttribute,
  type ProductFamily,
  type VariantSelection,
} from "@/lib/product-variants";

interface PreviewRow {
  values: VariantSelection;
  sku: string;
  barcode: string;
  selected: boolean;
}
export function ProductVariantBuilder({
  family,
  definitions,
  onSaved,
}: {
  family: ProductFamily;
  definitions: ProductAttribute[];
  onSaved: () => void;
}) {
  const { data: locations } = useLocations();
  const [locationId, setLocationId] = useState("");
  const effectiveLocation =
    locationId || (locations?.length === 1 ? locations[0].id : "");
  const [choices, setChoices] = useState(family.attributes);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [selection, setSelection] = useState<VariantSelection>(
    family.attributes.map((a) => ({
      attributeId: a.attributeId,
      value: a.values[0],
    })),
  );
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query);
  const { data: catalog, loading } = useFetch<Item[]>(
    () => api(`/product-families/catalog?q=${encodeURIComponent(debounced)}`),
    [debounced, mode],
    { enabled: mode === "existing" },
  );
  const [existing, setExisting] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const existingKeys = new Set(
    family.variants?.map((v) => combinationKey(v.variantValues)) ?? [],
  );
  function preview() {
    const combinations = previewCombinations(choices);
    if (!combinations) {
      toast.error(
        "Preview up to 100 combinations at a time. Select fewer attribute values.",
      );
      return;
    }
    const available = combinations.filter(
      (values) => !existingKeys.has(combinationKey(values)),
    );
    if (!available.length) {
      toast.info(
        "These combinations already exist, or no values are selected.",
      );
      setRows([]);
      return;
    }
    const code = (value: string) =>
      value
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toUpperCase();
    setRows(
      available.map((values) => ({
        values,
        sku: [
          code(family.name).slice(0, 24),
          ...values.map((v) => code(v.value).slice(0, 12)),
        ]
          .join("-")
          .slice(0, 80),
        barcode: "",
        selected: true,
      })),
    );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveLocation) {
      toast.error("Choose a location");
      return;
    }
    const selected = rows.filter((r) => r.selected);
    if (
      mode === "new" &&
      (!selected.length || selected.some((r) => !r.sku.trim()))
    ) {
      toast.error("Select variants and assign a SKU to each");
      return;
    }
    if (mode === "existing" && !existing) {
      toast.error("Choose an existing item");
      return;
    }
    setSaving(true);
    try {
      await api(`/product-families/${family.id}/variants`, {
        method: "POST",
        body: {
          locationId: effectiveLocation,
          variants:
            mode === "new"
              ? selected.map((r) => ({
                  values: r.values,
                  sku: r.sku,
                  barcode: r.barcode || undefined,
                }))
              : [{ existingItemId: existing!.id, values: selection }],
        },
      });
      toast.success(
        mode === "new"
          ? "Variants created with zero opening stock"
          : "Existing item linked; stock and costing preserved",
      );
      setRows([]);
      setExisting(null);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  const compatible = (catalog ?? []).filter(
    (i) =>
      !!i.sku?.trim() &&
      i.unitId === family.unitId &&
      (i.unitGroupId ?? null) === family.unitGroupId &&
      i.itemType === family.itemType &&
      !i.isPhantom &&
      !i.unitConversions?.length,
  );
  const options = compatible.map((item) => ({
    itemId: item.id,
    item,
    label: `${item.description}${item.sku ? ` (${item.sku})` : ""}`,
  }));
  if (existing && !options.some((o) => o.itemId === existing.id))
    options.push({
      itemId: existing.id,
      item: existing,
      label: `${existing.description}${existing.sku ? ` (${existing.sku})` : ""}`,
    });
  return (
    <form onSubmit={submit} className="min-w-0 space-y-4">
      <PageFormCard>
        <PageFormSection
          title="Add variants"
          description="Preview combinations before creating them. Existing and archived combinations are excluded."
        >
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Variant creation mode"
          >
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => setMode("new")}
            >
              Create new variants
            </Button>
            <Button
              type="button"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => setMode("existing")}
            >
              Link existing item
            </Button>
          </div>
          <FormGrid>
            <FormField
              label="Stock location"
              required
              hint={
                mode === "existing"
                  ? "Existing balances stay unchanged. A zero balance is added here only if needed."
                  : "New variants start at zero. Add stock through purchases, production or an opening adjustment."
              }
            >
              <NativeSelect
                value={effectiveLocation}
                onChange={(e) => setLocationId(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              >
                <option value="">Select location</option>
                {locations
                  ?.filter((l) => l.isActive !== false)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
              </NativeSelect>
            </FormField>
            {mode === "existing" && (
              <FormField
                label="Existing item"
                required
                hint="Search by name or SKU. Only unlinked items with a SKU, matching item type and unit configuration are offered."
              >
                <ItemSearchSelect
                  value={existing?.id ?? ""}
                  onValueChange={(id) =>
                    setExisting(
                      options.find((o) => o.itemId === id)?.item ?? null,
                    )
                  }
                  options={options}
                  filterLocally={false}
                  onQueryChange={setQuery}
                  loading={loading}
                />
              </FormField>
            )}
          </FormGrid>
          {mode === "new" ? (
            <>
              <div className="space-y-3">
                {family.attributes.map((a) => (
                  <fieldset
                    key={a.attributeId}
                    className="rounded-xl border p-4"
                  >
                    <legend className="px-1 text-sm font-medium">
                      {definitions.find((d) => d.id === a.attributeId)?.name ??
                        "Attribute"}
                    </legend>
                    <div className="flex flex-wrap gap-3">
                      {a.values.map((value) => (
                        <label
                          key={value}
                          className="flex min-h-10 items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={
                              choices
                                .find((c) => c.attributeId === a.attributeId)
                                ?.values.includes(value) ?? false
                            }
                            onChange={(e) => {
                              setRows([]);
                              setChoices((old) =>
                                old.map((c) =>
                                  c.attributeId === a.attributeId
                                    ? {
                                        ...c,
                                        values: e.target.checked
                                          ? [...c.values, value]
                                          : c.values.filter((v) => v !== value),
                                      }
                                    : c,
                                ),
                              );
                            }}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={preview}>
                Preview combinations
              </Button>
              {!!rows.length && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {rows.filter((r) => r.selected).length} selected. Review
                    generated SKUs before saving.
                  </p>
                  {rows.map((row, index) => (
                    <div
                      key={combinationKey(row.values)}
                      className="grid min-w-0 gap-3 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
                    >
                      <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) =>
                            setRows((old) =>
                              old.map((r, i) =>
                                i === index
                                  ? { ...r, selected: e.target.checked }
                                  : r,
                              ),
                            )
                          }
                        />
                        {row.values.map((v) => v.value).join(" / ")}
                      </label>
                      <FormField
                        label={`SKU: ${row.values.map((v) => v.value).join(" / ")}`}
                        required={row.selected}
                      >
                        <Input
                          value={row.sku}
                          required={row.selected}
                          disabled={!row.selected}
                          maxLength={80}
                          onChange={(e) =>
                            setRows((old) =>
                              old.map((r, i) =>
                                i === index ? { ...r, sku: e.target.value } : r,
                              ),
                            )
                          }
                        />
                      </FormField>
                      <FormField
                        label={`Barcode: ${row.values.map((v) => v.value).join(" / ")}`}
                      >
                        <Input
                          value={row.barcode}
                          disabled={!row.selected}
                          maxLength={80}
                          onChange={(e) =>
                            setRows((old) =>
                              old.map((r, i) =>
                                i === index
                                  ? { ...r, barcode: e.target.value }
                                  : r,
                              ),
                            )
                          }
                        />
                      </FormField>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <FormGrid>
              {family.attributes.map((a) => (
                <FormField
                  key={a.attributeId}
                  label={
                    definitions.find((d) => d.id === a.attributeId)?.name ??
                    "Attribute"
                  }
                  required
                >
                  <NativeSelect
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={
                      selection.find((s) => s.attributeId === a.attributeId)
                        ?.value ?? ""
                    }
                    onChange={(e) =>
                      setSelection((old) =>
                        old.map((s) =>
                          s.attributeId === a.attributeId
                            ? { ...s, value: e.target.value }
                            : s,
                        ),
                      )
                    }
                  >
                    {a.values.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              ))}
            </FormGrid>
          )}
          <div className="flex justify-end border-t pt-4">
            <Button
              type="submit"
              disabled={
                saving ||
                (mode === "new" ? !rows.some((r) => r.selected) : !existing)
              }
            >
              {saving
                ? "Saving..."
                : mode === "new"
                  ? "Create selected variants"
                  : "Link item as variant"}
            </Button>
          </div>
        </PageFormSection>
      </PageFormCard>
    </form>
  );
}
