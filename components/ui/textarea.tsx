import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "app-control flex field-sizing-content min-h-16 w-full px-3 py-2.5 text-base text-[var(--frappe-text)] transition-colors outline-none placeholder:text-[var(--frappe-text-muted)] focus-visible:border-[var(--frappe-primary)] focus-visible:ring-3 focus-visible:ring-[color-mix(in_oklab,var(--frappe-primary)_25%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
