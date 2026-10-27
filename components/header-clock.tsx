"use client";

import { useEffect, useState } from "react";
import { CalendarClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeaderClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const full = now.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const compact = now.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "hidden items-center gap-1.5 rounded-xl border border-[var(--frappe-border)] bg-[var(--frappe-section-head)]/80 px-2 py-1.5 text-xs text-[var(--frappe-text-muted)] sm:flex",
        className
      )}
      suppressHydrationWarning
      title={full}
    >
      <CalendarClockIcon className="size-3.5 shrink-0" />
      <span className="whitespace-nowrap tabular-nums lg:hidden">{compact}</span>
      <span className="hidden whitespace-nowrap tabular-nums lg:inline">{full}</span>
    </div>
  );
}
