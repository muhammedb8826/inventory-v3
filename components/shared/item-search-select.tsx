"use client";

import { SearchSelect } from "@/components/shared/search-select";
import type { Item, ItemType } from "@/lib/types";

export interface ItemSearchOption {
  item?: Item;
  itemId: string;
  label: string;
  itemType?: ItemType | null;
}

const TYPE_HINT: Record<ItemType, string> = {
  FINISHED: "FG",
  SEMI: "SEMI",
  RAW: "RAW",
  OTHER: "OTHER",
};

export function itemTypeHint(itemType?: ItemType | null): string | undefined {
  if (!itemType) return "FG";
  return TYPE_HINT[itemType];
}

export function ItemSearchSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select item…",
  searchPlaceholder = "Search by name or SKU…",
  emptyMessage = "No items found.",
  disabled,
  loading,
  filterLocally = true,
  onQueryChange,
  className,
  showTypeHint = true,
}: {
  value: string;
  onValueChange: (itemId: string) => void;
  options: ItemSearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  filterLocally?: boolean;
  onQueryChange?: (query: string) => void;
  className?: string;
  showTypeHint?: boolean;
}) {
  return (
    <SearchSelect
      value={value}
      onValueChange={onValueChange}
      options={options.map((option) => ({
        value: option.itemId,
        label: option.label,
        hint: showTypeHint ? itemTypeHint(option.itemType) : undefined,
      }))}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage="Loading items…"
      disabled={disabled}
      loading={loading}
      filterLocally={filterLocally}
      onQueryChange={onQueryChange}
      className={className}
    />
  );
}
