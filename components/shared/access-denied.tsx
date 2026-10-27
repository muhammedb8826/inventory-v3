"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AccessDenied({
  title = "You don’t have access to this page",
  description = "Your role doesn’t include permission for this area. Ask an admin if you need access.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h2 className="text-lg font-semibold text-[var(--frappe-text)]">
        {title}
      </h2>
      <p className="max-w-md text-sm text-[var(--frappe-text-muted)]">
        {description}
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
