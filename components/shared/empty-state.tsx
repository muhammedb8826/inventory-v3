import { InboxIcon } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--frappe-border)] bg-[var(--frappe-surface)] py-20 text-center shadow-[var(--frappe-shadow)]">
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[var(--frappe-section-head)] text-[var(--frappe-text-muted)]">
        <InboxIcon className="size-5" />
      </span>
      <p className="text-sm font-semibold text-[var(--frappe-text)]">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--frappe-text-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
