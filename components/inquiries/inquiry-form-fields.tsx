"use client";

import Link from "next/link";
import {
  FrappeDocument,
  FrappeField,
  FrappeFormGrid,
  FrappeGridCell,
  FrappeGridRow,
  FrappeGridTable,
  FrappeSection,
} from "@/components/frappe";
import { EntitySelectField } from "@/components/shared/entity-select-field";
import { ItemSearchSelect } from "@/components/shared/item-search-select";
import type { ItemSearchOption } from "@/components/shared/item-search-select";
import { QuickCustomerDialog } from "@/components/customers/quick-customer-dialog";
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
    <FrappeDocument>
      <FrappeSection title="Contact">
        <FrappeFormGrid columns={2}>
          <FrappeField label="Contact name" required fullWidth>
            <Input
              id={`${idPrefix}-name`}
              required
              value={values.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </FrappeField>
          <FrappeField label="Phone">
            <Input
              id={`${idPrefix}-phone`}
              type="tel"
              placeholder="0911…"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </FrappeField>
          <FrappeField label="Email">
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </FrappeField>
        </FrappeFormGrid>
        <p className="mt-3 text-[11px] text-[var(--frappe-text-muted)]">
          Include at least a phone number or email so the team can follow up.
        </p>
      </FrappeSection>

      <FrappeSection title="Request">
        <FrappeFormGrid columns={1}>
          <FrappeField label="Subject" required>
            <Input
              id={`${idPrefix}-subject`}
              required
              value={values.subject}
              onChange={(e) => set("subject", e.target.value)}
            />
          </FrappeField>
          <FrappeField label="Message" required>
            <Textarea
              id={`${idPrefix}-message`}
              required
              rows={4}
              value={values.message}
              onChange={(e) => set("message", e.target.value)}
            />
          </FrappeField>
        </FrappeFormGrid>
      </FrappeSection>

      <FrappeSection
        title="Interested items"
        description="Zero or more catalog products. Leave blank if this is a general question."
      >
        <FrappeGridTable
          columns={[
            { key: "item", label: "Item" },
            { key: "qty", label: "Qty", className: "w-24" },
            { key: "notes", label: "Notes", className: "w-40" },
          ]}
          onAddRow={() =>
            set("lines", [...values.lines, { ...EMPTY_INQUIRY_LINE }])
          }
          addLabel="Add item"
        >
          {values.lines.map((line, index) => (
            <FrappeGridRow
              key={index}
              canRemove={values.lines.length > 1}
              onRemove={() =>
                set(
                  "lines",
                  values.lines.length <= 1
                    ? values.lines
                    : values.lines.filter((_, i) => i !== index)
                )
              }
            >
              <FrappeGridCell>
                <ItemSearchSelect
                  value={line.itemId}
                  onValueChange={(itemId) => updateLine(index, { itemId })}
                  options={itemOptions}
                  placeholder="Select item…"
                  searchPlaceholder="Search catalog…"
                />
              </FrappeGridCell>
              <FrappeGridCell>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, { quantity: e.target.value })
                  }
                  className="h-8"
                />
              </FrappeGridCell>
              <FrappeGridCell>
                <Input
                  value={line.notes}
                  onChange={(e) =>
                    updateLine(index, { notes: e.target.value })
                  }
                  placeholder="Optional"
                  className="h-8"
                />
              </FrappeGridCell>
            </FrappeGridRow>
          ))}
        </FrappeGridTable>
      </FrappeSection>

      <FrappeSection title="Assignment">
        <FrappeFormGrid columns={2} className="gap-5">
          <FrappeField label="Priority">
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
          </FrappeField>
          <FrappeField label="Follow-up">
            <Input
              id={`${idPrefix}-follow-up`}
              type="datetime-local"
              value={values.followUpAt}
              onChange={(e) => set("followUpAt", e.target.value)}
            />
          </FrappeField>
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
          <FrappeField label="Internal notes" fullWidth>
            <Textarea
              id={`${idPrefix}-notes`}
              rows={3}
              value={values.internalNotes}
              onChange={(e) => set("internalNotes", e.target.value)}
            />
          </FrappeField>
        </FrappeFormGrid>
      </FrappeSection>

      {mode === "edit" ? (
        <FrappeSection title="Workflow">
          <FrappeFormGrid columns={2}>
            <FrappeField label="Status">
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
            </FrappeField>
            <FrappeField label="Converted sale ID">
              <Input
                id={`${idPrefix}-sale`}
                value={values.convertedSaleId}
                onChange={(e) => set("convertedSaleId", e.target.value)}
                placeholder="Sale UUID"
              />
            </FrappeField>
            {values.convertedSaleId.trim() ? (
              <div className="md:col-span-2">
                <Link
                  href={`/sales/${values.convertedSaleId.trim()}`}
                  className="text-xs text-[var(--frappe-primary)] hover:underline"
                >
                  Open sale
                </Link>
              </div>
            ) : null}
          </FrappeFormGrid>
        </FrappeSection>
      ) : null}
    </FrappeDocument>
  );
}
