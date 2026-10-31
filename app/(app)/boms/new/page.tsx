"use client";

import { AppShell } from "@/components/app-shell";
import { BomForm } from "@/components/boms/bom-form";
import { PermissionGate } from "@/components/permission-gate";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/shared/page-loading";

function NewBomBody() {
  const params = useSearchParams();
  return (
    <BomForm
      initialFinishedItemId={params.get("finishedItemId") ?? undefined}
    />
  );
}

export default function NewBomPage() {
  return (
    <AppShell
      title="New BOM"
      variant="form"
      breadcrumbs={[
        { label: "Stock", href: "/dashboard" },
        { label: "BOMs", href: "/boms" },
        { label: "New" },
      ]}
    >
      <PermissionGate permission="bom.write">
        <Suspense fallback={<PageLoading />}>
          <NewBomBody />
        </Suspense>
      </PermissionGate>
    </AppShell>
  );
}
