"use client";

import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { StockTransferForm } from "@/components/stock-transfers/stock-transfer-form";

export default function NewStockTransferPage() {
  return (
    <AppShell
      title="New stock transfer"
      subtitle="Not Saved"
      variant="form"
      breadcrumbs={[
        { label: "Operations", href: "/dashboard" },
        { label: "Stock Transfers", href: "/stock-transfers" },
        { label: "New" },
      ]}
    >
      <PermissionGate
        permission="stock_transfer.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to create transfers.
          </p>
        }
      >
        <StockTransferForm />
      </PermissionGate>
    </AppShell>
  );
}
