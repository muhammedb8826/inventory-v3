import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ListPageTotals({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground",
        className
      )}
    >
      {items.map((item, i) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          {i > 0 ? (
            <span className="text-muted-foreground/40" aria-hidden>
              ·
            </span>
          ) : null}
          <span>
            {item.label}:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {item.value}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}
