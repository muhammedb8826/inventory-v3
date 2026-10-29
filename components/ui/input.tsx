"use client";
import { useFormControl } from "@/components/shared/form-field-context";
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  ...inputProps
}: React.ComponentProps<"input">) {
  const props = useFormControl(inputProps);
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "app-control h-11 w-full min-w-0 px-3 py-2 text-base text-[var(--frappe-text)] transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--frappe-text-muted)] focus-visible:border-[var(--frappe-primary)] focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklab,var(--frappe-primary)_25%,transparent)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
