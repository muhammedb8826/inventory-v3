"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FormField,
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import {
  EntitySelectField,
  type EntityOption,
} from "@/components/shared/entity-select-field";
import {
  ItemSearchSelect,
  type ItemSearchOption,
} from "@/components/shared/item-search-select";
import { QuickCustomerDialog } from "@/components/customers/quick-customer-dialog";
import { TransactionUnitField } from "@/components/inventory/transaction-unit-field";
import {
  DEFAULT_INQUIRY_ITEM_TYPES,
  InquiryItemTypeFilter,
  normalizeInquiryItemType,
} from "./inquiry-item-type-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  EMPTY_INQUIRY_LINE,
  INQUIRY_PRIORITIES,
  inquiryStatusLabel,
  type InquiryFormLine,
  type InquiryFormValues,
} from "@/lib/inquiries";
import type { Customer, InquiryPriority, ItemType } from "@/lib/types";
import { PlusIcon, Trash2Icon, PackageIcon } from "lucide-react";
import { InquiryAttachments } from "./inquiry-attachments";
import { resolveItemImageUrl } from "@/lib/inventory-media";
export function InquiryFormFields({
  values,
  onChange,
  mode,
  idPrefix = "inquiry",
  customerOptions,
  userOptions,
  itemOptions,
  itemsLoading,
  onCustomerCreated,
  customers = [],
}: {
  values: InquiryFormValues;
  onChange: (patch: Partial<InquiryFormValues>) => void;
  mode: "create" | "edit";
  idPrefix?: string;
  customerOptions: EntityOption[];
  userOptions: EntityOption[];
  itemOptions: ItemSearchOption[];
  itemsLoading?: boolean;
  onCustomerCreated: (customer: Customer) => void;
  customers?: Customer[];
}) {
  const [itemTypes, setItemTypes] = useState<ItemType[]>(
    DEFAULT_INQUIRY_ITEM_TYPES,
  );
  const selected = values.lines.filter((l) => l.itemId);
  const options = itemOptions.filter(
    (o) =>
      selected.some((l) => l.itemId === o.itemId) ||
      itemTypes.includes(normalizeInquiryItemType(o.itemType)),
  );
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  }, [values]);
  const set = <K extends keyof InquiryFormValues>(
    key: K,
    value: InquiryFormValues[K],
  ) => {
    latest.current = { ...latest.current, [key]: value };
    onChange({ [key]: value });
  };
  function updateLine(index: number, patch: Partial<InquiryFormLine>) {
    const measurementChanged =
      "quantity" in patch || "unitId" in patch || "dimensions" in patch;
    set(
      "lines",
      latest.current.lines.map((l, i) =>
        i === index
          ? {
              ...l,
              ...patch,
              ...(measurementChanged ? { preserveSnapshot: undefined } : {}),
            }
          : l,
      ),
    );
  }
  const productsLocked = !!values.convertedSaleId;
  return (
    <div className="form-layout min-w-0">
      <div className="form-main">
        <PageFormCard>
          <PageFormSection
            title="Basic information"
            description="Select the customer and when the products are needed."
          >
            <FormGrid>
              <EntitySelectField
                label="Customer"
                listHref="/customers"
                listLabel="Customers"
                value={values.customerId}
                onValueChange={(id) => {
                  const customer = customers.find((c) => c.id === id);
                  onChange({
                    customerId: id,
                    ...(customer
                      ? {
                          contactName: customer.name,
                          phone: customer.phone || "",
                          email: customer.email || "",
                        }
                      : {}),
                  });
                }}
                options={customerOptions}
                placeholder="Choose a customer (optional)"
                emptyMessage="No customers"
                quickCreate={
                  <QuickCustomerDialog onCreated={onCustomerCreated} />
                }
              />
              <FormField label="Requested delivery date">
                <Input
                  aria-label="Requested delivery date"
                  type="date"
                  value={values.requestedDeliveryDate}
                  onChange={(e) => set("requestedDeliveryDate", e.target.value)}
                />
              </FormField>
            </FormGrid>
          </PageFormSection>
          <PageFormSection
            title="Products requested"
            description="Choose products and enter quantities in the customer's preferred unit."
          >
            <details className="mb-4 rounded-lg border px-3 py-2 text-sm">
              <summary className="cursor-pointer">Product filters</summary>
              <InquiryItemTypeFilter
                selected={itemTypes}
                onChange={setItemTypes}
                className="mt-3"
              />
            </details>
            <div className="overflow-hidden rounded-xl border">
              <div className="hidden grid-cols-[minmax(0,1.7fr)_5.5rem_minmax(0,1.3fr)_minmax(0,1fr)_2.75rem] gap-3 border-b bg-muted/40 px-3 py-3 text-xs font-medium text-muted-foreground lg:grid">
                <span>Product</span>
                <span>Quantity</span>
                <span>Unit</span>
                <span>Notes</span>
                <span className="sr-only">Actions</span>
              </div>
              <div className="divide-y">
                {values.lines.map((line, index) => (
                  <fieldset
                    key={index}
                    disabled={productsLocked}
                    className="grid min-w-0 grid-cols-2 gap-3 p-3 lg:grid-cols-[minmax(0,1.7fr)_5.5rem_minmax(0,1.3fr)_minmax(0,1fr)_2.75rem] lg:items-start"
                  >
                    <legend className="sr-only">Product {index + 1}</legend>
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      <FormField
                        label="Product"
                        className="lg:[&_label]:sr-only"
                      >
                        <ItemSearchSelect
                          value={line.itemId}
                          onValueChange={(itemId) =>
                            updateLine(index, {
                              itemId,
                              unitId: undefined,
                              unitFactor: undefined,
                              unitSymbol: undefined,
                              dimensions: undefined,
                              savedFactor: undefined,
                            })
                          }
                          options={options.filter(
                            (o) =>
                              o.itemId === line.itemId ||
                              !selected.some((l) => l.itemId === o.itemId),
                          )}
                          loading={itemsLoading}
                          placeholder="Search products..."
                          searchPlaceholder="Search products or SKU..."
                        />
                      </FormField>
                      {itemOptions.find((o) => o.itemId === line.itemId)?.item
                        ?.sku && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          SKU:{" "}
                          {
                            itemOptions.find((o) => o.itemId === line.itemId)
                              ?.item?.sku
                          }
                        </p>
                      )}
                    </div>
                    <FormField
                      label="Quantity"
                      className="lg:[&_label]:sr-only"
                      error={
                        line.itemId &&
                        line.quantity !== "" &&
                        !(Number(line.quantity) > 0)
                          ? "Enter a positive quantity."
                          : undefined
                      }
                    >
                      <Input
                        aria-label={`Quantity for product ${index + 1}`}
                        type="number"
                        min={10 ** -(line.unitPrecision ?? 3)}
                        step={10 ** -(line.unitPrecision ?? 3)}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, {
                            quantity: e.target.value,
                            dimensions: undefined,
                          })
                        }
                      />
                    </FormField>
                    <div className="min-w-0 lg:[&_label]:sr-only">
                      <TransactionUnitField
                        itemId={line.itemId}
                        value={line.unitId}
                        kind="sales"
                        quantity={line.quantity}
                        dimensions={line.dimensions}
                        savedFactor={line.savedFactor}
                        frozenSnapshot={line.preserveSnapshot}
                        preserveHistorical
                        onResolved={(unitId, unitFactor, meta) => {
                          const current = latest.current.lines[index];
                          if (!current || current.unitId !== unitId) return;
                          if (
                            current.unitFactor === unitFactor &&
                            current.unitSymbol === meta.symbol &&
                            current.unitPrecision === meta.decimalPlaces &&
                            current.basePrecision === meta.baseDecimalPlaces &&
                            current.baseSymbol === meta.baseSymbol
                          )
                            return;
                          set(
                            "lines",
                            latest.current.lines.map((line, i) =>
                              i === index
                                ? {
                                    ...line,
                                    unitFactor,
                                    unitSymbol: meta.symbol,
                                    unitPrecision: meta.decimalPlaces,
                                    basePrecision: meta.baseDecimalPlaces,
                                    baseSymbol: meta.baseSymbol,
                                  }
                                : line,
                            ),
                          );
                        }}
                        onAreaChange={(quantity, dimensions) =>
                          updateLine(index, { quantity, dimensions })
                        }
                        onChange={(unitId, unitFactor, _oldFactor, meta) =>
                          updateLine(index, {
                            unitId,
                            unitFactor,
                            unitSymbol: meta?.symbol,
                            unitPrecision: meta?.decimalPlaces,
                            basePrecision: meta?.baseDecimalPlaces,
                            baseSymbol: meta?.baseSymbol,
                            dimensions: undefined,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      <FormField
                        label="Line notes"
                        className="lg:[&_label]:sr-only"
                      >
                        <Input
                          aria-label={`Notes for product ${index + 1}`}
                          value={line.notes}
                          onChange={(e) =>
                            updateLine(index, { notes: e.target.value })
                          }
                          placeholder="Size, finish..."
                        />
                      </FormField>
                      {line.dimensions && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {line.dimensions.widthMetres} m x{" "}
                          {line.dimensions.lengthMetres} m x{" "}
                          {line.dimensions.count}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 justify-self-end text-muted-foreground hover:text-destructive lg:col-span-1"
                      aria-label={`Remove product ${index + 1}`}
                      onClick={() =>
                        set(
                          "lines",
                          values.lines.length === 1
                            ? [{ ...EMPTY_INQUIRY_LINE }]
                            : values.lines.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </fieldset>
                ))}
              </div>
              <div className="border-t bg-muted/10 p-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={productsLocked}
                  onClick={() =>
                    set("lines", [...values.lines, { ...EMPTY_INQUIRY_LINE }])
                  }
                >
                  <PlusIcon className="size-4" />
                  Add product
                </Button>
              </div>
            </div>
            {productsLocked && (
              <p className="mt-3 text-sm text-muted-foreground">
                Products are read-only after conversion to a sale.
              </p>
            )}
          </PageFormSection>
          <PageFormSection
            title="Additional information"
            description="Add requirements, reference files, or optional team settings."
          >
            <FormField
              label="Requirements / remarks"
              hint="Optional when products are selected. Required for a general inquiry."
            >
              <Textarea
                aria-label="Requirements / remarks"
                rows={3}
                maxLength={20000}
                value={values.message}
                onChange={(e) => set("message", e.target.value)}
                placeholder="Dimensions, colors, finishes or delivery instructions..."
              />
            </FormField>
            <InquiryAttachments
              files={values.files}
              attachments={values.attachments}
              inquiryId={values.inquiryId}
              onFilesChange={(files) => set("files", files)}
              onAttachmentsChange={(attachments) =>
                set("attachments", attachments)
              }
              idPrefix={idPrefix}
            />
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Priority, assignment and follow-up
              </summary>
              <div className="mt-4">
                <FormGrid>
                  <FormField label="Priority" htmlFor={`${idPrefix}-priority`}>
                    <select
                      id={`${idPrefix}-priority`}
                      className="app-control h-11 w-full rounded-md border bg-background px-3"
                      value={values.priority}
                      onChange={(e) =>
                        set("priority", e.target.value as InquiryPriority)
                      }
                    >
                      {INQUIRY_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0) + p.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <EntitySelectField
                    label="Assign to"
                    listHref="/users"
                    listLabel="Users"
                    value={values.assignedToUserId}
                    onValueChange={(id) => set("assignedToUserId", id)}
                    options={userOptions}
                    placeholder="Unassigned"
                    emptyMessage="No team members"
                  />
                  <FormField label="Follow-up">
                    <Input
                      aria-label="Follow-up"
                      type="datetime-local"
                      value={values.followUpAt}
                      onChange={(e) => set("followUpAt", e.target.value)}
                    />
                  </FormField>
                  <FormField label="Internal notes">
                    <Textarea
                      aria-label="Internal notes"
                      rows={2}
                      value={values.internalNotes}
                      onChange={(e) => set("internalNotes", e.target.value)}
                      placeholder="Visible to your team only"
                    />
                  </FormField>
                </FormGrid>
              </div>
            </details>
          </PageFormSection>
        </PageFormCard>
      </div>
      <aside className="form-aside min-w-0" aria-label="Inquiry summary">
        <section className="form-summary">
          <h2 className="form-summary-title">Inquiry summary</h2>
          <dl className="form-summary-list">
            <div>
              <dt>Products</dt>
              <dd>{selected.length}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge variant="secondary">
                  {mode === "create"
                    ? "Not submitted"
                    : inquiryStatusLabel(values.status)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>
                {values.priority.charAt(0) +
                  values.priority.slice(1).toLowerCase()}
              </dd>
            </div>
            <div>
              <dt>Requested delivery</dt>
              <dd>{values.requestedDeliveryDate || "Not specified"}</dd>
            </div>
          </dl>
          {values.convertedSaleId && (
            <Link
              className="mt-3 block text-sm text-primary underline"
              href={`/sales/${values.convertedSaleId}`}
            >
              Open linked sale
            </Link>
          )}
        </section>
        <section className="form-summary">
          <h2 className="form-summary-title">Requested products</h2>
          {!selected.length && (
            <p className="text-sm text-muted-foreground">
              Selected products appear here.
            </p>
          )}
          <div className="divide-y">
            {selected.map((line, i) => {
              const option = itemOptions.find((o) => o.itemId === line.itemId),
                src = resolveItemImageUrl(option?.item?.imageUrl);
              return (
                <div
                  key={`${line.itemId}-${i}`}
                  className="flex min-w-0 gap-3 py-3"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/20">
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        width={48}
                        height={48}
                        className="size-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <PackageIcon className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {option?.item?.description ?? option?.label ?? "Product"}
                    </p>
                    {option?.item?.sku && (
                      <p className="text-xs text-muted-foreground">
                        {option.item.sku}
                      </p>
                    )}
                    <p className="text-sm">
                      {line.quantity || "Not specified"}{" "}
                      {line.unitSymbol ?? option?.item?.unit ?? ""}
                    </p>
                    {line.unitFactor && line.unitFactor !== 1 && (
                      <p className="text-xs text-muted-foreground">
                        Stock equivalent:{" "}
                        {Number(
                          (
                            Number(line.quantity || 0) * line.unitFactor
                          ).toPrecision(12),
                        )}{" "}
                        {line.baseSymbol}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="form-summary">
          <h2 className="form-summary-title">Next steps</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Save the customer request.</li>
            <li>Review and confirm requirements.</li>
            <li>Sell from stock or plan production.</li>
          </ol>
        </section>
      </aside>
    </div>
  );
}
