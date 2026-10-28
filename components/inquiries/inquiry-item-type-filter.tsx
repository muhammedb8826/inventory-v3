"use client";

import { cn } from "@/lib/utils";
import type { ItemType } from "@/lib/types";

/** Sellable FG first — industry default for CRM / quote line pickers. */
export const INQUIRY_ITEM_TYPE_OPTIONS: {
  value: ItemType;
  label: string;
  short: string;
}[] = [
  { value: "FINISHED", label: "Finished goods", short: "Finished" },
  { value: "SEMI", label: "Semi-finished", short: "Semi" },
  { value: "RAW", label: "Raw materials", short: "Raw" },
  { value: "OTHER", label: "Other", short: "Other" },
];

export const DEFAULT_INQUIRY_ITEM_TYPES: ItemType[] = ["FINISHED"];

/** Untyped catalog rows are treated as sellable FG for inquiry pickers. */
export function normalizeInquiryItemType(
  itemType?: ItemType | null,
): ItemType {
  return itemType ?? "FINISHED";
}

export function InquiryItemTypeFilter({
  selected,
  onChange,
  className,
}: {
  selected: ItemType[];
  onChange: (next: ItemType[]) => void;
  className?: string;
}) {
  function toggle(type: ItemType) {
    const has = selected.includes(type);
    if (has) {
      if (selected.length === 1) return; // keep at least one type
      onChange(selected.filter((t) => t !== type));
      return;
    }
    onChange([...selected, type]);
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        className,
      )}
      role="group"
      aria-label="Item types to show"
    >
      <span className="text-xs font-medium text-muted-foreground">Show:</span>
      {INQUIRY_ITEM_TYPE_OPTIONS.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            title={opt.label}
            onClick={() => toggle(opt.value)}
            className={cn(
              "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors",
              active
                ? "border-[var(--frappe-primary)]/35 bg-[color-mix(in_oklab,var(--frappe-primary)_12%,white)] text-[var(--frappe-primary)]"
                : "border-[var(--frappe-border)] bg-[var(--frappe-surface)] text-[var(--frappe-text-muted)] hover:bg-[var(--frappe-section-head)] hover:text-[var(--frappe-text)]",
            )}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}
