"use client";
import { use } from "react";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { RecordActivity } from "@/components/shared/record-metadata";
import {
  PageFormCard,
  PageFormSection,
  FormField,
  FormGrid,
} from "@/components/shared/page-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ItemUnitSettings } from "@/components/inventory/item-unit-settings";
import { UnitSelect } from "@/components/inventory/unit-select";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api";
import {
  resolveItemImageUrl,
  validateItemImageFile,
  ITEM_IMAGE_ACCEPT,
} from "@/lib/inventory-media";
import { useAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { formatQty, formatMoney, errorMessage } from "@/lib/format";
import type {
  Item,
  ItemType,
  UnitGroup,
  UnitOfMeasure,
  StockRecord,
} from "@/lib/types";
import { toast } from "sonner";
type CatalogItem = Item & {
  stock?: {
    onHand: string;
    reserved: string;
    available: string;
    stockValue: string;
  };
  stockBalances?: StockRecord[];
  salesPrice: string | null;
  isActive: boolean;
  stockUnitLocked: boolean;
  productFamilyId?: string;
  unitGroupId?: string;
  createdAt?: string;
  updatedAt?: string;
};
export default function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, error, loading, reload } = useFetch<CatalogItem>(
    () => api(`/items/${id}`),
    [id],
  );
  return (
    <AppShell
      title={data?.description ?? "Item details"}
      subtitle="Product details, stock, units and pricing."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: data?.description ?? "Product" },
      ]}
    >
      <PermissionGate permission="inventory.read" showDenied>
        <Button asChild variant="outline" className="mb-5">
          <Link href="/inventory">Back to inventory</Link>
        </Button>
        {error ? (
          <p role="alert">{error}</p>
        ) : loading ? (
          <p>Loading item…</p>
        ) : data ? (
          <ItemEditor
            key={`${id}:${data.updatedAt}`}
            item={data}
            reload={reload}
          />
        ) : null}
      </PermissionGate>
    </AppShell>
  );
}
function ItemEditor({
  item,
  reload,
}: {
  item: CatalogItem;
  reload: () => unknown;
}) {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "inventory.write"),
    canPrice = hasPermission(user, "pricing.write");
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false);
  const [name, setName] = useState(item.description),
    [sku, setSku] = useState(item.sku ?? ""),
    [barcode, setBarcode] = useState(item.barcode ?? ""),
    [active, setActive] = useState(item.isActive),
    [type, setType] = useState<ItemType>(item.itemType ?? "OTHER");
  const [unitId, setUnitId] = useState(item.unitId ?? ""),
    [groupId, setGroupId] = useState(item.unitGroupId ?? ""),
    [price, setPrice] = useState(item.salesPrice ?? "");
  const { data: units } = useFetch<UnitOfMeasure[]>(() => api("/units"), []);
  const { data: groups } = useFetch<UnitGroup[]>(
    () => api("/units/groups"),
    [],
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/items/${item.id}`, {
        method: "PATCH",
        body: {
          description: name,
          sku: sku || null,
          barcode: barcode || null,
          isActive: active,
          ...(!item.productFamilyId
            ? { itemType: type, unitId, unitGroupId: groupId || null }
            : {}),
        },
      });
      toast.success("Item updated");
      setEditing(false);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [
            "On hand",
            `${formatQty(item.stock?.onHand ?? 0)} ${item.stockUnit?.symbol ?? item.unit ?? ""}`,
          ],
          ["Available", formatQty(item.stock?.available ?? 0)],
          ["Reserved", formatQty(item.stock?.reserved ?? 0)],
          ["Stock value", formatMoney(item.stock?.stockValue ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <RecordActivity record={item} />
      <div className="flex flex-wrap gap-2">
        {canWrite && (
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel editing" : "Edit item"}
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/inventory?tab=movements&itemId=${item.id}`}>
            Stock history
          </Link>
        </Button>
        {item.productFamilyId && (
          <Button variant="outline" asChild>
            <Link href={`/products/${item.productFamilyId}`}>
              Product family
            </Link>
          </Button>
        )}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <form onSubmit={save}>
          <PageFormCard>
            <PageFormSection
              title="Item information"
              description="SKU identifies this item across all warehouses, inquiries and documents."
            >
              <FormGrid>
                <FormField label="Item name">
                  <Input
                    required
                    value={name}
                    disabled={!editing}
                    onChange={(e) => setName(e.target.value)}
                  />
                </FormField>
                <FormField label="SKU">
                  <Input
                    value={sku}
                    disabled={!editing}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </FormField>
                <FormField label="Barcode">
                  <Input
                    value={barcode}
                    disabled={!editing}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </FormField>
                <FormField label="Item type">
                  <NativeSelect
                    value={type}
                    disabled={!editing || !!item.productFamilyId}
                    onChange={(e) => setType(e.target.value as ItemType)}
                  >
                    <option value="RAW">Raw material</option>
                    <option value="SEMI">Semi-finished</option>
                    <option value="FINISHED">Finished good</option>
                    <option value="OTHER">Other</option>
                  </NativeSelect>
                </FormField>
                <FormField label="Status">
                  <NativeSelect
                    value={active ? "true" : "false"}
                    disabled={!editing}
                    onChange={(e) => setActive(e.target.value === "true")}
                  >
                    <option value="true">Active</option>
                    <option value="false">Archived</option>
                  </NativeSelect>
                </FormField>
              </FormGrid>
            </PageFormSection>
            <PageFormSection
              title="Units of measure"
              description={
                item.stockUnitLocked
                  ? "Stock unit is locked by existing documents, transactions or family configuration. Same-category conversions remain available."
                  : "Choose the stock unit and a reusable conversion configuration."
              }
            >
              <FormGrid>
                <FormField label="Base stock unit">
                  <UnitSelect
                    units={units ?? []}
                    value={unitId}
                    onChange={setUnitId}
                    disabled={!editing || item.stockUnitLocked || !!groupId}
                  />
                </FormField>
                <FormField label="Reusable unit configuration">
                  <NativeSelect
                    value={groupId}
                    disabled={!editing || !!item.productFamilyId}
                    onChange={(e) => {
                      const g = groups?.find((g) => g.id === e.target.value);
                      setGroupId(e.target.value);
                      if (g) setUnitId(g.baseUnitId);
                    }}
                  >
                    <option value="">Standard category conversions</option>
                    {groups
                      ?.filter(
                        (g) =>
                          g.isActive &&
                          (!item.stockUnitLocked ||
                            g.baseUnitId === item.unitId),
                      )
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </NativeSelect>
                </FormField>
              </FormGrid>
              <p className="mt-3 text-sm text-muted-foreground">
                Purchases, sales and BOM quantities convert to this stock unit.{" "}
                <Link href="/units" className="text-primary underline">
                  Manage categories and conversions
                </Link>
              </p>
            </PageFormSection>
            {editing && (
              <div className="flex justify-end border-t p-5">
                <Button disabled={busy} type="submit">
                  Save item
                </Button>
              </div>
            )}
          </PageFormCard>
        </form>
        <div className="space-y-5">
          <PageFormCard>
            <PageFormSection title="Item image">
              {resolveItemImageUrl(item.imageUrl) ? (
                <img
                  src={resolveItemImageUrl(item.imageUrl)!}
                  alt={item.description}
                  className="aspect-square w-full rounded-xl border bg-muted/20 object-contain p-3"
                />
              ) : (
                <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                  No image
                </p>
              )}
              {canWrite && (
                <Input
                  aria-label="Upload item image"
                  className="mt-4"
                  type="file"
                  accept={ITEM_IMAGE_ACCEPT}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const error = validateItemImageFile(f);
                    if (error) {
                      toast.error(error);
                      return;
                    }
                    const body = new FormData();
                    body.append("file", f);
                    try {
                      await api(`/items/${item.id}/image`, {
                        method: "POST",
                        body,
                      });
                      reload();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  }}
                />
              )}
            </PageFormSection>
          </PageFormCard>
          <PageFormCard>
            <PageFormSection
              title="Sales pricing"
              description={`Standard price per ${item.stockUnit?.symbol ?? item.unit}. A different price or no configured price requires a separate user's approval.`}
            >
              {item.productFamilyId && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Family-derived price:{" "}
                  {item.effectiveSalesPrice ?? "Not configured"}. Leave the
                  override blank to use family pricing.
                </p>
              )}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await api(`/items/${item.id}/price`, {
                      method: "PATCH",
                      body: { salesPrice: price === "" ? null : Number(price) },
                    });
                    toast.success("Standard price saved");
                    reload();
                  } catch (e) {
                    toast.error(errorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <FormField label="Standard sales price">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    disabled={!canPrice}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Approval required"
                  />
                </FormField>
                {canPrice && (
                  <Button className="mt-3" disabled={busy}>
                    Save price
                  </Button>
                )}
              </form>
            </PageFormSection>
          </PageFormCard>
        </div>
      </div>
      <PageFormCard>
        <PageFormSection
          title="Stock by location"
          description="Quantities are shown in this product's stock unit. Receive a purchase or complete production to add stock."
        >
          {item.stockBalances?.length ? (
            <div className="space-y-3">
              {item.stockBalances.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {s.location?.name ?? "Location"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatQty(s.quantity)} on hand ?{" "}
                      {formatQty(s.reserved ?? 0)} reserved
                    </p>
                  </div>
                  <PermissionGate permission="inventory.write">
                    <Button variant="outline" asChild>
                      <Link href={`/inventory/${s.id}/edit`}>
                        Location settings
                      </Link>
                    </Button>
                  </PermissionGate>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No stock held at your permitted locations. This product is ready
              to use in purchases, sales and production.
            </p>
          )}
        </PageFormSection>
      </PageFormCard>
      {!item.unitGroupId && !item.productFamilyId && canWrite && (
        <PageFormCard>
          <ItemUnitSettings itemId={item.id} onSaved={() => void reload()} />
        </PageFormCard>
      )}
    </div>
  );
}
