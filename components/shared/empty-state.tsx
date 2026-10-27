export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--frappe-border)] bg-[var(--frappe-surface)] py-16 text-center">
      <p className="text-sm font-medium text-[var(--frappe-text)]">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-[var(--frappe-text-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
