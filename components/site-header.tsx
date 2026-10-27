"use client";

import { Separator } from "@/components/ui/separator";

/** Page title row for the non-frappe layout (global chrome lives in AppTopHeader). */
export function SiteHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--frappe-border)]/60 px-4 lg:px-6">
      <h1 className="font-heading text-base font-medium">{title}</h1>
      <Separator
        orientation="vertical"
        className="mx-1 data-[orientation=vertical]:h-4"
      />
      <div className="ml-auto flex items-center gap-2">{actions}</div>
    </div>
  );
}
