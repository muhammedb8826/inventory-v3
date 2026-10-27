"use client";

import { useState } from "react";
import { ListFilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Count non-empty / true filter values for the badge. */
export function countActiveFilters(
  values: Array<string | boolean | null | undefined>
) {
  return values.filter((v) => {
    if (typeof v === "boolean") return v;
    return Boolean(v && String(v).trim());
  }).length;
}

export function FilterField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-sm font-medium text-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Fleety-style right filter sheet — keeps the table toolbar uncluttered. */
export function TableFiltersSheet({
  children,
  activeCount = 0,
  onReset,
  title = "Filters",
  description = "Narrow the list. Changes apply as you edit; use Reset to clear.",
  triggerLabel = "Filters",
}: {
  children: React.ReactNode;
  activeCount?: number;
  onReset: () => void;
  title?: string;
  description?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative h-9 gap-2 rounded-xl border-border/80 bg-background px-3 text-sm font-medium shadow-none hover:bg-muted/60"
        >
          <ListFilterIcon className="size-4 opacity-70" />
          <span className="hidden sm:inline">{triggerLabel}</span>
          <span
            className={cn(
              "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
              activeCount > 0
                ? "bg-teal-600 text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            {activeCount}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg">{title}</SheetTitle>
              <SheetDescription className="mt-1 text-sm leading-relaxed">
                {description}
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 shrink-0 rounded-lg px-3"
              >
                Close
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {children}
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border/60 px-5 py-4 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 rounded-xl"
            onClick={() => {
              onReset();
            }}
          >
            Reset
          </Button>
          <Button
            type="button"
            className="h-10 flex-1 rounded-xl bg-teal-700 hover:bg-teal-600"
            onClick={() => setOpen(false)}
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
