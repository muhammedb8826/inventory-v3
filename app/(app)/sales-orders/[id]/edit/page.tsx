"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageLoading } from "@/components/shared/page-loading";

/** Edit is handled on the order workspace (same page). */
export default function EditQuotationRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/sales-orders/${id}`);
  }, [id, router]);

  return (
    <AppShell title="Opening order…" variant="form">
      <PageLoading />
    </AppShell>
  );
}
