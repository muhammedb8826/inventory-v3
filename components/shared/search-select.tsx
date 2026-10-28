"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export interface SearchOption {
  value: string;
  label: string;
  /** Secondary text shown in the menu (e.g. item type). */
  hint?: string;
}

export function SearchSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  loadingMessage = "Loading…",
  disabled,
  loading,
  filterLocally = true,
  onQueryChange,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  /** When false, options are already filtered server-side. */
  filterLocally?: boolean;
  onQueryChange?: (query: string) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = React.useMemo(() => {
    if (!filterLocally) return options;
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        (option.hint?.toLowerCase().includes(term) ?? false),
    );
  }, [options, query, filterLocally]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setQuery("");
      if (filterLocally) {
        onQueryChange?.("");
      }
    }
  }

  function keepWheelInList(event: React.WheelEvent<HTMLDivElement>) {
    event.stopPropagation();
    const el = event.currentTarget;
    if (el.scrollHeight <= el.clientHeight) return;
    el.scrollTop += event.deltaY;
    event.preventDefault();
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    onQueryChange?.(nextQuery);
  }

  return (
    <Popover modal={false} open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "app-control h-10 min-h-10 w-full justify-between gap-2 px-3 font-normal text-sm text-[var(--frappe-text)] shadow-none hover:bg-[var(--frappe-input)]",
            !selected && "text-[var(--frappe-text-muted)]",
            className,
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-left leading-5",
              !selected && "text-[var(--frappe-text-muted)]",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-[var(--frappe-text-muted)] opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1.5rem)] min-w-[min(100vw-1.5rem,280px)] overflow-hidden p-0"
        align="start"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="border-b border-border p-2">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9"
          />
        </div>
        <div
          className="max-h-64 overflow-y-auto overscroll-contain"
          onWheel={keepWheelInList}
        >
          {loading && filtered.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              {loadingMessage}
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            <div className="p-1">
              {loading ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  {loadingMessage}
                </p>
              ) : null}
              {filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    value === option.value && "bg-accent/60",
                  )}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "size-4 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {option.hint ? (
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {option.hint}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
