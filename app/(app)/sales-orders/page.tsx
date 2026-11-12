"use client";

import { Suspense } from "react";
import { SalesOrdersBoard } from "@/components/sales/sales-orders-board";
import { PageLoading } from "@/components/shared/page-loading";

export default function OrdersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SalesOrdersBoard />
    </Suspense>
  );
}
