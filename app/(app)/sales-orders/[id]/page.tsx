"use client";

import { use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PermissionGate } from "@/components/permission-gate";
import { SalesOrderWorkspace } from "@/components/sales/sales-order-workspace";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/shared/page-loading";
import { api } from "@/lib/api";
import { useFetch } from "@/hooks/use-fetch";
import { orderStateLabel, type SalesOrder } from "@/lib/sales-orders";

function orderRef(id: string) {
  return `S${id.slice(0, 5).toUpperCase()}`;
}

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    data: order,
    error,
    loading,
    reload,
  } = useFetch<SalesOrder>(() => api(`/sales-orders/${id}`), [id]);

  return (
    <AppShell
      title={order ? orderRef(order.id) : "Sales order"}
      subtitle={
        order
          ? orderStateLabel[order.state]
          : "Quotation → send → confirm → deliver — all on one page."
      }
      variant="form"
      breadcrumbs={[
        { label: "Quotations", href: "/sales-orders" },
        { label: order ? orderRef(order.id) : "Order" },
      ]}
      actions={
        <Button asChild variant="outline">
          <Link href="/sales-orders">All quotations</Link>
        </Button>
      }
    >
      <PermissionGate permission="sales.read" showDenied>
        {error ? <p role="alert">{error}</p> : null}
        {loading && !order ? <PageLoading /> : null}
        {order ? (
          <SalesOrderWorkspace
            key={`${order.id}:${order.updatedAt ?? order.state}`}
            order={order}
            reload={reload}
          />
        ) : null}
      </PermissionGate>
    </AppShell>
  );
}
