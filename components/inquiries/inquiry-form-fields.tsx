"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FormField,
  FormGrid,
  PageFormCard,
  PageFormSection,
} from "@/components/shared/page-form";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import type { ItemSearchOption } from "@/components/shared/item-search-select";
import { QuickCustomerDialog } from "@/components/customers/quick-customer-dialog";
import {
  DEFAULT_INQUIRY_ITEM_TYPES,
  InquiryItemTypeFilter,
  normalizeInquiryItemType,
} from "@/components/inquiries/inquiry-item-type-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPTY_INQUIRY_LINE,
  INQUIRY_PRIORITIES,
  INQUIRY_STATUSES,
  inquiryStatusLabel,
  type InquiryFormLine,
  type InquiryFormValues,
} from "@/lib/inquiries";
import type {
  Customer,
  InquiryPriority,
  InquiryStatus,
  ItemType,
} from "@/lib/types";
import type { EntityOption } from "@/components/shared/entity-select-field";
import { PlusIcon, Trash2Icon } from "lucide-react";

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
}) {
  const [itemTypes, setItemTypes] = useState<ItemType[]>(
    DEFAULT_INQUIRY_ITEM_TYPES,
  );

  function set<K extends keyof InquiryFormValues>(
    key: K,
    value: InquiryFormValues[K],
  ) {
    onChange({ [key]: value });
  }

  function updateLine(index: number, patch: Partial<InquiryFormLine>) {
    set(
      "lines",
      values.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line,
      ),
    );
  }

  const selectedItemIds = useMemo(
    () => new Set(values.lines.map((l) => l.itemId).filter(Boolean)),
    [values.lines],
  );

  const filteredItemOptions = useMemo(() => {
    const allowed = new Set(itemTypes);
    return itemOptions.filter((opt) => {
      if (selectedItemIds.has(opt.itemId)) return true;
      return allowed.has(normalizeInquiryItemType(opt.itemType));
    });
  }, [itemOptions, itemTypes, selectedItemIds]);

  return (
    <PageFormCard>
      <PageFormSection
        title="Contact"
        description="Who submitted this request — phone or email required for follow-up."
      >
        <FormGrid cols={3}>
          <FormField
            label="Contact name"
            required
            htmlFor={`${idPrefix}-name`}
            className="sm:col-span-1 lg:col-span-1"
          >
            <Input
              id={`${idPrefix}-name`}
              required
              className="h-10"
              placeholder="Full name"
              value={values.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </FormField>
          <FormField label="Phone" htmlFor={`${idPrefix}-phone`}>
            <Input
              id={`${idPrefix}-phone`}
              type="tel"
              className="h-10"
              placeholder="0911…"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FormField>
          <FormField label="Email" htmlFor={`${idPrefix}-email`}>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              className="h-10"
              placeholder="name@company.com"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FormField>
        </FormGrid>
      </PageFormSection>

      <PageFormSection
        title="Request"
        description="What they are asking for — used on quotes and production handoff."
      >
        <FormGrid cols={1}>
          <FormField label="Subject" required htmlFor={`${idPrefix}-subject`}>
            <Input
              id={`${idPrefix}-subject`}
              required
              className="h-10"
              placeholder="e.g. Quote for dining set"
              value={values.subject}
              onChange={(e) => set("subject", e.target.value)}
            />
          </FormField>
          <FormField label="Message" required htmlFor={`${idPrefix}-message`}>
            <Textarea
              id={`${idPrefix}-message`}
              required
              rows={4}
              className="min-h-[6.5rem] resize-y"
              placeholder="Details, dimensions, finish, delivery notes…"
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </FormField>
        </FormGrid>
      </PageFormSection>

      <PageFormSection
        title="Interested items"
        description="Customer inquiries default to finished goods. Enable Semi / Raw / Other when you need components or special catalog rows."
      >
        <InquiryItemTypeFilter
          selected={itemTypes}
          onChange={setItemTypes}
          className="mb-4"
        />

        <div className="overflow-hidden rounded-lg border border-[var(--frappe-border)] bg-[var(--frappe-surface)]">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_6.5rem_minmax(0,1fr)_2.75rem] gap-3 border-b border-[var(--frappe-border)] bg-[var(--frappe-section-head)] px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--frappe-text-muted)] sm:grid">
            <span>Item</span>
            <span>Qty</span>
            <span>Line notes</span>
            <span className="sr-only">Remove</span>
          </div>
          <div className="divide-y divide-border/70">
            {values.lines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.6fr)_6.5rem_minmax(0,1fr)_2.75rem] sm:items-start"
              >
                <div className="min-w-0 space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground sm:hidden">
                    Item
                  </span>
                  <ItemSearchSelect
                    value={line.itemId}
                    onValueChange={(itemId) => updateLine(index, { itemId })}
                    options={filteredItemOptions}
                    loading={itemsLoading}
                    placeholder="Search finished goods…"
                    searchPlaceholder="Search name or SKU…"
                    emptyMessage={
                      itemTypes.length === 1 && itemTypes[0] === "FINISHED"
                        ? "No finished goods match — enable Semi/Raw above if needed."
                        : "No items match the selected types."
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground sm:hidden">
                    Qty
                  </span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, { quantity: e.target.value })
                    }
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground sm:hidden">
                    Notes
                  </span>
                  <Input
                    value={line.notes}
                    onChange={(e) =>
                      updateLine(index, { notes: e.target.value })
                    }
                    placeholder="Size, color…"
                    className="h-10"
                  />
                </div>
                <div className="flex sm:justify-end sm:pt-0.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-10 text-muted-foreground hover:text-destructive"
                    disabled={values.lines.length <= 1}
                    onClick={() =>
                      set(
                        "lines",
                        values.lines.length <= 1
                          ? values.lines
                          : values.lines.filter((_, i) => i !== index),
                      )
                    }
                    aria-label="Remove line"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/70 bg-muted/20 px-3 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-primary"
              onClick={() =>
                set("lines", [...values.lines, { ...EMPTY_INQUIRY_LINE }])
              }
            >
              <PlusIcon className="size-4" />
              Add line
            </Button>
          </div>
        </div>
      </PageFormSection>

      <PageFormSection
        title="Assignment"
        description="Link a customer account and owner so the inquiry can move into production or sale."
      >
        <FormGrid className="gap-5">
          <FormField label="Priority">
            <Select
              value={values.priority}
              onValueChange={(v) => set("priority", v as InquiryPriority)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {INQUIRY_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Follow-up" htmlFor={`${idPrefix}-follow-up`}>
            <Input
              id={`${idPrefix}-follow-up`}
              type="datetime-local"
              className="h-10"
              value={values.followUpAt}
              onChange={(e) => set("followUpAt", e.target.value)}
            />
          </FormField>
          <EntitySelectField
            label="Customer"
            fullWidth
            stackedActions
            value={values.customerId}
            onValueChange={(id) => set("customerId", id)}
            options={customerOptions}
            listHref="/customers"
            listLabel="Customers"
            emptyMessage="No customers"
            placeholder="Select customer…"
            quickCreate={
              <QuickCustomerDialog onCreated={onCustomerCreated} />
            }
          />
          <EntitySelectField
            label="Assign to"
            fullWidth
            stackedActions
            value={values.assignedToUserId}
            onValueChange={(id) => set("assignedToUserId", id)}
            options={userOptions}
            listHref="/users"
            listLabel="Users"
            emptyMessage="No users"
            placeholder="Select assignee…"
          />
          <FormField
            label="Internal notes"
            htmlFor={`${idPrefix}-notes`}
            className="sm:col-span-2"
          >
            <Textarea
              id={`${idPrefix}-notes`}
              rows={3}
              className="min-h-[5rem] resize-y"
              placeholder="Visible to your team only"
              value={values.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
            />
          </FormField>
        </FormGrid>
      </PageFormSection>

      {mode === "edit" ? (
        <PageFormSection
          title="Workflow"
          description="Status and linked sale after conversion."
        >
          <FormGrid>
            <FormField label="Status">
              <Select
                value={values.status}
                onValueChange={(v) => set("status", v as InquiryStatus)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {INQUIRY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {inquiryStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="Converted sale ID"
              htmlFor={`${idPrefix}-sale`}
            >
              <Input
                id={`${idPrefix}-sale`}
                className="h-10 font-mono text-xs"
                value={values.convertedSaleId}
                onChange={(e) => set("convertedSaleId", e.target.value)}
                placeholder="Sale UUID"
              />
            </FormField>
            {values.convertedSaleId.trim() ? (
              <div className="sm:col-span-2">
                <Link
                  href={`/sales/${values.convertedSaleId.trim()}`}
                  className="text-sm text-primary hover:underline"
                >
                  Open linked sale →
                </Link>
              </div>
            ) : null}
          </FormGrid>
        </PageFormSection>
      ) : null}
    </PageFormCard>
  );
}
