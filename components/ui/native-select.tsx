"use client";
import type { ComponentProps } from "react";
import { useFormControl } from "@/components/shared/form-field-context";
import { cn } from "@/lib/utils";

/** Native select with the same field labels and help text as other controls. */
export function NativeSelect({
  className,
  ...inputProps
}: ComponentProps<"select">) {
  const props = useFormControl(inputProps);
  return (
    <select
      {...props}
      className={cn(
        "app-control h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}
