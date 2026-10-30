"use client";

import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { InquiryForm } from "@/components/inquiries/inquiry-form";

export default function NewInquiryPage() {
  return (
    <AppShell
      title="New customer inquiry"
      subtitle="Capture products, measurements and delivery requirements in one place."
      variant="form"
      breadcrumbs={[
        { label: "CRM", href: "/dashboard" },
        { label: "Inquiries", href: "/inquiries" },
        { label: "New" },
      ]}
    >
      <PermissionGate
        permission="inquiries.write"
        fallback={
          <p className="text-sm text-[var(--frappe-text-muted)]">
            You do not have permission to create inquiries.
          </p>
        }
      >
        <InquiryForm />
      </PermissionGate>
    </AppShell>
  );
}
