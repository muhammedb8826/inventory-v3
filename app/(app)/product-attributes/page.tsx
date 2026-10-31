"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { DataCardTable } from "@/components/shared/data-card-table";
import {
  PageForm,
  PageFormCard,
  PageFormSection,
  FormField,
  FormGrid,
  PageFormActions,
} from "@/components/shared/page-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { useFetch } from "@/hooks/use-fetch";
import type { ProductAttribute } from "@/lib/product-variants";

function AttributeEditor({
  attribute,
  onSaved,
  onCancel,
}: {
  attribute: ProductAttribute | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(attribute?.name ?? "");
  const [values, setValues] = useState(attribute?.values.join(", ") ?? "");
  const [active, setActive] = useState(attribute?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api(
        attribute
          ? `/product-families/attributes/${attribute.id}`
          : "/product-families/attributes",
        {
          method: attribute ? "PATCH" : "POST",
          body: {
            name,
            values: values.split(",").map((v) => v.trim()),
            isActive: active,
          },
        },
      );
      toast.success("Attribute saved");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <PageForm onSubmit={save}>
      <PageFormCard>
        <PageFormSection
          title={attribute ? `Edit ${attribute.name}` : "New attribute"}
          description="Configure once and reuse across product families. Values used by a family cannot be removed or renamed."
        >
          <FormGrid>
            <FormField label="Attribute name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
                placeholder="e.g. Colour"
              />
            </FormField>
            <FormField
              label="Values"
              required
              hint="Separate values with commas. For example: Natural, Black, White."
            >
              <Input
                value={values}
                onChange={(e) => setValues(e.target.value)}
                required
                placeholder="Natural, Black, White"
              />
            </FormField>
          </FormGrid>
          <label className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Available for new variants
          </label>
        </PageFormSection>
      </PageFormCard>
      <PageFormActions>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save attribute"}
        </Button>
      </PageFormActions>
    </PageForm>
  );
}
export default function ProductAttributesPage() {
  const { data, loading, error, reload } = useFetch<ProductAttribute[]>(() =>
    api("/product-families/attributes"),
  );
  const [editing, setEditing] = useState<ProductAttribute | null | undefined>(
    undefined,
  );
  return (
    <AppShell
      title="Product attributes"
      subtitle="Reusable options such as Colour, Material, Finish and Size."
      actions={<Button onClick={() => setEditing(null)}>New attribute</Button>}
      breadcrumbs={[
        { label: "Product families", href: "/products" },
        { label: "Attributes" },
      ]}
    >
      <PermissionGate permission="inventory.write">
        {editing !== undefined ? (
          <AttributeEditor
            key={editing?.id ?? "new"}
            attribute={editing}
            onSaved={() => {
              setEditing(undefined);
              void reload();
            }}
            onCancel={() => setEditing(undefined)}
          />
        ) : (
          <>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <DataCardTable<ProductAttribute>
              storageKey="product-attributes"
              rows={data}
              loading={loading}
              emptyTitle="No attributes yet"
              emptyDescription="Create your first attribute, then reuse it across product families."
              columns={[
                {
                  key: "name",
                  header: "Attribute",
                  cell: (a) => (
                    <button
                      className="font-medium text-primary hover:underline"
                      onClick={() => setEditing(a)}
                    >
                      {a.name}
                    </button>
                  ),
                },
                {
                  key: "values",
                  header: "Values",
                  cell: (a) => (
                    <div className="flex flex-wrap gap-1">
                      {a.values.map((v) => (
                        <Badge key={v} variant="secondary">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "active",
                  header: "Status",
                  cell: (a) => (a.isActive ? "Active" : "Inactive"),
                },
              ]}
            />
            <Button className="mt-4" variant="outline" asChild>
              <Link href="/products">Back to product families</Link>
            </Button>
          </>
        )}
      </PermissionGate>
    </AppShell>
  );
}
