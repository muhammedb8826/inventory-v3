"use client";

import { useMemo } from "react";
import { api } from "@/lib/api";
import { apiList } from "@/lib/list-response";
import { fetchAllInventory, uniqueItemsFromStock } from "@/lib/inventory-fetch";
import { useAuth } from "@/lib/auth";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { Customer, UserAdmin } from "@/lib/types";
import { useFetch } from "@/hooks/use-fetch";
import type { ItemSearchOption } from "@/components/shared/item-search-select";

export function useInquiryFormOptions() {
  const { user } = useAuth();
  const canCustomers = hasPermission(user, "customers.read");
  const canAssignees = hasAnyPermission(user, [
    "users.read",
    "inquiries.read",
    "inquiries.write",
    "sales.write",
  ]);
  const canInventory = hasPermission(user, "inventory.read");

  const {
    data: customers,
    reload: reloadCustomers,
    setData: setCustomers,
  } = useFetch(
    () => apiList<Customer>("/customers"),
    [],
    { enabled: canCustomers }
  );

  const { data: assignees } = useFetch(
    () => api<UserAdmin[]>("/users/assignees"),
    [],
    { enabled: canAssignees }
  );

  const { data: stock } = useFetch(
    () => fetchAllInventory(),
    [],
    { enabled: canInventory }
  );

  const customerOptions = useMemo(
    () =>
      (customers ?? [])
        .filter((c) => c.isActive !== false)
        .map((c) => ({ id: c.id, label: c.name })),
    [customers]
  );

  const userOptions = useMemo(
    () =>
      (assignees ?? [])
        .filter((u) => u.isActive !== false)
        .map((u) => ({
          id: u.id,
          label: u.fullName || u.email,
        })),
    [assignees]
  );

  const itemOptions: ItemSearchOption[] = useMemo(
    () =>
      uniqueItemsFromStock(stock ?? []).map((item) => ({
        itemId: item.id,
        label: item.sku
          ? `${item.description} (${item.sku})`
          : item.description,
      })),
    [stock]
  );

  return {
    customerOptions,
    userOptions,
    itemOptions,
    reloadCustomers,
    setCustomers,
  };
}
