"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PageForm,
  PageFormCard,
  PageFormSection,
  FormField,
  FormGrid,
  FormSummary,
  PageFormActions,
  PageFormCancel,
} from "@/components/shared/page-form";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnitSelect } from "@/components/inventory/unit-select";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { ITEM_TYPE_OPTIONS } from "@/lib/item-types";
import type { ItemType, UnitGroup, UnitOfMeasure } from "@/lib/types";
import type {
  ProductAttribute,
  ProductFamily,
  FamilyAttribute,
} from "@/lib/product-variants";
import { useFetch } from "@/hooks/use-fetch";

export function ProductFamilyForm({ family }: { family?: ProductFamily }) {
  const router = useRouter();
  const { data: definitions, error: attributesError } = useFetch<
    ProductAttribute[]
  >(() => api("/product-families/attributes"));
  const { data: units } = useFetch<UnitOfMeasure[]>(() => api("/units"));
  const { data: groups } = useFetch<UnitGroup[]>(() => api("/units/groups"));
  const [name, setName] = useState(family?.name ?? "");
  const [description, setDescription] = useState(family?.description ?? "");
  const [itemType, setItemType] = useState<ItemType>(
    family?.itemType ?? "FINISHED",
  );
  const [unitId, setUnitId] = useState(family?.unitId ?? "");
  const [groupId, setGroupId] = useState(family?.unitGroupId ?? "");
  const [attributes, setAttributes] = useState<FamilyAttribute[]>(
    family?.attributes ?? [],
  );
  const [active, setActive] = useState(family?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const locked = !!family?.variants?.length;
  const baseId = unitId || units?.find((u) => u.code === "PCS")?.id || "";
  const chosenValues = new Set(
    family?.variants?.flatMap((v) =>
      v.variantValues.map((value) => `${value.attributeId}:${value.value}`),
    ) ?? [],
  );
  function toggleValue(attributeId: string, value: string, checked: boolean) {
    setAttributes((old) => {
      const values =
        old.find((a) => a.attributeId === attributeId)?.values ?? [];
      const next = checked
        ? [...values, value]
        : values.filter((v) => v !== value);
      return [
        ...old.filter((a) => a.attributeId !== attributeId),
        ...(next.length ? [{ attributeId, values: next }] : []),
      ];
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!attributes.length || !baseId) {
      toast.error("Select a stock unit and at least one attribute value");
      return;
    }
    setSaving(true);
    try {
      const saved = await api<ProductFamily>(
        family ? `/product-families/${family.id}` : "/product-families",
        {
          method: family ? "PATCH" : "POST",
          body: {
            name,
            description,
            itemType,
            unitId: baseId,
            unitGroupId: groupId || null,
            attributes,
            isActive: active,
          },
        },
      );
      toast.success(
        family ? "Product family updated" : "Product family created",
      );
      router.push(`/products/${saved.id}`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <PageForm
      onSubmit={save}
      aside={
        <FormSummary
          rows={[
            { label: "Family", value: name },
            { label: "Attributes", value: attributes.length },
            {
              label: "Existing variants",
              value: family?.variants?.length ?? 0,
            },
          ]}
          note="Choose the combinations to create on the next page. Each variant gets a separate SKU and stock record."
        />
      }
    >
      <PageFormCard>
        <PageFormSection
          title="Product family"
          description="Shared information for a set of related products. Existing items remain separate stock records."
        >
          <FormGrid>
            <FormField label="Family name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={160}
                required
                placeholder="e.g. Dining chair"
              />
            </FormField>
            <FormField
              label="Item type"
              hint={
                locked
                  ? "Protected because variants already exist."
                  : "Finished goods are final sellable products."
              }
            >
              <NativeSelect
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={itemType}
                disabled={locked}
                onChange={(e) => setItemType(e.target.value as ItemType)}
              >
                {ITEM_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <Textarea
                value={description}
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional product family notes"
              />
            </FormField>
          </FormGrid>
        </PageFormSection>
        <PageFormSection
          title="Shared unit configuration"
          description="All variants inherit the same base stock unit and reusable conversions. Colours and sizes are attributes, not units."
        >
          <FormGrid>
            <FormField label="Unit configuration">
              <NativeSelect
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={groupId}
                disabled={locked}
                onChange={(e) => {
                  const group = groups?.find((g) => g.id === e.target.value);
                  setGroupId(group?.id ?? "");
                  if (group) setUnitId(group.baseUnitId);
                }}
              >
                <option value="">Stock unit only</option>
                {groups
                  ?.filter(
                    (g) =>
                      (g.isActive && !g.requiresReview) || g.id === groupId,
                  )
                  .map((g) => (
                    <option key={g.id} value={g.id} disabled={g.requiresReview}>
                      {g.name} ({g.baseUnit.symbol} base)
                    </option>
                  ))}
              </NativeSelect>
            </FormField>
            <FormField label="Base stock unit" required>
              <UnitSelect
                value={baseId}
                units={units ?? []}
                onChange={setUnitId}
                disabled={locked || !!groupId}
              />
            </FormField>
          </FormGrid>
          <Link className="text-sm text-primary underline" href="/units">
            Manage units and conversions
          </Link>
        </PageFormSection>
        <PageFormSection
          title="Attributes and values"
          description="Select the options this family offers. You will choose which combinations actually exist before creating variants."
        >
          {attributesError && (
            <p role="alert" className="text-destructive">
              {attributesError}
            </p>
          )}
          <div className="space-y-4">
            {definitions
              ?.filter(
                (a) =>
                  a.isActive || attributes.some((s) => s.attributeId === a.id),
              )
              .map((a) => (
                <fieldset key={a.id} className="rounded-xl border p-4">
                  <legend className="px-1 text-sm font-medium">
                    {a.name}
                    {!a.isActive ? " (inactive)" : ""}
                  </legend>
                  <div className="flex flex-wrap gap-3">
                    {a.values.map((value) => (
                      <label
                        key={value}
                        className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={attributes.some(
                            (s) =>
                              s.attributeId === a.id &&
                              s.values.includes(value),
                          )}
                          disabled={
                            chosenValues.has(`${a.id}:${value}`) ||
                            !a.isActive ||
                            (locked &&
                              !family?.attributes.some(
                                (selected) => selected.attributeId === a.id,
                              ))
                          }
                          onChange={(e) =>
                            toggleValue(a.id, value, e.target.checked)
                          }
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
          </div>
          {!definitions?.length && (
            <p className="text-sm text-muted-foreground">
              Create an attribute such as Colour, Material or Size first.
            </p>
          )}
          {locked && (
            <p className="text-sm text-muted-foreground">
              Values used by existing variants are protected. Adding another
              attribute requires a new product family.
            </p>
          )}
          <Link
            className="text-sm text-primary underline"
            href="/product-attributes"
          >
            Configure reusable attributes
          </Link>
        </PageFormSection>
        {family && (
          <PageFormSection
            title="Availability"
            description="Archiving the family stops new variant creation. Existing variants and transactions remain unchanged."
          >
            <label className="flex min-h-10 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Active family
            </label>
          </PageFormSection>
        )}
      </PageFormCard>
      <PageFormActions>
        <PageFormCancel
          href={family ? `/products/${family.id}` : "/products"}
        />
        <Button type="submit" disabled={saving || !definitions || !units}>
          {saving ? "Saving..." : family ? "Save changes" : "Create family"}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
