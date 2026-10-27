"use client";

import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default function NewExpensePage() {
  return (
    <AppShell
      title="New expense"
      subtitle="Not Saved"
      variant="form"
      breadcrumbs={[
        { label: "Finance", href: "/dashboard" },
        { label: "Expenses", href: "/expenses" },
        { label: "New" },
      ]}
    >
      <PermissionGate
        permission="expense.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to record expenses.
          </p>
        }
      >
        <ExpenseForm />
      </PermissionGate>
    </AppShell>
  );
}
