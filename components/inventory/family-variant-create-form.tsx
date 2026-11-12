"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FormField,
  FormGrid,
  FormSummary,
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
import { useFetch } from "@/hooks/use-fetch";
import { useLocations } from "@/hooks/use-locations";
import { api } from "@/lib/api";
import { errorMessage, formatQty } from "@/lib/format";
import {
  combinationKey,
  type ProductAttribute,
  type ProductFamily,
  type ProductVariant,
} from "@/lib/product-variants";

function suggestSku(familyName: string, values: string[]) {
  const code = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toUpperCase();
  return [code(familyName).slice(0, 24), ...values.map((v) => code(v).slice(0, 12))]
    .filter(Boolean)
    .join("-")
    .slice(0, 80);
}

export function FamilyVariantCreateForm({
  locationId: initialLocationId,
}: {
  locationId?: string;
}) {
  const router = useRouter();
  const { data: families, loading: familiesLoading } = useFetch<ProductFamily[]>(
    () => api("/product-families"),
  );
  const { data: definitions } = useFetch<ProductAttribute[]>(() =>
    api("/product-families/attributes"),
  );
  const { data: locations, loading: locationsLoading } = useLocations();
  const [familyId, setFamilyId] = useState("");
  const [valuesByAttribute, setValuesByAttribute] = useState<
    Record<string, string>
  >({});
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [locationId, setLocationId] = useState(initialLocationId ?? "");
  const [quantity, setQuantity] = useState("0");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [saving, setSaving] = useState(false);
  const [skuTouched, setSkuTouched] = useState(false);

  const activeFamilies = useMemo(
    () => (families ?? []).filter((f) => f.isActive !== false),
    [families],
  );
  const family = activeFamilies.find((f) => f.id === familyId) ?? null;

  const { data: familyDetail, loading: detailLoading } = useFetch<ProductFamily>(
    () =>
      familyId
        ? api(`/product-families/${familyId}`)
        : Promise.resolve(null as unknown as ProductFamily),
    [familyId],
    { enabled: !!familyId },
  );

  useEffect(() => {
    if (!locationId && locations?.length === 1) setLocationId(locations[0].id);
  }, [locations, locationId]);

  useEffect(() => {
    if (!family) {
      setValuesByAttribute({});
      return;
    }
    const next: Record<string, string> = {};
    for (const a of family.attributes) next[a.attributeId] = a.values[0] ?? "";
    setValuesByAttribute(next);
    setSkuTouched(false);
  }, [familyId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset when family changes

  const selectedValues = useMemo(() => {
    if (!family) return [];
    return family.attributes.map((a) => ({
      attributeId: a.attributeId,
      value: valuesByAttribute[a.attributeId] ?? a.values[0] ?? "",
    }));
  }, [family, valuesByAttribute]);

  useEffect(() => {
    if (!family || skuTouched) return;
    setSku(
      suggestSku(
        family.name,
        selectedValues.map((v) => v.value),
      ),
    );
  }, [family, selectedValues, skuTouched]);

  const existingVariant = useMemo(() => {
    const detail = familyDetail ?? family;
    if (!detail?.variants?.length || !selectedValues.length) return null;
    const key = combinationKey(selectedValues);
    return (
      detail.variants.find(
        (v) => combinationKey(v.variantValues) === key,
      ) ?? null
    );
  }, [family, familyDetail, selectedValues]);

  const attributeName = (id: string) =>
    definitions?.find((d) => d.id === id)?.name ?? "Attribute";

  async function postOpening(
    itemId: string,
    location: string,
    qty: number,
    cost: number,
  ) {
    if (!(qty > 0)) return;
    await api("/inventory/adjustments", {
      method: "POST",
      body: {
        locationId: location,
        itemId,
        direction: "in",
        quantity: qty,
        reason: "OPENING",
        purchasePrice: cost,
        notes: "Opening stock from product create",
      },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!family) {
      toast.error("Select a product family");
      return;
    }
    if (selectedValues.some((v) => !v.value)) {
      toast.error("Choose a value for every attribute");
      return;
    }
    if (!locationId) {
      toast.error("Select a location");
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Enter a valid opening quantity");
      return;
    }
    const cost = Number(purchasePrice);
    if (qty > 0 && (!Number.isFinite(cost) || cost < 0)) {
      toast.error("Enter a valid opening unit cost");
      return;
    }

    setSaving(true);
    try {
      let variant: ProductVariant | null = existingVariant;
      if (variant) {
        if (!variant.isActive) {
          toast.error("This variant is archived. Activate it from the family page.");
          setSaving(false);
          return;
        }
        await postOpening(variant.id, locationId, qty, cost);
        toast.success(
          qty > 0
            ? "Existing variant selected and opening stock posted"
            : "Existing variant selected",
        );
        router.push(`/items/${variant.id}`);
        return;
      }

      if (!sku.trim()) {
        toast.error("Enter a SKU for the new variant");
        setSaving(false);
        return;
      }

      const saved = await api<ProductFamily>(
        `/product-families/${family.id}/variants`,
        {
          method: "POST",
          body: {
            locationId,
            variants: [
              {
                values: selectedValues,
                sku: sku.trim(),
                barcode: barcode.trim() || undefined,
              },
            ],
          },
        },
      );
      const key = combinationKey(selectedValues);
      variant =
        saved.variants?.find(
          (v) => combinationKey(v.variantValues) === key,
        ) ?? null;
      if (!variant) {
        toast.success("Variant created");
        router.push(`/products/${family.id}`);
        return;
      }
      await postOpening(variant.id, locationId, qty, cost);
      toast.success(
        qty > 0 ? "Variant created with opening stock" : "Variant created",
      );
      router.push(`/items/${variant.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageForm
      onSubmit={handleSubmit}
      aside={
        <FormSummary
          rows={[
            { label: "Family", value: family?.name },
            {
              label: "Variant",
              value: selectedValues
                .map((v) => `${attributeName(v.attributeId)}: ${v.value}`)
                .join(" · "),
            },
            {
              label: "Stock unit",
              value: family
                ? `${family.stockUnit.name} (${family.stockUnit.symbol})`
                : null,
            },
            {
              label: "Status",
              value: existingVariant
                ? "Already configured — will reuse SKU"
                : "New variant",
            },
            {
              label: "Opening qty",
              value: `${formatQty(quantity)} ${family?.stockUnit.symbol ?? ""}`,
            },
          ]}
          note="Attributes come from the product family. Each combination is one stockable SKU, same as Odoo / ERPNext."
        />
      }
    >
      <PageFormCard>
        <PageFormSection
          title="Product family"
          description="Pick a family you already configured, then choose one value for each attribute."
        >
          <FormGrid>
            <FormField
              label="Product family"
              required
              className="sm:col-span-2"
              hint={
                activeFamilies.length
                  ? undefined
                  : "No families yet. Create attributes and a family first."
              }
            >
              <Select
                value={familyId || undefined}
                onValueChange={setFamilyId}
                disabled={familiesLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue
                    placeholder={
                      familiesLoading
                        ? "Loading families…"
                        : "Select product family"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {activeFamilies.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} · {f.stockUnit.symbol}
                      {f.variantCount != null ? ` · ${f.variantCount} variants` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                <Link href="/products/new" className="text-primary underline">
                  New product family
                </Link>
                {" · "}
                <Link
                  href="/product-attributes"
                  className="text-primary underline"
                >
                  Manage attributes
                </Link>
              </p>
            </FormField>
          </FormGrid>
        </PageFormSection>

        {family && (
          <PageFormSection
            title="Attributes"
            description={
              detailLoading
                ? "Loading family variants…"
                : existingVariant
                  ? "This combination already exists and will be reused."
                  : "Choose the variant to create."
            }
          >
            <FormGrid>
              {family.attributes.map((a) => (
                <FormField
                  key={a.attributeId}
                  label={attributeName(a.attributeId)}
                  required
                >
                  <Select
                    value={valuesByAttribute[a.attributeId] || a.values[0]}
                    onValueChange={(value) =>
                      setValuesByAttribute((prev) => ({
                        ...prev,
                        [a.attributeId]: value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {a.values.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ))}
              {!existingVariant && (
                <>
                  <FormField label="SKU" required>
                    <Input
                      className="h-10"
                      value={sku}
                      onChange={(e) => {
                        setSkuTouched(true);
                        setSku(e.target.value);
                      }}
                      required
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
                </>
              )}
              {existingVariant && (
                <p className="sm:col-span-2 text-sm text-muted-foreground">
                  Existing SKU:{" "}
                  <span className="font-medium text-foreground">
                    {existingVariant.sku}
                  </span>
                  {" · "}
                  <Link
                    href={`/items/${existingVariant.id}`}
                    className="text-primary underline"
                  >
                    Open item
                  </Link>
                </p>
              )}
            </FormGrid>
          </PageFormSection>
        )}

        <PageFormSection
          title="Opening stock"
          description="Optional. Leave quantity at zero if you will receive stock later."
        >
          <FormGrid>
            <FormField label="Location" required>
              <Select
                value={locationId || undefined}
                onValueChange={setLocationId}
                disabled={locationsLoading}
              >
                <SelectTrigger className="h-10">
                  <SelectValue
                    placeholder={
                      locationsLoading ? "Loading…" : "Select location"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(locations ?? []).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Opening quantity">
              <Input
                className="h-10"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </FormField>
            <FormField label="Opening unit cost">
              <Input
                className="h-10"
                type="number"
                min="0"
                step="any"
                value={purchasePrice}
                disabled={Number(quantity) === 0}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </FormField>
          </FormGrid>
        </PageFormSection>
      </PageFormCard>

      <PageFormActions>
        <PageFormCancel href="/inventory" />
        <Button type="submit" disabled={saving || !family} className="min-w-28">
          {saving ? (
            <Spinner className="size-4" />
          ) : existingVariant ? (
            "Use variant"
          ) : (
            "Create variant"
          )}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
