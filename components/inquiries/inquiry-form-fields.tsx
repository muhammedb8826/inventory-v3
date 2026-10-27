"use client";

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
import type { Customer, InquiryPriority, InquiryStatus } from "@/lib/types";
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
  onCustomerCreated,
}: {
  values: InquiryFormValues;
  onChange: (patch: Partial<InquiryFormValues>) => void;
  mode: "create" | "edit";
  idPrefix?: string;
  customerOptions: EntityOption[];
  userOptions: EntityOption[];
  itemOptions: ItemSearchOption[];
  onCustomerCreated: (customer: Customer) => void;
}) {
  function set<K extends keyof InquiryFormValues>(
    key: K,
    value: InquiryFormValues[K]
  ) {
    onChange({ [key]: value });
  }

  function updateLine(index: number, patch: Partial<InquiryFormLine>) {
    set(
      "lines",
      values.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line
      )
    );
  }

  return (
    <PageFormCard>
      <PageFormSection title="Contact">
        <FormGrid>
          <FormField label="Contact name" required htmlFor={`${idPrefix}-name`}>
            <Input
              id={`${idPrefix}-name`}
              required
              value={values.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </FormField>
          <FormField label="Phone" htmlFor={`${idPrefix}-phone`}>
            <Input
              id={`${idPrefix}-phone`}
              type="tel"
              placeholder="0911…"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FormField>
          <FormField label="Email" htmlFor={`${idPrefix}-email`}>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FormField>
        </FormGrid>
        <p className="mt-3 text-xs text-muted-foreground">
          Include at least a phone number or email so the team can follow up.
        </p>
      </PageFormSection>

      <PageFormSection title="Request">
        <FormGrid cols={1}>
          <FormField label="Subject" required htmlFor={`${idPrefix}-subject`}>
            <Input
              id={`${idPrefix}-subject`}
              required
              value={values.subject}
              onChange={(e) => set("subject", e.target.value)}
            />
          </FormField>
          <FormField label="Message" required htmlFor={`${idPrefix}-message`}>
            <Textarea
              id={`${idPrefix}-message`}
              required
              rows={4}
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </FormField>
        </FormGrid>
      </PageFormSection>

      <PageFormSection
        title="Interested items"
        description="Zero or more catalog products. Leave blank if this is a general question."
      >
        <div className="overflow-hidden rounded-xl border">
          <div className="hidden grid-cols-[minmax(0,1fr)_7rem_minmax(0,10rem)_2.5rem] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
            <span>Item</span>
            <span>Qty</span>
            <span>Notes</span>
            <span className="sr-only">Remove</span>
          </div>
          <div className="divide-y">
            {values.lines.map((line, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,10rem)_2.5rem] sm:items-center"
              >
                <ItemSearchSelect
                  value={line.itemId}
                  onValueChange={(itemId) => updateLine(index, { itemId })}
                  options={itemOptions}
                  placeholder="Select item…"
                  searchPlaceholder="Search catalog…"
                />
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
                <Input
                  value={line.notes}
                  onChange={(e) =>
                    updateLine(index, { notes: e.target.value })
                  }
                  placeholder="Optional"
                  className="h-10"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9 text-muted-foreground hover:text-destructive"
                  disabled={values.lines.length <= 1}
                  onClick={() =>
                    set(
                      "lines",
                      values.lines.length <= 1
                        ? values.lines
                        : values.lines.filter((_, i) => i !== index)
                    )
                  }
                  aria-label="Remove line"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="border-t bg-muted/20 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() =>
                set("lines", [...values.lines, { ...EMPTY_INQUIRY_LINE }])
              }
            >
              <PlusIcon className="size-4" />
              Add item
            </Button>
          </div>
        </div>
      </PageFormSection>

      <PageFormSection title="Assignment">
        <FormGrid className="gap-5">
          <FormField label="Priority">
            <Select
              value={values.priority}
              onValueChange={(v) => set("priority", v as InquiryPriority)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INQUIRY_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Follow-up" htmlFor={`${idPrefix}-follow-up`}>
            <Input
              id={`${idPrefix}-follow-up`}
              type="datetime-local"
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
          />
          <FormField
            label="Internal notes"
            htmlFor={`${idPrefix}-notes`}
            className="sm:col-span-2"
          >
            <Textarea
              id={`${idPrefix}-notes`}
              rows={3}
              value={values.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
            />
          </FormField>
        </FormGrid>
      </PageFormSection>

      {mode === "edit" ? (
        <PageFormSection title="Workflow">
          <FormGrid>
            <FormField label="Status">
              <Select
                value={values.status}
                onValueChange={(v) => set("status", v as InquiryStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
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
                value={values.convertedSaleId}
                onChange={(e) => set("convertedSaleId", e.target.value)}
                placeholder="Sale UUID"
              />
            </FormField>
            {values.convertedSaleId.trim() ? (
              <div className="sm:col-span-2">
                <Link
                  href={`/sales/${values.convertedSaleId.trim()}`}
                  className="text-xs text-primary hover:underline"
                >
                  Open sale
                </Link>
              </div>
            ) : null}
          </FormGrid>
        </PageFormSection>
      ) : null}
    </PageFormCard>
  );
}
